
CREATE TYPE public.app_role AS ENUM ('coordinador');
CREATE TYPE public.falta_tipo AS ENUM ('llegada_tarde', 'mal_uniforme');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL DEFAULT '',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nombre, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'coordinador')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.estudiantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_sis TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  tipo_id TEXT NOT NULL DEFAULT 'TI',
  identificacion TEXT,
  fecha_nacimiento DATE,
  genero TEXT,
  grado TEXT NOT NULL,
  foto_url TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_estudiantes_grado ON public.estudiantes(grado);
CREATE INDEX idx_estudiantes_nombre ON public.estudiantes(nombre);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estudiantes TO authenticated;
GRANT ALL ON public.estudiantes TO service_role;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coordinadores gestionan estudiantes" ON public.estudiantes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));

CREATE TABLE public.faltas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  tipo public.falta_tipo NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observacion TEXT,
  registrado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_faltas_estudiante ON public.faltas(estudiante_id);
CREATE INDEX idx_faltas_fecha ON public.faltas(fecha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faltas TO authenticated;
GRANT ALL ON public.faltas TO service_role;
ALTER TABLE public.faltas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coordinadores gestionan faltas" ON public.faltas FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));

CREATE TABLE public.asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (estudiante_id, fecha)
);
CREATE INDEX idx_asistencias_fecha ON public.asistencias(fecha);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asistencias TO authenticated;
GRANT ALL ON public.asistencias TO service_role;
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coordinadores gestionan asistencias" ON public.asistencias FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'coordinador')) WITH CHECK (public.has_role(auth.uid(), 'coordinador'));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER estudiantes_updated_at BEFORE UPDATE ON public.estudiantes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
