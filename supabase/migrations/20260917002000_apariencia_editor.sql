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
