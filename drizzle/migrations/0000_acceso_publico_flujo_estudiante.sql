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