import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  ShirtIcon,
  Timer,
  UserRoundSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buscarEstudiante,
  buscarEstudiantes,
  descargarDirectorio,
  listarGradosPublicos,
  registrarFaltas,
} from "@/lib/scai.functions";
import {
  FALTA_LABELS,
  fechaHoyColombia,
  type EstudianteOpcion,
  type EstudiantePublico,
  type FaltaTipo,
} from "@/lib/scai-schemas";
import { encolar, usePendientes } from "@/lib/offline-queue";
import {
  buscarLocal,
  detalleLocal,
  gradosLocales,
  guardarDirectorio,
} from "@/lib/directorio-local";
import { PendientesBanner } from "@/components/scai/PendientesBanner";
import logo from "@/assets/logo-scai.png";

export const Route = createFileRoute("/encargado")({
  head: () => ({
    meta: [
      { title: "Registro rápido · SCAI" },
      {
        name: "description",
        content: "Registro rápido de llegadas tarde y uniforme para encargados de entrada.",
      },
      { property: "og:title", content: "Registro rápido · SCAI" },
    ],
  }),
  component: EncargadoPage,
});

function hoy() {
  return fechaHoyColombia();
}

function EncargadoPage() {
  const buscar = useServerFn(buscarEstudiante);
  const buscarDirectorio = useServerFn(buscarEstudiantes);
  const listarGrados = useServerFn(listarGradosPublicos);
  const marcarFaltas = useServerFn(registrarFaltas);
  const descargar = useServerFn(descargarDirectorio);
  const { online } = usePendientes();

  const [codigo, setCodigo] = useState("");
  const [mostrarDirectorio, setMostrarDirectorio] = useState(false);
  const [consultaNombre, setConsultaNombre] = useState("");
  const [consultaGrado, setConsultaGrado] = useState("todos");
  const [grados, setGrados] = useState<string[]>([]);
  const [opciones, setOpciones] = useState<EstudianteOpcion[]>([]);
  const [buscandoDirectorio, setBuscandoDirectorio] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [registrando, setRegistrando] = useState(false);
  const [estudiante, setEstudiante] = useState<EstudiantePublico | null>(null);
  const [seleccion, setSeleccion] = useState<FaltaTipo[]>([]);
  const [ultimoRegistro, setUltimoRegistro] = useState<string | null>(null);

  useEffect(() => {
    if (!online) return;
    let cancelado = false;

    void descargar({ data: undefined })
      .then((directorio) => {
        if (!cancelado) guardarDirectorio(directorio);
      })
      .catch(() => {
        // The online flow remains available if the offline cache refresh fails.
      });

    return () => {
      cancelado = true;
    };
  }, [descargar, online]);

  useEffect(() => {
    let cancelado = false;

    if (!online) {
      setGrados(gradosLocales());
      return () => {
        cancelado = true;
      };
    }

    void listarGrados({ data: undefined })
      .then((resultado) => {
        if (!cancelado) setGrados(resultado);
      })
      .catch(() => {
        if (!cancelado) setGrados(gradosLocales());
      });

    return () => {
      cancelado = true;
    };
  }, [listarGrados, online]);

  async function buscarRapido(e: React.FormEvent) {
    e.preventDefault();
    const cod = codigo.trim();

    if (!cod) {
      toast.error("Ingresa el código del estudiante");
      return;
    }

    setBuscando(true);
    setEstudiante(null);
    setSeleccion([]);
    setUltimoRegistro(null);

    try {
      if (!navigator.onLine) {
        const opcionLocal = buscarLocal(cod)[0];
        const local = opcionLocal ? detalleLocal(opcionLocal.id, hoy()) : null;
        if (!local) {
          toast.error(
            "Sin conexión y sin directorio local. Conéctate para buscar este estudiante.",
          );
          return;
        }
        setEstudiante(local);
        toast.success(`Estudiante encontrado: ${local.nombre}`);
        return;
      }

      const resultado = await buscar({ data: { codigo: cod } });

      if (!resultado) {
        toast.error("Estudiante no encontrado. Verifica el código.");
        setBuscando(false);
        return;
      }

      setEstudiante(resultado);
      toast.success(`Estudiante encontrado: ${resultado.nombre}`);
    } catch {
      const opcionLocal = buscarLocal(cod)[0];
      const local = opcionLocal ? detalleLocal(opcionLocal.id, hoy()) : null;
      if (local) {
        setEstudiante(local);
        toast.success(`Consulta local: ${local.nombre}`);
      } else {
        toast.error("No se pudo buscar el estudiante. Revisa la conexión e inténtalo de nuevo.");
      }
    } finally {
      setBuscando(false);
    }
  }

  async function buscarEnDirectorio(e: React.FormEvent) {
    e.preventDefault();
    const q = consultaNombre.trim();
    const grado = consultaGrado === "todos" ? undefined : consultaGrado;

    if (!q && !grado) {
      toast.error("Escribe un nombre o selecciona un grado");
      return;
    }

    setBuscandoDirectorio(true);

    try {
      const resultado = !navigator.onLine
        ? buscarLocal(q, grado)
        : await buscarDirectorio({ data: { q: q || undefined, grado } });
      setOpciones(resultado);
      if (resultado.length === 0) toast.error("No se encontraron estudiantes con esos datos");
    } catch {
      const resultado = buscarLocal(q, grado);
      setOpciones(resultado);
      if (resultado.length === 0) toast.error("No se pudo consultar el directorio");
    } finally {
      setBuscandoDirectorio(false);
    }
  }

  async function seleccionarEstudiante(opcion: EstudianteOpcion) {
    setCodigo(opcion.codigo_sis);
    setMostrarDirectorio(false);
    setBuscando(true);
    setEstudiante(null);
    setSeleccion([]);
    setUltimoRegistro(null);

    try {
      if (!navigator.onLine) {
        const local = detalleLocal(opcion.id, hoy());
        if (!local) {
          toast.error("El estudiante no está disponible en el directorio local.");
          return;
        }
        setEstudiante(local);
        toast.success(`Estudiante seleccionado: ${local.nombre}`);
        return;
      }

      const resultado = await buscar({ data: { codigo: opcion.codigo_sis } });
      if (!resultado) {
        toast.error("No se pudo cargar el estudiante.");
        return;
      }
      setEstudiante(resultado);
      toast.success(`Estudiante seleccionado: ${resultado.nombre}`);
    } catch {
      toast.error("No se pudo cargar el estudiante. Revisa la conexión e inténtalo de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  async function registrarRapido() {
    if (!estudiante || seleccion.length === 0) return;

    setRegistrando(true);
    const ahora = new Date();

    try {
      if (!navigator.onLine) {
        encolar({
          kind: "faltas",
          codigo: estudiante.codigo_sis,
          nombre: estudiante.nombre,
          fecha: hoy(),
          hora: ahora.toISOString(),
          tipos: seleccion,
        });
        toast.success("Guardado sin conexión. Se sincronizará automáticamente.");
        limpiarYPreparar();
        return;
      }

      const res = await marcarFaltas({
        data: {
          codigo: estudiante.codigo_sis,
          tipos: seleccion,
          fecha: hoy(),
          hora: ahora.toISOString(),
        },
      });

      if (!res.ok) {
        toast.error(res.error);
        setSeleccion([]);
        setRegistrando(false);
        return;
      }

      const registradas = res.registradas as FaltaTipo[];
      const etiquetas = registradas.map((t) => FALTA_LABELS[t]).join(", ");

      setUltimoRegistro(`✓ ${estudiante.nombre} - ${etiquetas}`);
      toast.success("Registro exitoso");

      limpiarYPreparar();
    } catch {
      toast.error("No se pudo registrar. Revisa la conexión e inténtalo de nuevo.");
      setRegistrando(false);
    }
  }

  function limpiarYPreparar() {
    setCodigo("");
    setEstudiante(null);
    setSeleccion([]);
    setRegistrando(false);

    // Enfocar el input para el siguiente estudiante
    setTimeout(() => {
      document.getElementById("codigo-input")?.focus();
    }, 100);
  }

  function toggle(tipo: FaltaTipo) {
    setSeleccion((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  }

  return (
    <main className="min-h-screen bg-suave pb-8">
      <header className="bg-institucional px-5 py-5">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link to="/" aria-label="Volver al inicio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <img
            src={logo}
            alt=""
            width={1200}
            height={1137}
            className="h-10 w-auto shrink-0 rounded-lg bg-primary-foreground/90 p-1"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">
              SCAI
            </p>
            <h1 className="text-xl font-semibold text-primary-foreground">Registro rápido</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 w-full max-w-4xl space-y-5 px-5">
        <PendientesBanner />

        {ultimoRegistro && (
          <div className="rounded-2xl border border-green-500/30 bg-green-50 p-4 text-center">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              {ultimoRegistro}
            </p>
          </div>
        )}

        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold text-card-foreground">Buscar estudiante</h2>
          <form onSubmit={buscarRapido} className="mt-4 flex gap-3">
            <div className="flex-1">
              <Label htmlFor="codigo-input" className="sr-only">
                Código del estudiante
              </Label>
              <Input
                id="codigo-input"
                type="text"
                autoComplete="off"
                placeholder="Código del estudiante"
                value={codigo}
                maxLength={30}
                onChange={(e) => setCodigo(e.target.value)}
                className="h-14 text-lg"
                autoFocus
              />
            </div>
            <Button type="submit" size="lg" disabled={buscando} className="h-14 px-8">
              {buscando ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
              Buscar
            </Button>
          </form>

          <div className="mt-4 border-t border-border/60 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-between px-2 text-left"
              onClick={() => setMostrarDirectorio((visible) => !visible)}
              aria-expanded={mostrarDirectorio}
            >
              <span className="flex items-center gap-2">
                <UserRoundSearch className="h-5 w-5" />
                ¿No recuerda el código? Buscar por nombre o grado
              </span>
              <ChevronDown
                className={`h-5 w-5 transition-transform ${mostrarDirectorio ? "rotate-180" : ""}`}
              />
            </Button>

            {mostrarDirectorio && (
              <div className="mt-4 space-y-4 rounded-2xl border border-border/60 bg-muted/30 p-4">
                <form
                  onSubmit={buscarEnDirectorio}
                  className="grid gap-3 sm:grid-cols-[1fr_220px_auto] sm:items-end"
                >
                  <div>
                    <Label htmlFor="buscar-nombre">Nombre del estudiante</Label>
                    <Input
                      id="buscar-nombre"
                      value={consultaNombre}
                      maxLength={80}
                      onChange={(e) => setConsultaNombre(e.target.value)}
                      placeholder="Ej. María López"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="buscar-grado">Grado</Label>
                    <Select value={consultaGrado} onValueChange={setConsultaGrado}>
                      <SelectTrigger id="buscar-grado" className="mt-1 w-full">
                        <SelectValue placeholder="Todos los grados" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los grados</SelectItem>
                        {grados.map((grado) => (
                          <SelectItem key={grado} value={grado}>
                            {grado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={buscandoDirectorio} className="h-10">
                    {buscandoDirectorio ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    Buscar
                  </Button>
                </form>

                {opciones.length > 0 && (
                  <div className="space-y-2" aria-live="polite">
                    <p className="text-sm font-medium text-muted-foreground">
                      {opciones.length} resultado{opciones.length === 1 ? "" : "s"}. Selecciona el
                      estudiante:
                    </p>
                    <div className="grid gap-2">
                      {opciones.map((opcion) => (
                        <button
                          key={opcion.id}
                          type="button"
                          onClick={() => void seleccionarEstudiante(opcion)}
                          className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{opcion.nombre}</span>
                            <span className="block text-sm text-muted-foreground">
                              Grado: {opcion.grado}
                            </span>
                          </span>
                          <Badge variant="outline" className="shrink-0">
                            {opcion.codigo_sis}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!online && (
            <p className="mt-3 text-sm text-amber-600">
              ⚠ Sin conexión: Los registros se guardarán localmente y se sincronizarán cuando haya
              internet.
            </p>
          )}
        </section>

        {estudiante && (
          <>
            <section className="rounded-3xl border border-border/60 bg-pastel-blue/30 p-6 shadow-card">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-card-foreground">{estudiante.nombre}</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Código: {estudiante.codigo_sis}</Badge>
                  <Badge variant="outline">Grado: {estudiante.grado}</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    <Timer className="mr-1 h-3 w-3" /> {estudiante.faltas.llegada_tarde} llegadas
                    tarde
                  </Badge>
                  <Badge variant="secondary">
                    <ShirtIcon className="mr-1 h-3 w-3" /> {estudiante.faltas.mal_uniforme} faltas
                    de uniforme
                  </Badge>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
              <h2 className="text-lg font-semibold text-card-foreground">Seleccionar falta</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Marca las faltas correspondientes y registra
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(Object.keys(FALTA_LABELS) as FaltaTipo[]).map((tipo) => {
                  const activo = seleccion.includes(tipo);
                  const yaRegistrada = estudiante.faltasHoy.includes(tipo);

                  return (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => !yaRegistrada && toggle(tipo)}
                      disabled={yaRegistrada}
                      className={`flex items-center gap-3 rounded-2xl border p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        activo
                          ? "border-primary bg-primary text-primary-foreground shadow-lg scale-105"
                          : "border-border bg-background text-foreground hover:bg-muted hover:scale-102"
                      }`}
                    >
                      {tipo === "llegada_tarde" ? (
                        <Timer className="h-6 w-6 shrink-0" />
                      ) : (
                        <ShirtIcon className="h-6 w-6 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{FALTA_LABELS[tipo]}</p>
                        {yaRegistrada && (
                          <p className="mt-0.5 text-xs opacity-70">Ya registrada hoy</p>
                        )}
                      </div>
                      {activo && <CheckCircle2 className="h-5 w-5" />}
                    </button>
                  );
                })}
              </div>

              <Button
                onClick={registrarRapido}
                size="lg"
                className="mt-5 h-14 w-full text-base font-semibold"
                disabled={seleccion.length === 0 || registrando}
              >
                {registrando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
                Registrar {seleccion.length > 0 && `(${seleccion.length})`}
              </Button>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
