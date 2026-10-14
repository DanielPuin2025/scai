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
