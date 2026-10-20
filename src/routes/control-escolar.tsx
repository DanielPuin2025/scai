import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Mars,
  Search,
  ShieldCheck,
  UserRound,
  Venus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  buscarEstudiantesEncargado,
  estadoEncargado,
  estudianteEncargado,
  finalizarJornadaEncargado,
  gradosEncargado,
  iniciarSesionEncargado,
  registrarNovedades,
} from "@/lib/encargado.functions";
import {
  FUNCION_LABELS,
  NOVEDAD_LABELS,
  NOVEDADES,
  type EstudianteRegistro,
  type NovedadTipo,
  type OpcionEstudiante,
} from "@/lib/encargado-schemas";
import { normalizarGenero, etiquetaEstudianteGenero } from "@/lib/genero";
import { fechaLarga } from "@/lib/jornada-schemas";
import logo from "@/assets/logo-scai.png";

export const Route = createFileRoute("/control-escolar")({
  head: () => ({
    meta: [
      { title: "Control escolar · SCAI" },
      {
        name: "description",
        content: "Ingreso de encargados autorizados para Registro de Control Escolar y Vigilancia.",
      },
      { property: "og:title", content: "Control escolar · SCAI" },
      {
        property: "og:description",
        content: "Registro diario de novedades y acreditación de horas sociales.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ControlEscolarPage,
});

const CLAVE_TOKEN = "scai_encargado_token";

function hora12(hora24: string | undefined | null) {
  if (!hora24) return "—";
  const [hStr, mStr] = hora24.split(":");
  const h = Number(hStr);
  const sufijo = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${mStr} ${sufijo}`;
}

function ControlEscolarPage() {
  const [token, setToken] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_TOKEN);
      if (guardado) setToken(guardado);
    } finally {
      setListo(true);
    }
  }, []);

  function alIngresar(nuevoToken: string) {
    localStorage.setItem(CLAVE_TOKEN, nuevoToken);
    setToken(nuevoToken);
  }

  function salir() {
    localStorage.removeItem(CLAVE_TOKEN);
    setToken(null);
  }

  return (
    <main data-modulo="control-escolar" className="min-h-screen bg-background pb-16">
      <header className="bg-institucional px-5 py-6">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
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
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">SCAI</p>
            <h1 className="text-xl font-semibold text-primary-foreground">Control escolar</h1>
          </div>
          {token && (
            <Button variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" onClick={salir}>
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto mt-6 w-full max-w-4xl px-5">
        {!listo ? (
          <div className="rounded-3xl border border-border/60 bg-card p-10 text-center shadow-card">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !token ? (
          <LoginEncargadoCard onLogin={alIngresar} />
        ) : (
          <PanelEncargado token={token} onSalir={salir} />
        )}
      </div>
    </main>
  );
}

function LoginEncargadoCard({ onLogin }: { onLogin: (token: string) => void }) {
  const loginFn = useServerFn(iniciarSesionEncargado);
  const [codigo, setCodigo] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cod = codigo.trim();
    if (!cod) {
      toast.error("Ingresa tu código institucional.");
      return;
    }
    setEnviando(true);
    try {
      const res = await loginFn({ data: { codigo: cod, password: cod } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Bienvenido(a), ${res.encargado.nombre}`);
      onLogin(res.token);
    } catch {
      toast.error("Error al conectar. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-border/60 bg-card p-6 shadow-card sm:p-8">
      <div className="text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h2 className="mt-3 text-xl font-semibold text-card-foreground">Ingreso de encargados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa únicamente con tu código institucional asignado.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="enc-codigo">Código institucional</Label>
          <Input
            id="enc-codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: 26210245"
            autoComplete="username"
            className="mt-1 h-12 text-base"
            autoFocus
          />
        </div>

        <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={enviando}>
          {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Ingresar
        </Button>
      </form>
    </div>
  );
}

function PanelEncargado({ token, onSalir }: { token: string; onSalir: () => void }) {
  const estadoFn = useServerFn(estadoEncargado);
  const finalizarFn = useServerFn(finalizarJornadaEncargado);

  const { data: est, isLoading, error, refetch } = useQuery({
    queryKey: ["estado-encargado", token],
    queryFn: async () => {
      const res = await estadoFn({ data: { token } });
      if (!res.ok) throw new Error("sesion_invalida");
      return res;
    },
    refetchInterval: 10_000,
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast.error("Tu sesión terminó o la asignación ya no está activa.");
      onSalir();
    }
  }, [error, onSalir]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-10 text-center shadow-card">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Cargando estado de la jornada…</p>
      </div>
    );
  }

  if (!est) return null;

  const esRegistro = est.asignacion.funcion === "registro_control_escolar";
  const jornadaFinalizada = est.jornada.estado === "finalizada";

  async function finalizarJornada() {
    try {
      const res = await finalizarFn({ data: { token } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.acreditada) {
        toast.success("¡Jornada finalizada! Se acreditó exactamente 1 hora social a tu historial.");
      } else {
        toast.info("Jornada finalizada (la hora social de hoy ya había sido acreditada).");
      }
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo finalizar.");
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {FUNCION_LABELS[est.asignacion.funcion]}
              </Badge>
              {jornadaFinalizada ? (
                <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">
                  Jornada finalizada
                </Badge>
              ) : est.dentro_horario ? (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400">
                  En horario activo
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-500 text-amber-600 dark:text-amber-400">
                  Fuera de horario
                </Badge>
              )}
            </span>
            <h2 className="mt-2 text-2xl font-semibold text-card-foreground">{est.encargado.nombre}</h2>
            <p className="text-sm text-muted-foreground">
              Código {est.encargado.codigo_sis} · Grado {est.encargado.grado}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <p className="text-sm font-medium capitalize text-card-foreground">{fechaLarga(est.fecha)}</p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Horario: {hora12(est.horario.hora_inicio)} – {hora12(est.horario.hora_fin)}
            </p>
            <p className="text-xs font-semibold text-primary">
              Horas acreditadas: {est.horas_total} {est.horas_total === 1 ? "hora" : "horas"}
              {est.hora_acreditada_hoy && " (hoy acreditada)"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground">
            {jornadaFinalizada
              ? "Tu jornada de hoy fue cerrada. Consulta con el coordinador si requieres ajustes."
              : "Al culminar tu turno escolar, finaliza la jornada para acreditar tu hora social correspondiente."}
          </p>

          {!jornadaFinalizada && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Finalizar jornada
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Deseas finalizar tu jornada de hoy?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se cerrará la jornada del día y se acreditará exactamente 1 hora social en tu cuenta. Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Continuar trabajando</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void finalizarJornada()}>
                    Sí, finalizar jornada
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </section>

      {esRegistro ? (
        <ModuloRegistro token={token} bloqueado={jornadaFinalizada || !est.dentro_horario} />
      ) : (
        <section className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-card">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <h3 className="mt-4 text-lg font-semibold text-card-foreground">Función: Vigilancia</h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Tu función asignada para este periodo es <strong>Vigilancia</strong>. Realiza los recorridos preventivos, supervisa los puntos de control y el cumplimiento de las normas. Al concluir tu horario de atención, pulsa «Finalizar jornada» para registrar tu hora social.
          </p>
        </section>
      )}
    </div>
  );
}

function ModuloRegistro({ token, bloqueado }: { token: string; bloqueado: boolean }) {
  const buscarFn = useServerFn(buscarEstudiantesEncargado);
  const gradosFn = useServerFn(gradosEncargado);
  const fichaFn = useServerFn(estudianteEncargado);
  const registrarFn = useServerFn(registrarNovedades);

  const [termino, setTermino] = useState("");
  const [grado, setGrado] = useState("todos");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<OpcionEstudiante[] | null>(null);
  const [estudiante, setEstudiante] = useState<EstudianteRegistro | null>(null);
  const [cargandoFicha, setCargandoFicha] = useState(false);
  const [seleccionadas, setSeleccionadas] = useState<NovedadTipo[]>([]);
  const [guardandoNovedades, setGuardandoNovedades] = useState(false);

  const gradosQuery = useQuery({
    queryKey: ["grados-encargado", token],
    queryFn: () => gradosFn({ data: { token } }),
  });

  async function onBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (bloqueado) return;
    if (!termino.trim() && grado === "todos") {
      toast.error("Escribe un nombre, apellido o código, o selecciona un grado.");
      return;
    }
    setBuscando(true);
    setEstudiante(null);
    setResultados(null);
    setSeleccionadas([]);
    try {
      const res = await buscarFn({
        data: { token, q: termino.trim() || undefined, grado: grado === "todos" ? undefined : grado },
      });
      if (res.length === 1) {
        await cargarFicha(res[0].id);
      } else {
        setResultados(res);
      }
    } catch {
      toast.error("No se pudo realizar la búsqueda.");
    } finally {
      setBuscando(false);
    }
  }

  async function cargarFicha(id: string) {
    setCargandoFicha(true);
    setSeleccionadas([]);
    try {
      const datos = await fichaFn({ data: { token, id } });
      setEstudiante(datos);
      setResultados(null);
    } catch {
      toast.error("No se pudo cargar la información del estudiante.");
    } finally {
      setCargandoFicha(false);
    }
  }

  function toggleNovedad(tipo: NovedadTipo) {
    setSeleccionadas((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]));
  }

  async function guardarRegistro() {
    if (!estudiante || seleccionadas.length === 0 || bloqueado) return;
    setGuardandoNovedades(true);
    try {
      const res = await registrarFn({
        data: { token, estudiante_id: estudiante.id, tipos: seleccionadas },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Novedad guardada exitosamente.");
      setSeleccionadas([]);
      await cargarFicha(estudiante.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al registrar novedad.");
    } finally {
      setGuardandoNovedades(false);
    }
  }

  const genero = normalizarGenero(estudiante?.genero);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <h3 className="text-lg font-semibold text-card-foreground">Registro de Control Escolar</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Busca estudiantes para registrar falta injustificada, llegada tarde o mal porte del uniforme.
        </p>

        {bloqueado && (
          <p className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            El registro se encuentra inactivo porque la jornada está fuera de horario o ya fue finalizada.
          </p>
        )}

        <form onSubmit={onBuscar} className="mt-5 grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
          <div>
            <Label htmlFor="reg-termino">Nombre, apellido o código</Label>
            <Input
              id="reg-termino"
              value={termino}
              maxLength={80}
              placeholder="Ej: Pérez o 00712"
              autoComplete="off"
              disabled={bloqueado}
              onChange={(e) => setTermino(e.target.value)}
              className="mt-1 h-11"
            />
          </div>
          <div>
            <Label htmlFor="reg-grado">Grado</Label>
            <Select value={grado} onValueChange={setGrado} disabled={bloqueado}>
              <SelectTrigger id="reg-grado" className="mt-1 h-11 w-full">
                <SelectValue placeholder="Todos los grados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los grados</SelectItem>
                {(gradosQuery.data ?? []).map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="h-11" disabled={buscando || bloqueado}>
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
          </Button>
        </form>

        {resultados !== null && (
          <div className="mt-5">
            {resultados.length === 0 ? (
              <p className="rounded-2xl border border-border/60 bg-muted px-4 py-3 text-sm text-muted-foreground">
                No se encontraron estudiantes.
              </p>
            ) : (
              <ul className="max-h-72 divide-y divide-border overflow-auto rounded-2xl border border-border/60">
                {resultados.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => void cargarFicha(r.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted"
                    >
                      <span className="font-medium text-card-foreground">{r.nombre}</span>
                      <span className="text-xs text-muted-foreground">
                        Código {r.codigo_sis} · Grado {r.grado}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {cargandoFicha && (
        <div className="rounded-3xl border border-border/60 bg-card p-8 text-center shadow-card">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {estudiante && (
        <div className="space-y-5">
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                {genero === "F" ? <Venus className="h-8 w-8" /> : genero === "M" ? <Mars className="h-8 w-8" /> : <UserRound className="h-8 w-8" />}
              </span>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-xl font-semibold text-card-foreground">{estudiante.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  Código {estudiante.codigo_sis} · Grado {estudiante.grado} · {etiquetaEstudianteGenero(estudiante.genero)}
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <Badge variant="secondary">Faltas injustificadas: {estudiante.falta_injustificada}</Badge>
                  <Badge variant="secondary">Llegadas tarde: {estudiante.llegada_tarde}</Badge>
                  <Badge variant="secondary">Mal uniforme: {estudiante.mal_uniforme}</Badge>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
            <h4 className="text-base font-semibold text-card-foreground">Registrar novedad del día</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecciona una o varias novedades para registrar en la jornada actual:
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {NOVEDADES.map((tipo) => {
                const yaRegistrada = estudiante.hoy.includes(tipo);
                const seleccionada = seleccionadas.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    disabled={yaRegistrada || bloqueado}
                    onClick={() => toggleNovedad(tipo)}
                    className={`flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-colors ${
                      yaRegistrada
                        ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 cursor-not-allowed"
                        : seleccionada
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border/60 bg-card hover:bg-muted text-card-foreground"
                    }`}
                  >
                    <span className="font-medium text-sm">{NOVEDAD_LABELS[tipo]}</span>
                    {yaRegistrada ? (
                      <span className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" /> Registrada hoy
                      </span>
                    ) : (
                      <span className="mt-3 text-xs text-muted-foreground">
                        {seleccionada ? "Seleccionada" : "Toca para marcar"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <Button
              className="mt-5 h-11 w-full sm:w-auto"
              disabled={seleccionadas.length === 0 || guardandoNovedades || bloqueado}
              onClick={() => void guardarRegistro()}
            >
              {guardandoNovedades && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar novedades
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
