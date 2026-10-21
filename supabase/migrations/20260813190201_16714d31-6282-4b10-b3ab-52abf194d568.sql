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