import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mars, Search, ShirtIcon, Timer, Venus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buscarEstudiante } from "@/lib/scai.functions";
import { FALTA_LABELS, type EstudiantePublico } from "@/lib/scai-schemas";
import logo from "@/assets/logo-scai.png";

export const Route = createFileRoute("/estudiante")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      codigo: typeof search.codigo === "string" ? search.codigo : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Consulta de estudiante · SCAI" },
      {
        name: "description",
        content: "Consulta tu historial de llegadas tarde y uniforme.",
      },
      { property: "og:title", content: "Consulta de estudiante · SCAI" },
      { property: "og:description", content: "Consulta tu información personal y historial de faltas en SCAI." },
    ],
  }),
  component: EstudiantePage,
});

function EstudiantePage() {
  const buscarFn = useServerFn(buscarEstudiante);
  const searchParams = useSearch({ from: "/estudiante" });

  const [codigo, setCodigo] = useState("");
  const [cargando, setCargando] = useState(false);
  const [estudiante, setEstudiante] = useState<EstudiantePublico | null>(null);

  // Buscar automáticamente si viene el código en la URL
  const buscarEstudiantePorCodigo = useCallback(async (codigoBuscar: string) => {
    setCargando(true);
    setEstudiante(null);

    try {
      const resultado = await buscarFn({ data: { codigo: codigoBuscar } });

      if (!resultado) {
        toast.error("Estudiante no encontrado. Verifica tu código.");
        return;
      }

      setEstudiante(resultado);
    } catch {
      toast.error("Error al consultar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, [buscarFn]);

  useEffect(() => {
    if (searchParams.codigo) {
      setCodigo(searchParams.codigo);
      void buscarEstudiantePorCodigo(searchParams.codigo);
    }
  }, [buscarEstudiantePorCodigo, searchParams.codigo]);

  async function onBuscar(e: React.FormEvent) {
    e.preventDefault();
    const cod = codigo.trim();

    if (!cod) {
      toast.error("Ingresa tu código");
      return;
    }

    if (!navigator.onLine) {
      toast.error("Sin conexión: necesitas internet para consultar tu información.");
      return;
    }

    await buscarEstudiantePorCodigo(cod);
  }

  return (
    <main className="min-h-screen bg-suave pb-16">
      <header className="bg-institucional px-5 py-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
            <Link to="/" aria-label="Volver al inicio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <img src={logo} alt="" width={1200} height={1137} className="h-10 w-auto shrink-0 rounded-lg bg-primary-foreground/90 p-1" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">SCAI</p>
            <h1 className="text-xl font-semibold text-primary-foreground">Consulta de estudiante</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 w-full max-w-3xl space-y-5 px-5">
        {!estudiante && (
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <h2 className="text-lg font-semibold text-card-foreground">Ingresa tu código</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta tu historial de llegadas tarde y uniforme
            </p>

            <form onSubmit={onBuscar} className="mt-4 space-y-3">
              <div>
                <Label htmlFor="codigo-input">Código del estudiante</Label>
                <Input
                  id="codigo-input"
                  autoComplete="off"
                  placeholder="Ej: 26210245"
                  value={codigo}
                  maxLength={30}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="mt-1.5 h-12 text-base"
                  autoFocus
                />
              </div>

              <Button type="submit" size="lg" disabled={cargando} className="h-12 w-full sm:w-44">
                {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Consultar
              </Button>
            </form>
          </section>
        )}

        {estudiante && (
          <>
            <section className="rounded-3xl border border-border/60 bg-pastel-blue/30 p-6 shadow-card">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <span
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary"
                  role="img"
                  aria-label={
                    (estudiante.genero ?? "").toUpperCase().startsWith("F")
                      ? "Estudiante femenina"
                      : "Estudiante masculino"
                  }
                >
                  {(estudiante.genero ?? "").toUpperCase().startsWith("F") ? (
                    <Venus className="h-10 w-10" />
                  ) : (
                    <Mars className="h-10 w-10" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-card-foreground">{estudiante.nombre}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">Código: {estudiante.codigo_sis}</Badge>
                    <Badge variant="outline">Grado: {estudiante.grado}</Badge>
                    {estudiante.identificacion && (
                      <Badge variant="outline">
                        {estudiante.tipo_id ?? "TI"}: {estudiante.identificacion}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-5 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Timer className="h-5 w-5 text-amber-600" />
                    Llegadas tarde
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-amber-600">{estudiante.faltas.llegada_tarde}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Total registrado</p>
                  {estudiante.faltasHoy.includes("llegada_tarde") && (
                    <Badge variant="secondary" className="mt-2">Registrada hoy</Badge>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShirtIcon className="h-5 w-5 text-blue-600" />
                    Mal porte del uniforme
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-4xl font-bold text-blue-600">{estudiante.faltas.mal_uniforme}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Total registrado</p>
                  {estudiante.faltasHoy.includes("mal_uniforme") && (
                    <Badge variant="secondary" className="mt-2">Registrada hoy</Badge>
                  )}
                </CardContent>
              </Card>
            </div>

            <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
              <h3 className="text-lg font-semibold text-card-foreground">Resumen</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Total de faltas registradas: <strong className="text-foreground">{estudiante.faltas.total}</strong>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Este historial refleja tu comportamiento académico. Mantén un buen registro para tu desempeño escolar.
              </p>

              <div className="mt-6 border-t border-border/60 pt-5">
                <h3 className="text-lg font-semibold text-card-foreground">Historial completo</h3>
                {estudiante.historial.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Todavía no tienes faltas registradas.
                  </p>
                ) : (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="border-b border-border/60 text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-2 py-3 font-semibold">Fecha</th>
                          <th className="px-2 py-3 font-semibold">Hora</th>
                          <th className="px-2 py-3 font-semibold">Registro</th>
                          <th className="px-2 py-3 font-semibold">Observación</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estudiante.historial.map((falta) => (
                          <tr key={falta.id} className="border-b border-border/40 last:border-0">
                            <td className="whitespace-nowrap px-2 py-3 font-medium">
                              {formatoFecha(falta.fecha)}
                            </td>
                            <td className="whitespace-nowrap px-2 py-3 text-muted-foreground">
                              {formatoHora(falta.hora)}
                            </td>
                            <td className="px-2 py-3">
                              <Badge variant="secondary">{FALTA_LABELS[falta.tipo]}</Badge>
                            </td>
                            <td className="px-2 py-3 text-muted-foreground">
                              {falta.observacion ?? "Sin observación"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <Button asChild variant="outline" className="mt-4 w-full">
                <Link to="/">Salir</Link>
              </Button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function formatoFecha(fecha: string) {
  const [year, month, day] = fecha.split("-");
  return year && month && day ? `${day}/${month}/${year}` : fecha;
}

function formatoHora(iso: string) {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? "No disponible"
    : fecha.toLocaleTimeString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
      });
}
