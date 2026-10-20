import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, Eye, EyeOff, LogOut, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EstudiantesAdmin } from "@/components/scai/EstudiantesAdmin";
import { ConsultaEstudiante } from "@/components/scai/ConsultaEstudiante";
import { ReportPanel } from "@/components/scai/ReportPanel";
import { HorarioConfig } from "@/components/scai/HorarioConfig";
import { JornadasHistorial } from "@/components/scai/JornadasHistorial";
import { AsignacionesAdmin } from "@/components/scai/AsignacionesAdmin";
import logo from "@/assets/logo-scai.png";

export const Route = createFileRoute("/coordinador")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Panel del coordinador · SCAI" },
      {
        name: "description",
        content: "Acceso restringido para coordinadores: gestión de estudiantes, faltas y reportes institucionales.",
      },
      { property: "og:title", content: "Panel del coordinador · SCAI" },
      { property: "og:description", content: "Gestiona estudiantes y consulta reportes de faltas y asistencia." },
    ],
  }),
  component: CoordinadorPage,
});

function CoordinadorPage() {
  const { session, loading } = useAuth();

  return (
    <main data-modulo="coordinador" className="min-h-screen bg-suave pb-16">
      <header className="bg-institucional px-5 py-6">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/" aria-label="Volver al inicio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <img src={logo} alt="" width={1200} height={1137} className="h-10 w-auto shrink-0 rounded-lg bg-primary-foreground/90 p-1" />
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">SCAI</p>
            <h1 className="text-xl font-semibold text-primary-foreground">Panel del coordinador</h1>
          </div>
          {session && (
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto mt-6 w-full max-w-6xl px-5">
        {loading ? (
          <div className="rounded-3xl border border-border/60 bg-pastel-blue/50 p-10 text-center shadow-card">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : session ? (
          <Tabs defaultValue="reportes" className="space-y-5">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="reportes" className="flex-1 sm:flex-none">
                Reportes
              </TabsTrigger>
              <TabsTrigger value="consulta" className="flex-1 sm:flex-none">
                Consultar estudiante
              </TabsTrigger>
              <TabsTrigger value="estudiantes" className="flex-1 sm:flex-none">
                Estudiantes
              </TabsTrigger>
              <TabsTrigger value="jornada" className="flex-1 sm:flex-none">
                Jornada
              </TabsTrigger>
              <TabsTrigger value="horas-sociales" className="flex-1 sm:flex-none">
                Horas sociales
              </TabsTrigger>
              <TabsTrigger value="asignaciones" className="flex-1 sm:flex-none">
                Asignaciones
              </TabsTrigger>
            </TabsList>
            <TabsContent value="reportes">
              <ReportPanel />
            </TabsContent>
            <TabsContent value="consulta">
              <ConsultaEstudiante />
            </TabsContent>
            <TabsContent value="estudiantes">
              <EstudiantesAdmin />
            </TabsContent>
            <TabsContent value="jornada">
              <HorarioConfig />
            </TabsContent>
            <TabsContent value="horas-sociales">
              <JornadasHistorial />
            </TabsContent>
            <TabsContent value="asignaciones">
              <AsignacionesAdmin />
            </TabsContent>
          </Tabs>
        ) : (
          <LoginCard />
        )}
      </div>
    </main>
  );
}

// Correo institucional del coordinador registrado en Supabase Auth
const EMAIL_COORDINADOR = "ramiro.sarmiento@scai.local";

function LoginCard() {
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) {
      toast.error("Ingresa la contraseña del coordinador.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: EMAIL_COORDINADOR,
      password,
    });
    setEnviando(false);
    if (error) {
      toast.error("Contraseña incorrecta. Verifica e intenta de nuevo.");
      return;
    }
    toast.success("Bienvenido al panel del coordinador");
  }

  return (
    <section className="mx-auto max-w-md rounded-3xl border border-border/60 bg-pastel-blue/60 p-7 shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <ShieldCheck className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl font-semibold text-card-foreground">Acceso de Coordinación</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Ingresa la contraseña institucional de coordinación para acceder al panel.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative mt-1">
            <Input
              id="password"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Escribe tu contraseña"
              value={password}
              maxLength={72}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="h-11 pr-12"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {verPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <Button type="submit" size="lg" className="h-11 w-full" disabled={enviando}>
          {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ingresar
        </Button>
      </form>
    </section>
  );
}
