-- ============================================================================
-- SCAI · Tres paneles (Coordinador / Control Escolar / Estudiante)
--
-- - Usuarios autorizados administrados por el coordinador (contraseña cifrada).
-- - Sesiones con token para Control Escolar, Horas Sociales y Estudiante.
-- - Se cierra el acceso anónimo directo a las tablas: TODO pasa por funciones
--   SECURITY DEFINER que validan el token. RLS niega a "anon" por completo.
--
-- No borra datos, tablas, roles, registros ni funciones existentes.
-- CÓMO APLICARLO: Supabase → SQL Editor → pegar este archivo → Run.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------------
-- 1) Utilidades
-- ---------------------------------------------------------------------------

-- ¿El grado corresponde a 11°? Acepta 11, 11A, 11-A, Once A, Undécimo, 1101...
CREATE OR REPLACE FUNCTION public.scai_es_grado_once(g text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = extensions, public
AS $$
DECLARE
  norm text;
  d text;
BEGIN
  IF g IS NULL THEN RETURN false; END IF;
  norm := lower(extensions.unaccent('extensions.unaccent', g));
  d := (regexp_match(norm, '(\d+)'))[1];
  IF d IS NULL THEN
    RETURN norm LIKE 'once%' OR norm LIKE 'undecimo%' OR norm LIKE 'decimo primero%';
  END IF;
  IF length(d) <= 2 THEN
    RETURN d::int = 11;
  END IF;
  RETURN left(d, 2)::int = 11;
END;
$$;

REVOKE ALL ON FUNCTION public.scai_es_grado_once(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scai_es_grado_once(text) TO anon, authenticated, service_role;

-- Nombre de usuario normalizado (sin acentos, minúsculas, sin espacios)
CREATE OR REPLACE FUNCTION public.scai_usuario_norm(u text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = extensions, public
AS $$
  SELECT regexp_replace(lower(extensions.unaccent('extensions.unaccent', u)), '\s+', '', 'g')
$$;

REVOKE ALL ON FUNCTION public.scai_usuario_norm(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.scai_usuario_norm(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Usuarios autorizados por el coordinador
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.usuarios_panel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  usuario text NOT NULL,
  usuario_norm text GENERATED ALWAYS AS (public.scai_usuario_norm(usuario)) STORED,
  -- Contraseña SIEMPRE cifrada (bcrypt). Nunca se guarda en texto plano.
  password_hash text NOT NULL,
  panel text NOT NULL CHECK (panel IN ('control_escolar', 'horas_sociales')),
  estudiante_id uuid REFERENCES public.estudiantes(id) ON DELETE SET NULL,
  activo boolean NOT NULL DEFAULT true,
  revocado_at timestamptz,
  creado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_panel_usuario_norm_idx
  ON public.usuarios_panel (usuario_norm);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.usuarios_panel TO authenticated;
GRANT ALL ON public.usuarios_panel TO service_role;

ALTER TABLE public.usuarios_panel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coordinadores gestionan usuarios_panel" ON public.usuarios_panel;
CREATE POLICY "coordinadores gestionan usuarios_panel" ON public.usuarios_panel
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coordinador'::app_role));

DROP TRIGGER IF EXISTS usuarios_panel_updated_at ON public.usuarios_panel;
CREATE TRIGGER usuarios_panel_updated_at
  BEFORE UPDATE ON public.usuarios_panel
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3) Sesiones con token (Control Escolar, Horas Sociales y Estudiante)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sesiones_panel (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  panel text NOT NULL CHECK (panel IN ('control_escolar', 'horas_sociales', 'estudiante')),
  usuario_id uuid REFERENCES public.usuarios_panel(id) ON DELETE CASCADE,
  estudiante_id uuid REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  creada_at timestamptz NOT NULL DEFAULT now(),
  expira_at timestamptz NOT NULL DEFAULT now() + interval '12 hours'
);

CREATE INDEX IF NOT EXISTS sesiones_panel_expira_idx ON public.sesiones_panel (expira_at);

-- Sin permisos para anon: solo las funciones SECURITY DEFINER la tocan.
GRANT ALL ON public.sesiones_panel TO service_role;
GRANT SELECT ON public.sesiones_panel TO authenticated;
ALTER TABLE public.sesiones_panel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coordinadores consultan sesiones" ON public.sesiones_panel;
CREATE POLICY "coordinadores consultan sesiones" ON public.sesiones_panel
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador'::app_role));

-- Valida un token y devuelve la sesión vigente (uso interno).
CREATE OR REPLACE FUNCTION public.scai_sesion(p_token uuid, p_paneles text[])
RETURNS public.sesiones_panel
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE s public.sesiones_panel;
BEGIN
  IF p_token IS NULL THEN
    RAISE EXCEPTION 'sesion_invalida';
  END IF;
  SELECT * INTO s FROM public.sesiones_panel WHERE token = p_token;
  IF NOT FOUND OR s.expira_at < now() THEN
    RAISE EXCEPTION 'sesion_invalida';
  END IF;
  IF p_paneles IS NOT NULL AND NOT (s.panel = ANY (p_paneles)) THEN
    RAISE EXCEPTION 'sesion_invalida';
  END IF;
  RETURN s;
END;
$$;

REVOKE ALL ON FUNCTION public.scai_sesion(uuid, text[]) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Administración de usuarios (solo coordinador autenticado)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_crear_usuario_panel(
  p_nombre text,
  p_usuario text,
  p_password text,
  p_panel text,
  p_estudiante_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE nuevo public.usuarios_panel;
BEGIN
  IF NOT public.has_role(auth.uid(), 'coordinador'::app_role) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;
  IF length(coalesce(p_password, '')) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La contraseña debe tener al menos 6 caracteres.');
  END IF;
  IF length(public.scai_usuario_norm(coalesce(p_usuario, ''))) < 3 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El usuario debe tener al menos 3 caracteres.');
  END IF;
  IF p_panel NOT IN ('control_escolar', 'horas_sociales') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Panel no válido.');
  END IF;
  IF p_panel = 'horas_sociales' THEN
    IF p_estudiante_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Selecciona al estudiante de 11° que va a realizar horas sociales.');
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.estudiantes e
      WHERE e.id = p_estudiante_id AND public.scai_es_grado_once(e.grado)
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Solo los estudiantes de grado 11° pueden hacer horas sociales.');
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.usuarios_panel u WHERE u.usuario_norm = public.scai_usuario_norm(p_usuario)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese nombre de usuario ya existe.');
  END IF;

  INSERT INTO public.usuarios_panel (nombre, usuario, password_hash, panel, estudiante_id, creado_por)
  VALUES (
    trim(p_nombre),
    trim(p_usuario),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_panel,
    CASE WHEN p_panel = 'horas_sociales' THEN p_estudiante_id ELSE NULL END,
    auth.uid()
  )
  RETURNING * INTO nuevo;

  RETURN jsonb_build_object('ok', true, 'id', nuevo.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_actualizar_usuario_panel(
  p_id uuid,
  p_nombre text,
  p_usuario text,
  p_panel text,
  p_estudiante_id uuid DEFAULT NULL,
  p_activo boolean DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE destino boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'coordinador'::app_role) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;
  IF p_panel NOT IN ('control_escolar', 'horas_sociales') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Panel no válido.');
  END IF;
  IF p_panel = 'horas_sociales' AND (
      p_estudiante_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.estudiantes e
        WHERE e.id = p_estudiante_id AND public.scai_es_grado_once(e.grado))
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Solo los estudiantes de grado 11° pueden hacer horas sociales.');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.usuarios_panel u
    WHERE u.usuario_norm = public.scai_usuario_norm(p_usuario) AND u.id <> p_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese nombre de usuario ya existe.');
  END IF;

  SELECT coalesce(p_activo, u.activo) INTO destino FROM public.usuarios_panel u WHERE u.id = p_id;
  IF destino IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El usuario ya no existe.');
  END IF;

  UPDATE public.usuarios_panel u SET
    nombre = trim(p_nombre),
    usuario = trim(p_usuario),
    panel = p_panel,
    estudiante_id = CASE WHEN p_panel = 'horas_sociales' THEN p_estudiante_id ELSE NULL END,
    activo = destino,
    revocado_at = CASE WHEN destino THEN NULL ELSE coalesce(u.revocado_at, now()) END
  WHERE u.id = p_id;

  -- Al desactivar se cierran sus sesiones abiertas.
  IF NOT destino THEN
    DELETE FROM public.sesiones_panel WHERE usuario_id = p_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_cambiar_password_panel(p_id uuid, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'coordinador'::app_role) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;
  IF length(coalesce(p_password, '')) < 6 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'La contraseña debe tener al menos 6 caracteres.');
  END IF;
  UPDATE public.usuarios_panel
    SET password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El usuario ya no existe.');
  END IF;
  DELETE FROM public.sesiones_panel WHERE usuario_id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- Revocar = desactivar permanentemente y cerrar sesiones. No borra el historial.
CREATE OR REPLACE FUNCTION public.admin_revocar_usuario_panel(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'coordinador'::app_role) THEN
    RAISE EXCEPTION 'no_autorizado';
  END IF;
  UPDATE public.usuarios_panel SET activo = false, revocado_at = now() WHERE id = p_id;
  DELETE FROM public.sesiones_panel WHERE usuario_id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_crear_usuario_panel(text, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_actualizar_usuario_panel(uuid, text, text, text, uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_cambiar_password_panel(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revocar_usuario_panel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_crear_usuario_panel(text, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_usuario_panel(uuid, text, text, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_cambiar_password_panel(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revocar_usuario_panel(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Inicio de sesión de los paneles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.panel_login(p_usuario text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  u public.usuarios_panel;
  est public.estudiantes;
  t uuid;
BEGIN
  SELECT * INTO u FROM public.usuarios_panel
   WHERE usuario_norm = public.scai_usuario_norm(coalesce(p_usuario, ''));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese usuario no existe. Pide al coordinador que te autorice.');
  END IF;

  IF u.password_hash <> extensions.crypt(coalesce(p_password, ''), u.password_hash) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Contraseña incorrecta. Verifica e intenta de nuevo.');
  END IF;

  IF NOT u.activo THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tu acceso está inactivo o fue revocado por el coordinador.');
  END IF;

  IF u.panel = 'horas_sociales' THEN
    SELECT * INTO est FROM public.estudiantes WHERE id = u.estudiante_id;
    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'Tu usuario no está vinculado a un estudiante. Avisa al coordinador.');
    END IF;
    IF NOT est.activo THEN
      RETURN jsonb_build_object('ok', false, 'error', 'El estudiante vinculado está inactivo. Avisa al coordinador.');
    END IF;
    IF NOT public.scai_es_grado_once(est.grado) THEN
      RETURN jsonb_build_object('ok', false, 'error',
        'Las horas sociales son solo para estudiantes de grado 11°. Tu grado registrado es ' || est.grado || '.');
    END IF;
  END IF;

  INSERT INTO public.sesiones_panel (panel, usuario_id, estudiante_id)
  VALUES (u.panel, u.id, u.estudiante_id)
  RETURNING token INTO t;

  RETURN jsonb_build_object(
    'ok', true,
    'token', t,
    'panel', u.panel,
    'nombre', u.nombre,
    'usuario', u.usuario,
    'encargado', CASE WHEN est.id IS NULL THEN NULL ELSE jsonb_build_object(
      'codigo_sis', est.codigo_sis, 'nombre', est.nombre,
      'grado', est.grado, 'genero', est.genero) END
  );
END;
$$;

-- Estudiante: código institucional + documento de identidad.
CREATE OR REPLACE FUNCTION public.estudiante_login(p_codigo text, p_documento text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = extensions, public
AS $$
DECLARE
  est public.estudiantes;
  t uuid;
BEGIN
  SELECT * INTO est FROM public.estudiantes
   WHERE codigo_norm = public.scai_normalizar(trim(coalesce(p_codigo, '')))
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Ese código institucional no existe.');
  END IF;
  IF NOT est.activo THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tu registro está inactivo. Comunícate con el coordinador.');
  END IF;
  IF coalesce(est.identificacion, '') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Tu documento no está registrado en el sistema. Pide al coordinador que lo registre.');
  END IF;
  IF public.scai_normalizar(est.identificacion) <> public.scai_normalizar(trim(coalesce(p_documento, ''))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'El documento no coincide con ese código institucional.');
  END IF;

  INSERT INTO public.sesiones_panel (panel, estudiante_id)
  VALUES ('estudiante', est.id)
  RETURNING token INTO t;

  RETURN jsonb_build_object('ok', true, 'token', t, 'estudiante', jsonb_build_object(
    'id', est.id, 'codigo_sis', est.codigo_sis, 'nombre', est.nombre,
    'grado', est.grado, 'genero', est.genero, 'tipo_id', est.tipo_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_logout(p_token uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.sesiones_panel WHERE token = p_token;
$$;

REVOKE ALL ON FUNCTION public.panel_login(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.estudiante_login(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.panel_logout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.panel_login(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.estudiante_login(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.panel_logout(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6) Panel ESTUDIANTE: únicamente sus propios datos
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.estudiante_mis_datos(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.sesiones_panel;
  est public.estudiantes;
BEGIN
  s := public.scai_sesion(p_token, ARRAY['estudiante']);
  SELECT * INTO est FROM public.estudiantes WHERE id = s.estudiante_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'sesion_invalida'; END IF;

  RETURN jsonb_build_object(
    'estudiante', jsonb_build_object(
      'id', est.id, 'codigo_sis', est.codigo_sis, 'nombre', est.nombre,
      'grado', est.grado, 'genero', est.genero, 'tipo_id', est.tipo_id,
      'identificacion', est.identificacion),
    'asistencias', coalesce((
      SELECT jsonb_agg(jsonb_build_object('fecha', a.fecha, 'hora', a.hora) ORDER BY a.fecha DESC)
      FROM public.asistencias a WHERE a.estudiante_id = est.id), '[]'::jsonb),
    'faltas', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', f.id, 'tipo', f.tipo, 'fecha', f.fecha,
                                          'observacion', f.observacion, 'hora', f.created_at)
                       ORDER BY f.fecha DESC, f.created_at DESC)
      FROM public.faltas f WHERE f.estudiante_id = est.id), '[]'::jsonb),
    'observaciones', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', o.id, 'texto', o.texto, 'fecha', o.created_at)
                       ORDER BY o.created_at DESC)
      FROM public.observaciones o WHERE o.estudiante_id = est.id), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.estudiante_mis_datos(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.estudiante_mis_datos(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7) Panel CONTROL ESCOLAR (y Horas Sociales): acceso con token válido
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.panel_grados(p_token uuid)
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.scai_sesion(p_token, ARRAY['control_escolar', 'horas_sociales']);
  RETURN QUERY SELECT DISTINCT e.grado FROM public.estudiantes e WHERE e.grado IS NOT NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_buscar_estudiantes(p_token uuid, p_q text, p_grado text)
RETURNS TABLE (id uuid, codigo_sis text, nombre text, grado text, identificacion text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE q text;
BEGIN
  PERFORM public.scai_sesion(p_token, ARRAY['control_escolar', 'horas_sociales']);
  q := public.scai_normalizar(coalesce(p_q, ''));
  RETURN QUERY
    SELECT e.id, e.codigo_sis, e.nombre, e.grado, e.identificacion
    FROM public.estudiantes e
    WHERE e.activo
      AND (p_grado IS NULL OR e.grado = p_grado)
      AND (q = '' OR e.nombre_norm LIKE '%' || q || '%'
                  OR e.codigo_norm LIKE '%' || q || '%'
                  OR e.identificacion_norm LIKE '%' || q || '%')
    ORDER BY e.nombre
    LIMIT 40;
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_estudiante(p_token uuid, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  est public.estudiantes;
  hoy date := (now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
  PERFORM public.scai_sesion(p_token, ARRAY['control_escolar', 'horas_sociales']);
  SELECT * INTO est FROM public.estudiantes WHERE id = p_id AND activo;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id', est.id, 'codigo_sis', est.codigo_sis, 'nombre', est.nombre, 'grado', est.grado,
    'genero', est.genero, 'identificacion', est.identificacion, 'tipo_id', est.tipo_id,
    'llegada_tarde', (SELECT count(*) FROM public.faltas f WHERE f.estudiante_id = est.id AND f.tipo = 'llegada_tarde'),
    'mal_uniforme', (SELECT count(*) FROM public.faltas f WHERE f.estudiante_id = est.id AND f.tipo = 'mal_uniforme'),
    'faltasHoy', coalesce((SELECT jsonb_agg(DISTINCT f.tipo) FROM public.faltas f
                            WHERE f.estudiante_id = est.id AND f.fecha = hoy), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_registrar_faltas(
  p_token uuid, p_codigo text, p_tipos text[], p_fecha date, p_hora timestamptz, p_jornada_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  est public.estudiantes;
  f date := coalesce(p_fecha, (now() AT TIME ZONE 'America/Bogota')::date);
  h timestamptz := coalesce(p_hora, now());
  ya text[];
  nuevas text[];
  dup text[];
  t text;
BEGIN
  PERFORM public.scai_sesion(p_token, ARRAY['control_escolar', 'horas_sociales']);
  SELECT * INTO est FROM public.estudiantes
   WHERE codigo_norm = public.scai_normalizar(trim(p_codigo)) AND activo LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Estudiante no encontrado');
  END IF;

  SELECT coalesce(array_agg(DISTINCT fa.tipo::text), ARRAY[]::text[]) INTO ya
    FROM public.faltas fa WHERE fa.estudiante_id = est.id AND fa.fecha = f;

  SELECT coalesce(array_agg(x), ARRAY[]::text[]) INTO nuevas
    FROM unnest(p_tipos) AS x WHERE NOT (x = ANY (ya));
  SELECT coalesce(array_agg(x), ARRAY[]::text[]) INTO dup
    FROM unnest(p_tipos) AS x WHERE x = ANY (ya);

  IF array_length(nuevas, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error',
      'Este estudiante ya tiene registradas esas anotaciones el día de hoy. El historial anterior se conserva.',
      'duplicadas', to_jsonb(dup));
  END IF;

  FOREACH t IN ARRAY nuevas LOOP
    INSERT INTO public.faltas (estudiante_id, tipo, fecha, created_at, jornada_id)
    VALUES (est.id, t::public.falta_tipo, f, h, p_jornada_id)
    ON CONFLICT (estudiante_id, tipo, fecha) DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'fecha', f, 'hora', h,
    'registradas', to_jsonb(nuevas), 'duplicadas', to_jsonb(dup),
    'estudiante', jsonb_build_object('nombre', est.nombre, 'grado', est.grado, 'codigo_sis', est.codigo_sis));
END;
$$;

-- Jornada de horas sociales (solo el panel de horas sociales la abre)
CREATE OR REPLACE FUNCTION public.panel_abrir_jornada(p_token uuid, p_fecha date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.sesiones_panel;
  est public.estudiantes;
  hor RECORD;
  j public.jornadas;
  f date := coalesce(p_fecha, (now() AT TIME ZONE 'America/Bogota')::date);
BEGIN
  s := public.scai_sesion(p_token, ARRAY['horas_sociales']);
  SELECT * INTO est FROM public.estudiantes WHERE id = s.estudiante_id;
  IF NOT FOUND OR NOT public.scai_es_grado_once(est.grado) THEN
    RAISE EXCEPTION 'sesion_invalida';
  END IF;

  SELECT * INTO hor FROM public.horario_control ORDER BY updated_at DESC LIMIT 1;

  SELECT * INTO j FROM public.jornadas
   WHERE fecha = f AND encargado_nombre = est.nombre AND encargado_grado = est.grado LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.jornadas (encargado_nombre, encargado_grado, fecha, hora_inicio, hora_fin, estado)
    VALUES (est.nombre, est.grado, f,
            coalesce(hor.hora_inicio, '06:00'::time), coalesce(hor.hora_fin, '19:00'::time), 'activa')
    RETURNING * INTO j;
  ELSE
    -- La jornada ya existe: se sincroniza con el horario vigente del
    -- coordinador para que nunca conserve horas antiguas.
    UPDATE public.jornadas
       SET hora_inicio = coalesce(hor.hora_inicio, '06:00'::time),
           hora_fin = coalesce(hor.hora_fin, '19:00'::time)
     WHERE id = j.id
    RETURNING * INTO j;
  END IF;

  RETURN jsonb_build_object('ok', true, 'jornada', to_jsonb(j),
    'encargado', jsonb_build_object('codigo_sis', est.codigo_sis, 'nombre', est.nombre,
                                    'grado', est.grado, 'genero', est.genero));
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_jornada(p_token uuid, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE j public.jornadas;
BEGIN
  PERFORM public.scai_sesion(p_token, ARRAY['control_escolar', 'horas_sociales']);
  SELECT * INTO j FROM public.jornadas WHERE id = p_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN to_jsonb(j);
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_finalizar_jornada(p_token uuid, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.scai_sesion(p_token, ARRAY['control_escolar', 'horas_sociales']);
  UPDATE public.jornadas SET estado = 'finalizada' WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.panel_registros_jornada(p_token uuid, p_id uuid)
RETURNS TABLE (id uuid, hora timestamptz, fecha date, tipo text, nombre text, grado text, codigo_sis text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.scai_sesion(p_token, ARRAY['control_escolar', 'horas_sociales']);
  RETURN QUERY
    SELECT f.id, f.created_at, f.fecha, f.tipo::text, e.nombre, e.grado, e.codigo_sis
    FROM public.faltas f JOIN public.estudiantes e ON e.id = f.estudiante_id
    WHERE f.jornada_id = p_id
    ORDER BY f.created_at
    LIMIT 500;
END;
$$;

-- Directorio para el modo sin conexión (requiere sesión válida del panel)
CREATE OR REPLACE FUNCTION public.panel_directorio(p_token uuid)
RETURNS TABLE (
  id uuid, codigo_sis text, nombre text, grado text, genero text,
  identificacion text, tipo_id text, llegada_tarde bigint, mal_uniforme bigint, faltas_hoy text[]
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE hoy date := (now() AT TIME ZONE 'America/Bogota')::date;
BEGIN
  PERFORM public.scai_sesion(p_token, ARRAY['control_escolar', 'horas_sociales']);
  RETURN QUERY
    SELECT e.id, e.codigo_sis, e.nombre, e.grado, e.genero, e.identificacion, e.tipo_id,
      (SELECT count(*) FROM public.faltas f WHERE f.estudiante_id = e.id AND f.tipo = 'llegada_tarde'),
      (SELECT count(*) FROM public.faltas f WHERE f.estudiante_id = e.id AND f.tipo = 'mal_uniforme'),
      coalesce((SELECT array_agg(DISTINCT f.tipo::text) FROM public.faltas f
                 WHERE f.estudiante_id = e.id AND f.fecha = hoy), ARRAY[]::text[])
    FROM public.estudiantes e
    WHERE e.activo
    ORDER BY e.nombre;
END;
$$;

DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.panel_grados(uuid)',
    'public.panel_buscar_estudiantes(uuid, text, text)',
    'public.panel_estudiante(uuid, uuid)',
    'public.panel_registrar_faltas(uuid, text, text[], date, timestamptz, uuid)',
    'public.panel_abrir_jornada(uuid, date)',
    'public.panel_jornada(uuid, uuid)',
    'public.panel_finalizar_jornada(uuid, uuid)',
    'public.panel_registros_jornada(uuid, uuid)',
    'public.panel_directorio(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', fn);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Se cierra el acceso anónimo directo a las tablas de datos personales.
--    Antes, cualquiera con la clave pública podía leer TODOS los estudiantes
--    y TODAS las faltas. Ahora solo se puede a través de las funciones de
--    arriba, que exigen una sesión válida.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "consulta publica de estudiantes" ON public.estudiantes;
DROP POLICY IF EXISTS "consulta publica de faltas" ON public.faltas;
DROP POLICY IF EXISTS "registro publico de faltas" ON public.faltas;
DROP POLICY IF EXISTS "consulta publica de asistencias" ON public.asistencias;
DROP POLICY IF EXISTS "registro publico de asistencias" ON public.asistencias;
DROP POLICY IF EXISTS "consulta publica de jornadas" ON public.jornadas;
DROP POLICY IF EXISTS "registro publico de jornadas" ON public.jornadas;
DROP POLICY IF EXISTS "cierre publico de la jornada del dia" ON public.jornadas;

REVOKE ALL ON public.estudiantes FROM anon;
REVOKE ALL ON public.faltas FROM anon;
REVOKE ALL ON public.asistencias FROM anon;
REVOKE ALL ON public.jornadas FROM anon;
REVOKE ALL ON public.observaciones FROM anon;
