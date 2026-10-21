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