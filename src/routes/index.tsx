import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo-scai.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SCAI · Control de acceso — Megacolegio El Progreso" },
      {
        name: "description",
        content:
          "Sistema de Control de Acceso Institucional: registro de asistencia y faltas de los estudiantes, disponible con y sin internet.",
      },
      { property: "og:title", content: "SCAI · Control de acceso institucional" },
      {
        property: "og:description",
        content: "Registra asistencia y faltas de los estudiantes de forma segura, rápida y sin internet.",
      },
    ],
  }),
  component: Index,
});

// Códigos de acceso desde variables de entorno
const CODIGOS_ACCESO = {
  coordinador: import.meta.env.VITE_CODIGO_COORDINADOR || "COORD2024",
  encargado: import.meta.env.VITE_CODIGO_ENCARGADO || "ENCARG2024",
  // Para estudiantes se valida con su código SIS real
};

function Index() {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState("");
  const [validando, setValidando] = useState(false);
  const [error, setError] = useState("");

  async function handleAcceso(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const codigoLimpio = codigo.trim().toUpperCase();

    if (!codigoLimpio) {
      setError("Ingresa tu código de acceso");
      return;
    }

    setValidando(true);

    // Simular validación breve
    await new Promise(resolve => setTimeout(resolve, 500));

    // Validar tipo de usuario según código
    if (codigoLimpio === CODIGOS_ACCESO.coordinador) {
      navigate({ to: "/coordinador" });
    } else if (codigoLimpio === CODIGOS_ACCESO.encargado) {
      navigate({ to: "/encargado" });
    } else {
      // Para estudiantes, redirigir con su código
      navigate({ to: "/estudiante", search: { codigo: codigoLimpio } });
    }

    setValidando(false);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-suave">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-pastel-mint/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-pastel-lavender/60 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center gap-10 px-5 py-12">
        <header className="flex w-full flex-col items-center text-center">
          <img
            src={logo}
            alt="Logo SCAI · Sistema de Control de Acceso Institucional"
            width={1200}
            height={1137}
            className="h-40 w-auto max-w-[85vw] object-contain drop-shadow-xl sm:h-56"
          />
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Sistema de Control de Acceso Institucional
          </h1>
          <p className="mt-3 max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
            Ingresa tu código para acceder al sistema
          </p>
        </header>

        <section className="w-full max-w-md rounded-3xl border border-border/60 bg-card/80 p-8 shadow-card backdrop-blur-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="h-7 w-7" />
          </div>

          <h2 className="mt-4 text-xl font-semibold text-card-foreground">Acceso al sistema</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresa tu código de acceso institucional
          </p>

          <form onSubmit={handleAcceso} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="codigo">Código de acceso</Label>
              <Input
                id="codigo"
                type="text"
                autoComplete="off"
                placeholder="Ingresa tu código"
                value={codigo}
                maxLength={30}
                onChange={(e) => {
                  setCodigo(e.target.value);
                  setError("");
                }}
                className="mt-1.5 h-12 text-base"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" size="lg" className="h-12 w-full" disabled={validando}>
              {validando && <Loader2 className="h-4 w-4 animate-spin" />}
              Ingresar
            </Button>
          </form>

          <div className="mt-6 space-y-2 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
            <p className="font-medium">Tipos de acceso:</p>
            <ul className="space-y-1 pl-4">
              <li>• <strong>Coordinador:</strong> Gestión completa del sistema</li>
              <li>• <strong>Encargado:</strong> Registro rápido de faltas</li>
              <li>• <strong>Estudiante:</strong> Consulta de historial personal</li>
            </ul>
          </div>
        </section>

        <p className="text-xs text-muted-foreground">Megacolegio El Progreso · SCAI v2.0</p>
      </div>
    </main>
  );
}
