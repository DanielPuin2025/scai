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
