-- Cierra el acceso público a datos de estudiantes. Las RPC panel_*/estudiante_*/admin_*
-- son SECURITY DEFINER (owner postgres) y siguen funcionando; los coordinadores acceden por has_role.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('estudiantes','faltas','asistencias','jornadas','horario_control')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horario_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY coordinador_all_estudiantes ON public.estudiantes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));
CREATE POLICY coordinador_all_faltas ON public.faltas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));
CREATE POLICY coordinador_all_asistencias ON public.asistencias FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));
CREATE POLICY coordinador_all_jornadas ON public.jornadas FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));
CREATE POLICY coordinador_all_horario ON public.horario_control FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));
CREATE POLICY lectura_publica_horario ON public.horario_control FOR SELECT TO anon USING (true);

REVOKE ALL ON public.estudiantes, public.faltas, public.asistencias, public.jornadas FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.horario_control FROM anon;
