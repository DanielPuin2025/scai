-- SCAI: ejecutar TODO este archivo en Supabase > SQL Editor > Run.
-- Es seguro ejecutarlo varias veces.

-- 1) Horario visible para el panel de Horas Sociales
DROP POLICY IF EXISTS "consulta publica del horario" ON public.horario_control;
CREATE POLICY "consulta publica del horario" ON public.horario_control
  FOR SELECT TO anon USING (true);
GRANT SELECT ON public.horario_control TO anon;

CREATE OR REPLACE FUNCTION public.horario_vigente()
RETURNS TABLE (id uuid, hora_inicio time, hora_puntual_hasta time,
               hora_tarde_desde time, hora_fin time, updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT h.id, h.hora_inicio, h.hora_puntual_hasta, h.hora_tarde_desde, h.hora_fin, h.updated_at
  FROM public.horario_control h ORDER BY h.updated_at DESC LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.horario_vigente() TO anon, authenticated, service_role;

-- 2) Jornadas activas de hoy siguen el horario del coordinador
CREATE OR REPLACE FUNCTION public.scai_sync_jornadas_horario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.jornadas SET hora_inicio = NEW.hora_inicio, hora_fin = NEW.hora_fin
   WHERE fecha = (now() AT TIME ZONE 'America/Bogota')::date AND estado = 'activa';
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_sync_jornadas_horario ON public.horario_control;
CREATE TRIGGER trg_sync_jornadas_horario AFTER INSERT OR UPDATE ON public.horario_control
FOR EACH ROW EXECUTE FUNCTION public.scai_sync_jornadas_horario();

-- 3) Registro de Llegada tarde / Mal porte de uniforme
DELETE FROM public.faltas f USING public.faltas keep
WHERE f.estudiante_id = keep.estudiante_id AND f.tipo = keep.tipo
  AND f.fecha = keep.fecha AND f.ctid > keep.ctid;
CREATE UNIQUE INDEX IF NOT EXISTS faltas_unicas_por_dia ON public.faltas (estudiante_id, tipo, fecha);

NOTIFY pgrst, 'reload schema';
