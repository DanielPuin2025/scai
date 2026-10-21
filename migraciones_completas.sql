-- Migration: 20260729213635_c93e9323-a9b7-41f7-bdf0-d317b6cdf393.sql

CREATE TYPE public.app_role AS ENUM ('coordinador');
CREATE TYPE public.falta_tipo AS ENUM ('llegada_tarde', 'mal_uniforme');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'coordinador')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_sis TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo_id TEXT NOT NULL DEFAULT 'TI',
  identificacion TEXT,
  fecha_nacimiento DATE,
  genero TEXT,
  grado TEXT NOT NULL,
  foto_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_estudiantes_grado ON public.estudiantes(grado);
CREATE INDEX idx_estudiantes_nombre ON public.estudiantes(nombre);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudiantes TO authenticated;
GRANT ALL ON public.estudiantes TO service_role;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coordinadores gestionan estudiantes" ON public.estudiantes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));

CREATE TABLE public.faltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  tipo public.falta_tipo NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion TEXT,
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_faltas_estudiante ON public.faltas(estudiante_id);
CREATE INDEX idx_faltas_fecha ON public.faltas(fecha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faltas TO authenticated;
GRANT ALL ON public.faltas TO service_role;
ALTER TABLE public.faltas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coordinadores gestionan faltas" ON public.faltas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));

CREATE TABLE public.asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (estudiante_id, fecha)
);
CREATE INDEX idx_asistencias_fecha ON public.asistencias(fecha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asistencias TO authenticated;
GRANT ALL ON public.asistencias TO service_role;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coordinadores gestionan asistencias" ON public.asistencias FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER estudiantes_updated_at BEFORE UPDATE ON public.estudiantes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- Migration: 20260729213655_5a76b52c-a5d6-4aee-8b09-34a87c39d934.sql

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;


-- Migration: 20260730185525_9a3a8674-bb8c-41dd-8552-dc006dc8e3ac.sql
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Migration: 20260804183141_464b1309-ec86-4a26-ac5c-1e5c789b8c64.sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- Migration: 20260805145917_26338cad-6308-449e-9ab8-995e094ed67d.sql
CREATE TABLE public.observaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id uuid NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  texto text NOT NULL,
  registrado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.observaciones TO authenticated;
GRANT ALL ON public.observaciones TO service_role;

ALTER TABLE public.observaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coordinadores gestionan observaciones" ON public.observaciones
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coordinador'::app_role));

CREATE INDEX observaciones_estudiante_idx ON public.observaciones(estudiante_id);

CREATE TRIGGER observaciones_updated_at BEFORE UPDATE ON public.observaciones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Migration: 20260813190133_22940a09-38ed-4b8a-8ee2-cab0c0ac7e47.sql
-- 1) Deduplicate existing faltas keeping the earliest record per (estudiante, tipo, fecha)
DELETE FROM public.faltas f
USING public.faltas keep
WHERE f.estudiante_id = keep.estudiante_id
  AND f.tipo = keep.tipo
  AND f.fecha = keep.fecha
  AND (keep.created_at, keep.id) < (f.created_at, f.id);

-- 2) Hard constraint against duplicates (also protects concurrent devices)
CREATE UNIQUE INDEX IF NOT EXISTS faltas_unicas_por_dia
  ON public.faltas (estudiante_id, tipo, fecha);

-- 3) Accent/case-insensitive search support
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE OR REPLACE FUNCTION public.scai_normalizar(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT lower(public.unaccent('public.unaccent', txt))
$$;

REVOKE ALL ON FUNCTION public.scai_normalizar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scai_normalizar(text) TO authenticated, service_role;

ALTER TABLE public.estudiantes
  ADD COLUMN IF NOT EXISTS nombre_norm text
  GENERATED ALWAYS AS (public.scai_normalizar(nombre)) STORED;

ALTER TABLE public.estudiantes
  ADD COLUMN IF NOT EXISTS codigo_norm text
  GENERATED ALWAYS AS (public.scai_normalizar(codigo_sis)) STORED;

ALTER TABLE public.estudiantes
  ADD COLUMN IF NOT EXISTS identificacion_norm text
  GENERATED ALWAYS AS (public.scai_normalizar(coalesce(identificacion, ''))) STORED;

CREATE INDEX IF NOT EXISTS estudiantes_nombre_norm_idx ON public.estudiantes (nombre_norm);
CREATE INDEX IF NOT EXISTS estudiantes_codigo_norm_idx ON public.estudiantes (codigo_norm);
CREATE INDEX IF NOT EXISTS estudiantes_identificacion_norm_idx ON public.estudiantes (identificacion_norm);

-- Migration: 20260813190201_16714d31-6282-4b10-b3ab-52abf194d568.sql
ALTER TABLE public.estudiantes DROP COLUMN IF EXISTS nombre_norm;
ALTER TABLE public.estudiantes DROP COLUMN IF EXISTS codigo_norm;
ALTER TABLE public.estudiantes DROP COLUMN IF EXISTS identificacion_norm;
DROP FUNCTION IF EXISTS public.scai_normalizar(text);

CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.scai_normalizar(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = extensions, public
AS $$
  SELECT lower(extensions.unaccent('extensions.unaccent', txt))
$$;

REVOKE ALL ON FUNCTION public.scai_normalizar(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.scai_normalizar(text) TO authenticated, service_role;

ALTER TABLE public.estudiantes
  ADD COLUMN nombre_norm text GENERATED ALWAYS AS (public.scai_normalizar(nombre)) STORED;
ALTER TABLE public.estudiantes
  ADD COLUMN codigo_norm text GENERATED ALWAYS AS (public.scai_normalizar(codigo_sis)) STORED;
ALTER TABLE public.estudiantes
  ADD COLUMN identificacion_norm text GENERATED ALWAYS AS (public.scai_normalizar(coalesce(identificacion, ''))) STORED;

CREATE INDEX IF NOT EXISTS estudiantes_nombre_norm_idx ON public.estudiantes (nombre_norm);
CREATE INDEX IF NOT EXISTS estudiantes_codigo_norm_idx ON public.estudiantes (codigo_norm);
CREATE INDEX IF NOT EXISTS estudiantes_identificacion_norm_idx ON public.estudiantes (identificacion_norm);

-- Migration: 20260910120000_acceso_publico_flujo_estudiante.sql
-- Permite que el flujo público de estudiante funcione también sin la clave de servicio
GRANT SELECT ON public.estudiantes TO anon;
GRANT SELECT, INSERT ON public.faltas TO anon;
GRANT SELECT, INSERT ON public.asistencias TO anon;

CREATE POLICY "consulta publica de estudiantes" ON public.estudiantes
FOR SELECT TO anon USING (activo = true);

CREATE POLICY "consulta publica de faltas" ON public.faltas
FOR SELECT TO anon USING (true);

CREATE POLICY "registro publico de faltas" ON public.faltas
FOR INSERT TO anon WITH CHECK (fecha = CURRENT_DATE);

CREATE POLICY "consulta publica de asistencias" ON public.asistencias
FOR SELECT TO anon USING (true);

CREATE POLICY "registro publico de asistencias" ON public.asistencias
FOR INSERT TO anon WITH CHECK (fecha = CURRENT_DATE);

-- Migration: 20260914120000_horario_control_y_jornadas.sql
-- Configuración del horario de control (una sola fila vigente)
CREATE TABLE public.horario_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hora_inicio time NOT NULL DEFAULT '06:00',
  hora_puntual_hasta time NOT NULL DEFAULT '06:00',
  hora_tarde_desde time NOT NULL DEFAULT '06:00',
  hora_fin time NOT NULL DEFAULT '19:00',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.horario_control TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.horario_control TO authenticated;
GRANT ALL ON public.horario_control TO service_role;

ALTER TABLE public.horario_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consulta publica del horario" ON public.horario_control
  FOR SELECT TO anon USING (true);
CREATE POLICY "consulta autenticada del horario" ON public.horario_control
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "coordinadores gestionan el horario" ON public.horario_control
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coordinador'::app_role));

CREATE TRIGGER horario_control_updated_at
  BEFORE UPDATE ON public.horario_control
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Jornadas de horas sociales (estudiante encargado del control)
CREATE TABLE public.jornadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encargado_nombre text NOT NULL,
  encargado_grado text NOT NULL,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  hora_inicio time NOT NULL,
  hora_fin time NOT NULL,
  estado text NOT NULL DEFAULT 'activa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jornadas_fecha_idx ON public.jornadas (fecha DESC);

GRANT SELECT, INSERT, UPDATE ON public.jornadas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jornadas TO authenticated;
GRANT ALL ON public.jornadas TO service_role;

ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consulta publica de jornadas" ON public.jornadas
  FOR SELECT TO anon USING (true);
CREATE POLICY "registro publico de jornadas" ON public.jornadas
  FOR INSERT TO anon WITH CHECK (fecha = CURRENT_DATE);
CREATE POLICY "cierre publico de la jornada del dia" ON public.jornadas
  FOR UPDATE TO anon USING (fecha = CURRENT_DATE) WITH CHECK (fecha = CURRENT_DATE);
CREATE POLICY "coordinadores gestionan jornadas" ON public.jornadas
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'coordinador'::app_role));
CREATE POLICY "consulta autenticada de jornadas" ON public.jornadas
  FOR SELECT TO authenticated USING (true);

CREATE TRIGGER jornadas_updated_at
  BEFORE UPDATE ON public.jornadas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Relación de cada falta con la jornada en la que fue registrada
ALTER TABLE public.faltas ADD COLUMN jornada_id uuid REFERENCES public.jornadas(id) ON DELETE SET NULL;
CREATE INDEX faltas_jornada_idx ON public.faltas (jornada_id);


-- Migration: 20260915120000_paneles_usuarios_y_rls.sql
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


-- Migration: 20260917002000_apariencia_editor.sql
-- Editor de apariencia: configuración visual global editable desde el panel del coordinador.
-- El rol 'programador' tiene acceso total; el 'coordinador' administra la personalización.

DO $$
BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'programador';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.apariencia (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  actualizado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.apariencia TO anon, authenticated;
GRANT UPDATE ON public.apariencia TO authenticated;
GRANT ALL ON public.apariencia TO service_role;

ALTER TABLE public.apariencia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lectura pública de la apariencia"
  ON public.apariencia FOR SELECT
  USING (true);

CREATE POLICY "Coordinador o programador actualizan la apariencia"
  ON public.apariencia FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'programador'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'programador'));

INSERT INTO public.apariencia (id, datos) VALUES (1, '{}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

-- Bucket para logos e imágenes institucionales (lectura pública, escritura restringida).
INSERT INTO storage.buckets (id, name, public) VALUES ('apariencia', 'apariencia', true)
  ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Lectura pública de imágenes de apariencia" ON storage.objects;
CREATE POLICY "Lectura pública de imágenes de apariencia"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'apariencia');

DROP POLICY IF EXISTS "Coordinador o programador suben imágenes" ON storage.objects;
CREATE POLICY "Coordinador o programador suben imágenes"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'apariencia'
    AND (public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'programador'))
  );

DROP POLICY IF EXISTS "Coordinador o programador borran imágenes" ON storage.objects;
CREATE POLICY "Coordinador o programador borran imágenes"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'apariencia'
    AND (public.has_role(auth.uid(), 'coordinador') OR public.has_role(auth.uid(), 'programador'))
  );


-- Migration: 20261001000000_sincronizar_horario_jornada.sql
-- Sincronización del horario de la jornada con el horario vigente del coordinador.
--
-- Antes: al reanudar una jornada existente se conservaban las horas guardadas
-- el día que se creó (por ejemplo 10:00 a. m.), aunque el coordinador hubiera
-- cambiado el horario. Ahora la jornada siempre toma el horario vigente.

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


