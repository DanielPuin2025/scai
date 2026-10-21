import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Mars,
  Search,
  ShieldCheck,
  ShirtIcon,
  Timer,
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
    <main data-modulo="control-escolar" className="min-h-screen bg-slate-50 pb-16 dark:bg-slate-950">
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
            <h1 className="text-xl font-bold text-primary-foreground">Módulo de Estudiantes Encargados</h1>
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
          <div className="rounded-3xl border-2 border-indigo-200 bg-indigo-50/80 p-10 text-center shadow-card dark:border-indigo-800 dark:bg-indigo-950/40">
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
    <div className="mx-auto max-w-md rounded-3xl border-2 border-indigo-200 bg-indigo-50/80 p-6 shadow-card sm:p-8 dark:border-indigo-800 dark:bg-indigo-950/40">
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-200/80 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
          <ShieldCheck className="h-7 w-7" />
        </span>
        <h2 className="mt-3 text-2xl font-extrabold text-indigo-950 dark:text-indigo-100">Ingreso de Encargado</h2>
        <p className="text-sm font-semibold text-indigo-800/80 dark:text-indigo-300">Registro de Control Escolar y Vigilancia</p>
        <p className="mt-3 text-base font-medium text-indigo-950/80 dark:text-indigo-200">
          Ingresa únicamente con tu código institucional.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <Label htmlFor="enc-codigo" className="text-base font-bold text-indigo-950 dark:text-indigo-100">Código institucional</Label>
          <Input
            id="enc-codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej: 00712 o 26210245"
            autoComplete="username"
            className="mt-1.5 h-12 bg-white text-base font-medium dark:bg-slate-900"
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
      <div className="rounded-3xl border-2 border-indigo-200 bg-indigo-50/80 p-10 text-center shadow-card dark:border-indigo-800 dark:bg-indigo-950/40">
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
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-sky-200 bg-sky-50/80 p-6 shadow-card sm:p-7 dark:border-sky-800/60 dark:bg-sky-950/40">
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
            <h2 className="mt-2 text-2xl font-extrabold text-sky-950 dark:text-sky-100">{est.encargado.nombre}</h2>
            <p className="text-base font-semibold text-sky-800 dark:text-sky-200">
              Código {est.encargado.codigo_sis} · Grado {est.encargado.grado}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 text-right">
            <p className="text-base font-bold capitalize text-sky-950 dark:text-sky-100">{fechaLarga(est.fecha)}</p>
            <p className="flex items-center gap-1.5 text-sm font-medium text-sky-800 dark:text-sky-200">
              <Clock className="h-3.5 w-3.5" /> Horario: {hora12(est.horario.hora_inicio)} – {hora12(est.horario.hora_fin)}
            </p>
            <p className="text-sm font-bold text-sky-800 dark:text-sky-200">
              Horas acreditadas: {est.horas_total} {est.horas_total === 1 ? "hora" : "horas"}
              {est.hora_acreditada_hoy && " (hoy acreditada)"}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sky-200 pt-4 dark:border-sky-800">
          <p className="text-sm font-medium text-sky-800 dark:text-sky-200">
            {jornadaFinalizada
              ? "Tu jornada de hoy fue cerrada. Consulta con el coordinador si requieres ajustes."
              : "Al culminar tu turno escolar, finaliza la jornada para acreditar tu hora social correspondiente."}
          </p>

          {!jornadaFinalizada && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="default" size="lg" className="h-12 gap-2 px-6 text-base font-bold">
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
        <section className="rounded-3xl border-2 border-violet-200 bg-violet-50/80 p-8 text-center shadow-card dark:border-violet-800 dark:bg-violet-950/40">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <h3 className="mt-4 text-2xl font-extrabold text-violet-950 dark:text-violet-100">Función: Vigilancia</h3>
          <p className="mx-auto mt-2 max-w-lg text-base font-medium leading-relaxed text-violet-900/80 dark:text-violet-200">
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
          Busca estudiantes para registrar llegada tarde o mal porte del uniforme.
        </p>

        {bloqueado && (
          <p className="mt-4 rounded-2xl border-2 border-amber-300 bg-amber-100/80 p-4 text-base font-semibold text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            El registro se encuentra inactivo porque la jornada está fuera de horario o ya fue finalizada.
          </p>
        )}

        <form onSubmit={onBuscar} className="mt-6 grid gap-4 sm:grid-cols-[1fr_13rem_auto] sm:items-end">
          <div>
            <Label htmlFor="reg-termino" className="text-base font-bold text-emerald-950 dark:text-emerald-100">Nombre, apellido o código</Label>
            <Input
              id="reg-termino"
              value={termino}
              maxLength={80}
              placeholder="Ej: Pérez o 00712"
              autoComplete="off"
              disabled={bloqueado}
              onChange={(e) => setTermino(e.target.value)}
              className="mt-1.5 h-12 bg-white text-base font-medium shadow-xs dark:bg-slate-900"
            />
          </div>
          <div>
            <Label htmlFor="reg-grado" className="text-base font-bold text-emerald-950 dark:text-emerald-100">Grado</Label>
            <Select value={grado} onValueChange={setGrado} disabled={bloqueado}>
              <SelectTrigger id="reg-grado" className="mt-1.5 h-12 w-full bg-white text-base font-medium shadow-xs dark:bg-slate-900">
                <SelectValue placeholder="Todos los grados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-base">Todos los grados</SelectItem>
                {(gradosQuery.data ?? []).map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="lg" className="h-12 bg-emerald-700 px-6 text-base font-bold text-white shadow-md hover:bg-emerald-800 dark:bg-emerald-600" disabled={buscando || bloqueado}>
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
          </Button>
        </form>

        {resultados !== null && (
          <div className="mt-5">
            {resultados.length === 0 ? (
              <p className="rounded-2xl border-2 border-emerald-200 bg-white/90 px-4 py-3 text-base font-medium text-emerald-950 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-100">
                No se encontraron estudiantes.
              </p>
            ) : (
              <ul className="max-h-72 divide-y divide-emerald-200 overflow-auto rounded-2xl border-2 border-emerald-200 bg-white/95 dark:divide-emerald-800 dark:border-emerald-800 dark:bg-slate-900">
                {resultados.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => void cargarFicha(r.id)}
                      className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50"
                    >
                      <span className="text-base font-bold text-emerald-950 dark:text-emerald-100">{r.nombre}</span>
                      <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
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
        <div className="rounded-3xl border-2 border-violet-200 bg-violet-50/80 p-8 text-center shadow-card dark:border-violet-800 dark:bg-violet-950/40">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-violet-700 dark:text-violet-300" />
        </div>
      )}

      {estudiante && (
        <div className="space-y-5">
          <section className="rounded-3xl border-2 border-amber-200 bg-amber-50/80 p-6 shadow-card sm:p-7 dark:border-amber-800/60 dark:bg-amber-950/40">
            <div className="flex flex-col items-center gap-5 sm:flex-row">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                {genero === "F" ? <Venus className="h-8 w-8" /> : genero === "M" ? <Mars className="h-8 w-8" /> : <UserRound className="h-8 w-8" />}
              </span>
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-2xl font-extrabold text-amber-950 dark:text-amber-100">{estudiante.nombre}</h3>
                <p className="mt-1 text-base font-semibold text-amber-900/80 dark:text-amber-200">
                  Código {estudiante.codigo_sis} · Grado {estudiante.grado} · {etiquetaEstudianteGenero(estudiante.genero)}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-3 sm:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-100 px-4 py-2 text-base font-bold text-amber-950 dark:border-amber-700 dark:bg-amber-900/60 dark:text-amber-100"><Timer className="h-5 w-5 text-amber-700 dark:text-amber-300" /> Llegadas tarde: {estudiante.llegada_tarde}</span>
                  <span className="inline-flex items-center gap-2 rounded-xl border-2 border-purple-300 bg-purple-100 px-4 py-2 text-base font-bold text-purple-950 dark:border-purple-700 dark:bg-purple-900/60 dark:text-purple-100"><ShirtIcon className="h-5 w-5 text-purple-700 dark:text-purple-300" /> Mal uniforme: {estudiante.mal_uniforme}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border-2 border-violet-200 bg-violet-50/80 p-6 shadow-card sm:p-7 dark:border-violet-800/60 dark:bg-violet-950/40">
            <h4 className="text-2xl font-extrabold text-violet-950 dark:text-violet-100">Registrar novedad del día</h4>
            <p className="mt-2 text-base font-medium text-violet-900/80 dark:text-violet-200">
              Selecciona una o varias novedades para registrar en la jornada actual:
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {NOVEDADES.map((tipo) => {
                const yaRegistrada = estudiante.hoy.includes(tipo);
                const seleccionada = seleccionadas.includes(tipo);
                return (
                  <button
                    key={tipo}
                    type="button"
                    disabled={yaRegistrada || bloqueado}
                    aria-pressed={seleccionada}
                    onClick={() => toggleNovedad(tipo)}
                    className={`flex min-h-36 flex-col justify-between rounded-2xl border-2 p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 ${
                      yaRegistrada
                        ? "cursor-not-allowed border-slate-300 bg-slate-100 text-slate-500 opacity-70 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                        : tipo === "llegada_tarde"
                          ? seleccionada
                            ? "scale-[1.02] border-amber-700 bg-amber-500 text-white shadow-lg ring-4 ring-amber-300 ring-offset-2 dark:ring-offset-slate-900"
                            : "border-amber-300 bg-amber-50 text-amber-950 shadow-sm hover:border-amber-500 hover:bg-amber-100 focus-visible:ring-amber-300 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-100"
                          : seleccionada
                            ? "scale-[1.02] border-purple-700 bg-purple-600 text-white shadow-lg ring-4 ring-purple-300 ring-offset-2 dark:ring-offset-slate-900"
                            : "border-purple-300 bg-purple-50 text-purple-950 shadow-sm hover:border-purple-500 hover:bg-purple-100 focus-visible:ring-purple-300 dark:border-purple-700 dark:bg-purple-950/50 dark:text-purple-100"
                    }`}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <span className="flex items-center gap-2 text-xl font-extrabold">
                        {tipo === "llegada_tarde" ? (
                          <Timer className={`h-6 w-6 ${seleccionada ? "text-white" : "text-amber-700 dark:text-amber-300"}`} />
                        ) : (
                          <ShirtIcon className={`h-6 w-6 ${seleccionada ? "text-white" : "text-purple-700 dark:text-purple-300"}`} />
                        )}
                        {NOVEDAD_LABELS[tipo]}
                      </span>
                      {yaRegistrada ? (
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                          Registrada hoy
                        </span>
                      ) : seleccionada ? (
                        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black uppercase tracking-wide shadow-sm ${tipo === "llegada_tarde" ? "text-amber-900" : "text-purple-900"}`}>
                          <Check className="h-4 w-4 stroke-[3]" /> Seleccionada
                        </span>
                      ) : (
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${tipo === "llegada_tarde" ? "border-amber-400 bg-amber-200/70 text-amber-950 dark:border-amber-600 dark:bg-amber-900/60 dark:text-amber-200" : "border-purple-400 bg-purple-200/70 text-purple-950 dark:border-purple-600 dark:bg-purple-900/60 dark:text-purple-200"}`}>
                          Toca para marcar
                        </span>
                      )}
                    </div>
                    <p className={`mt-4 text-base font-medium leading-relaxed ${seleccionada ? "text-white/95" : tipo === "llegada_tarde" ? "text-amber-900/80 dark:text-amber-200" : "text-purple-900/80 dark:text-purple-200"}`}>
                      {tipo === "llegada_tarde" && "El estudiante ingresó después del horario establecido."}
                      {tipo === "mal_uniforme" && "Uso incorrecto del uniforme escolar o prendas no reglamentarias."}
                    </p>
                  </button>
                );
              })}
            </div>

            <Button
              size="lg"
              className="mt-6 h-12 w-full text-base font-bold shadow-md sm:w-auto"
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