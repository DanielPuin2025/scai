-- SCAI uses the institutional access code at the application boundary.
-- These policies let the server functions work when only the publishable key
-- is configured. A service-role key, when present, still bypasses RLS.

GRANT SELECT, INSERT, UPDATE ON public.estudiantes TO anon;
GRANT SELECT, INSERT ON public.faltas TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.observaciones TO anon;
GRANT SELECT, INSERT, UPDATE ON public.asistencias TO anon;

DROP POLICY IF EXISTS "scai code access students read" ON public.estudiantes;
CREATE POLICY "scai code access students read"
  ON public.estudiantes FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "scai code access students create" ON public.estudiantes;
CREATE POLICY "scai code access students create"
  ON public.estudiantes FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "scai code access students update" ON public.estudiantes;
CREATE POLICY "scai code access students update"
  ON public.estudiantes FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "scai code access faults read" ON public.faltas;
CREATE POLICY "scai code access faults read"
  ON public.faltas FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "scai code access faults create" ON public.faltas;
CREATE POLICY "scai code access faults create"
  ON public.faltas FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "scai code access observations" ON public.observaciones;
CREATE POLICY "scai code access observations"
  ON public.observaciones FOR ALL TO anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "scai code access attendance" ON public.asistencias;
CREATE POLICY "scai code access attendance"
  ON public.asistencias FOR ALL TO anon
  USING (true)
  WITH CHECK (true);
