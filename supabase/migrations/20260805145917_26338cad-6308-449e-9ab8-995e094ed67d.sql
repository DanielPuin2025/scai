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