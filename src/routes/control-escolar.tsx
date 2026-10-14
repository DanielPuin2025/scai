import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  CloudOff,
  Loader2,
  LogOut,
  Mars,
  Search,
  ShirtIcon,
  Timer,
  UserRound,
  Venus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buscarEstudiantes, listarGradosPublicos, obtenerEstudiante, registrarFaltas } from "@/lib/scai.functions";
import { FALTA_LABELS, type EstudianteOpcion, type EstudiantePublico, type FaltaTipo } from "@/lib/scai-schemas";
import { abrirJornada, estadoHorario, obtenerJornada } from "@/lib/jornada.functions";
import { cerrarSesionPanel } from "@/lib/panel.functions";
import { usePanelSesion, hoyLocal, type PanelTipo } from "@/lib/panel-sesion";
import { normalizarGenero, etiquetaEstudianteGenero } from "@/lib/genero";
import { encolar, usePendientes } from "@/lib/offline-queue";
import { PendientesBanner } from "@/components/scai/PendientesBanner";
import { AccesoPanel, type SesionHorasSociales } from "@/components/scai/AccesoHorasSociales";
import { ControlDeHoy } from "@/components/scai/ControlDeHoy";
import logo from "@/assets/logo-scai.png";

export const Route = createFileRoute("/control-escolar")({
  head: () => ({
    meta: [
      { title: "Control escolar · SCAI" },
      {
        name: "description",
        content:
          "Ingreso autorizado para registrar estudiantes, llegadas tarde, mal porte del uniforme e incidencias del día.",
      },
      { property: "og:title", content: "Control escolar · SCAI" },
      {
        property: "og:description",
        content: "Registro diario de estudiantes con usuario y contraseña autorizados por el coordinador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ControlEscolarPage,
});

const PANELES: PanelTipo[] = ["control_escolar", "horas_sociales"];

function ControlEscolarPage() {
  const { sesion, listo, guardar } = usePanelSesion(PANELES);

  const buscar = useServerFn(buscarEstudiantes);
  const obtener = useServerFn(obtenerEstudiante);
  const gradosFn = useServerFn(listarGradosPublicos);
  const marcarFaltas = useServerFn(registrarFaltas);
  const estadoFn = useServerFn(estadoHorario);
  const abrirFn = useServerFn(abrirJornada);
  const jornadaFn = useServerFn(obtenerJornada);
  const salirFn = useServerFn(cerrarSesionPanel);
  const { online } = usePendientes();

  const [termino, setTermino] = useState("");
  const [grado, setGrado] = useState("todos");
  const [cargando, setCargando] = useState(false);
  const [opciones, setOpciones] = useState<EstudianteOpcion[] | null>(null);
  const [estudiante, setEstudiante] = useState<EstudiantePublico | null>(null);
  const [seleccion, setSeleccion] = useState<FaltaTipo[]>([]);
  const [jornada, setJornada] = useState<SesionHorasSociales | null>(null);

  const token = sesion?.token;
  const esHorasSociales = sesion?.panel === "horas_sociales";

  async function salir() {
    if (token) await salirFn({ data: { token } }).catch(() => undefined);
    setJornada(null);
    setEstudiante(null);
    setOpciones(null);
    guardar(null);
  }

  // Si la sesión ya no es válida en la base de datos, se cierra en el dispositivo.
  function manejarError(e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("SESION_INVALIDA")) {
      toast.error("Tu sesión terminó. Vuelve a ingresar.");
      guardar(null);
      return true;
    }
    return false;
  }

  // Horas sociales: se abre (o reanuda) la jornada del día.
  useEffect(() => {
    if (!token || !esHorasSociales || jornada) return;
    let activo = true;
    void (async () => {
      try {
        const res = await abrirFn({ data: { token, fecha: hoyLocal() } });
        if (!activo) return;
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        setJornada({ encargado: res.encargado, jornada: res.jornada, horario: res.horario });
      } catch (e) {
        if (!manejarError(e)) toast.error("No se pudo abrir el control de hoy.");
      }
    })();
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, esHorasSociales]);

  /*
   * Horario vigente: se consulta siempre a la base de datos, nunca se fija
   * en el código. Se vuelve a consultar cada 5 segundos y cada vez que el
   * usuario regresa a la pestaña o recupera la conexión, para que un cambio
   * hecho por el coordinador se vea aquí (computador y celular) enseguida.
   */
  const horarioQuery = useQuery({
    queryKey: ["estado-horario"],
    queryFn: () => estadoFn({ data: undefined }),
    refetchInterval: 5_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    enabled: typeof window !== "undefined" && Boolean(token),
  });

  // Reanudar la jornada actualiza también sus horas con la configuración más
  // reciente, aunque el coordinador haya hecho el cambio en otro dispositivo.
  useEffect(() => {
    if (
      !token ||
      !esHorasSociales ||
      !jornada ||
      jornada.jornada.estado === "finalizada"
    ) {
      return;
    }

    let activo = true;
    const sincronizar = async () => {
      try {
        const res = await abrirFn({ data: { token, fecha: hoyLocal() } });
        if (!activo || !res.ok) return;
        setJornada({
          encargado: res.encargado,
          jornada: res.jornada,
          horario: res.horario,
        });
      } catch (e) {
        if (activo) manejarError(e);
      }
    };

    const intervalo = window.setInterval(() => void sincronizar(), 5_000);
    window.addEventListener("focus", sincronizar);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", sincronizar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, esHorasSociales, jornada?.jornada.id, jornada?.jornada.estado]);

  const jornadaFinalizada = jornada?.jornada.estado === "finalizada";
  // Se prefiere el horario leído directamente de la configuración; si no está
  // disponible, el que llegó sincronizado con la jornada del día.
  const horarioLeido = horarioQuery.data?.horario;
  const horarioMostrado =
    horarioLeido?.id ? horarioLeido : (jornada?.horario ?? horarioLeido);
  const horaActual = horarioQuery.data?.ahora;
  const dentroFranja =
    horarioMostrado && horaActual
      ? horaActual >= horarioMostrado.hora_inicio.slice(0, 8) &&
        horaActual <= horarioMostrado.hora_fin.slice(0, 8)
      : Boolean(horarioQuery.data?.abierto);
  const abierto = dentroFranja && !jornadaFinalizada;

  const gradosQuery = useQuery({
    queryKey: ["grados-panel", token],
    queryFn: () => gradosFn({ data: { token: token! } }),
    enabled: Boolean(token),
  });

  async function cargarEstudiante(id: string) {
    if (!token) return;
    setCargando(true);
    try {
      const det = await obtener({ data: { token, id } });
      setEstudiante(det);
      setOpciones(null);
      setSeleccion([]);
    } catch (e) {
      if (!manejarError(e)) toast.error("No se pudo cargar la información del estudiante.");
    } finally {
      setCargando(false);
    }
  }

  async function onBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    const q = termino.trim();
    if (!q && grado === "todos") {
      toast.error("Escribe un nombre, apellido o código, o elige un grado.");
      return;
    }
    if (!navigator.onLine) {
      toast.error("Sin conexión: no es posible consultar la base de datos en este momento.");
      return;
    }
    setCargando(true);
    setEstudiante(null);
    setOpciones(null);
    setSeleccion([]);
    try {
      const res = await buscar({
        data: { token, q: q || undefined, grado: grado === "todos" ? undefined : grado },
      });
      if (res.length === 0) {
        setOpciones([]);
        return;
      }
      if (res.length === 1) {
        await cargarEstudiante(res[0].id);
        return;
      }
      setOpciones(res);
    } catch (e) {
      if (!manejarError(e)) toast.error("No se pudo consultar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function onFaltas() {
    if (!estudiante || seleccion.length === 0 || !abierto || !token) return;
    const ahora = new Date();
    if (!navigator.onLine) {
      encolar({
        kind: "faltas",
        codigo: estudiante.codigo_sis,
        nombre: estudiante.nombre,
        fecha: hoyLocal(),
        hora: ahora.toISOString(),
        tipos: seleccion,
      });
      toast.success(`Guardado sin conexión (${ahora.toLocaleString("es-CO")}). Se sincronizará automáticamente.`);
      setEstudiante({
        ...estudiante,
        faltasHoy: Array.from(new Set([...estudiante.faltasHoy, ...seleccion])),
      });
      setSeleccion([]);
      return;
    }
    try {
      const res = await marcarFaltas({
        data: {
          token,
          codigo: estudiante.codigo_sis,
          tipos: seleccion,
          fecha: hoyLocal(),
          hora: ahora.toISOString(),
          jornada_id: jornada?.jornada.id,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        setSeleccion([]);
        return;
      }
      const registradas = res.registradas as FaltaTipo[];
      setEstudiante({
        ...estudiante,
        faltas: {
          llegada_tarde: estudiante.faltas.llegada_tarde + (registradas.includes("llegada_tarde") ? 1 : 0),
          mal_uniforme: estudiante.faltas.mal_uniforme + (registradas.includes("mal_uniforme") ? 1 : 0),
          total: estudiante.faltas.total + registradas.length,
        },
        faltasHoy: Array.from(new Set([...estudiante.faltasHoy, ...registradas, ...seleccion])),
      });
      setSeleccion([]);
      if (res.duplicadas.length > 0) {
        toast.info("Ese estudiante ya tenía registrada esa anotación hoy; no se duplicó.");
      }
      if (registradas.length > 0) toast.success(`Registrado a las ${ahora.toLocaleTimeString("es-CO")}`);
    } catch (e) {
      if (!manejarError(e)) toast.error("No se pudo guardar el registro.");
    }
  }

  function toggle(tipo: FaltaTipo) {
    setSeleccion((prev) => (prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]));
  }

  async function marcarFinalizada() {
    if (!jornada || !token) return;
    const j = await jornadaFn({ data: { token, id: jornada.jornada.id } }).catch(() => null);
    if (j) setJornada({ ...jornada, jornada: j });
  }

  const genero = normalizarGenero(estudiante?.genero);

  return (
    <main data-modulo="control-escolar" className="min-h-screen bg-background pb-16">
      <header className="bg-institucional px-5 py-6">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="cursor-pointer text-primary-foreground hover:bg-primary-foreground/10"
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
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">SCAI</p>
            <h1 className="text-xl font-semibold text-primary-foreground">
              {esHorasSociales ? "Horas sociales" : "Control escolar"}
            </h1>
          </div>
          {sesion && !esHorasSociales && (
            <Button
              variant="ghost"
              className="cursor-pointer text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => void salir()}
            >
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto mt-6 w-full max-w-3xl space-y-5 px-5">
        <PendientesBanner token={token} />

        {!listo ? (
          <div className="rounded-3xl border border-hs-borde bg-card p-10 text-center shadow-card">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-hs-azul-deep" />
          </div>
        ) : !sesion ? (
          <AccesoPanel onAcceso={() => undefined} />
        ) : (
          <div className="space-y-5">
            {esHorasSociales && jornada && (
              <ControlDeHoy
                token={sesion.token}
                sesion={jornada}
                abierto={abierto}
                horario={horarioMostrado}
                onFinalizada={() => void marcarFinalizada()}
                onSalir={() => void salir()}
              />
            )}

            {!esHorasSociales && (
              <section className="rounded-3xl border border-hs-borde bg-hs-azul p-6 shadow-card">
                <h2 className="text-lg font-semibold text-hs-foreground">Control escolar</h2>
                <p className="mt-1 text-sm text-hs-foreground/80">
                  Sesión de {sesion.nombre}. Registra llegadas tarde, mal porte del uniforme e incidencias del día.
                </p>
              </section>
            )}

            <section className="rounded-3xl border border-hs-borde bg-card p-6 shadow-card">
              <h2 className="text-lg font-semibold text-card-foreground">Registrar estudiante</h2>
              <p className="mt-1 text-sm text-muted-foreground">Busca al estudiante para realizar el registro</p>

              {!abierto && (
                <p className="mt-4 rounded-2xl border border-hs-borde bg-hs-lavanda px-5 py-4 text-sm font-medium text-hs-foreground">
                  {jornadaFinalizada
                    ? "La jornada de hoy fue finalizada. Ya no se pueden registrar estudiantes."
                    : "Fuera del horario configurado por el coordinador. El registro está bloqueado."}
                </p>
              )}

              <form onSubmit={onBuscar} className="mt-5 space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                  <div>
                    <Label htmlFor="termino">Nombre, apellido, código o documento</Label>
                    <Input
                      id="termino"
                      autoComplete="off"
                      placeholder="Ej: maria gomez o 26210245"
                      value={termino}
                      maxLength={80}
                      onChange={(e) => setTermino(e.target.value)}
                      className="mt-1 h-12 text-base"
                    />
                  </div>
                  <div>
                    <Label htmlFor="grado">Grado</Label>
                    <Select value={grado} onValueChange={setGrado}>
                      <SelectTrigger id="grado" className="mt-1 h-12 w-full cursor-pointer">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos" className="cursor-pointer">
                          Todos los grados
                        </SelectItem>
                        {(gradosQuery.data ?? []).map((g) => (
                          <SelectItem key={g} value={g} className="cursor-pointer">
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" size="lg" disabled={cargando} className="h-12 w-full cursor-pointer sm:w-44">
                  {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Buscar
                </Button>
                {!online && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CloudOff className="h-4 w-4" /> Sin conexión: la búsqueda requiere internet, pero los registros se
                    guardan localmente.
                  </p>
                )}
              </form>
            </section>

            {opciones !== null && opciones.length === 0 && (
              <section className="rounded-3xl border border-hs-borde bg-hs-lavanda p-6 text-center">
                <h2 className="text-lg font-semibold text-hs-foreground">Estudiante no encontrado</h2>
                <p className="mt-1 text-sm text-hs-foreground/80">Revisa el dato ingresado o elige otro grado.</p>
              </section>
            )}

            {opciones !== null && opciones.length > 0 && (
              <section className="rounded-3xl border border-hs-borde bg-card p-4 shadow-card">
                <div className="flex items-center justify-between px-2 pb-2">
                  <h2 className="text-base font-semibold text-card-foreground">
                    {opciones.length} estudiantes encontrados
                  </h2>
                  <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setOpciones(null)}>
                    <X className="h-4 w-4" /> Cerrar
                  </Button>
                </div>
                <ul className="max-h-80 divide-y divide-hs-borde overflow-auto rounded-2xl border border-hs-borde">
                  {opciones.map((o) => (
                    <li key={o.id}>
                      <button
                        type="button"
                        onClick={() => void cargarEstudiante(o.id)}
                        className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-hs-azul"
                      >
                        <span className="font-medium text-card-foreground">{o.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          Código {o.codigo_sis} · Grado {o.grado}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {estudiante && (
              <>
                <section className="rounded-3xl border border-hs-borde bg-card p-6 shadow-card">
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    <span
                      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-hs-azul text-hs-azul-deep"
                      role="img"
                      aria-label={etiquetaEstudianteGenero(estudiante.genero)}
                    >
                      {genero === "F" ? (
                        <Venus className="h-10 w-10" />
                      ) : genero === "M" ? (
                        <Mars className="h-10 w-10" />
                      ) : (
                        <UserRound className="h-10 w-10" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold text-card-foreground">{estudiante.nombre}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Código {estudiante.codigo_sis} · Grado {estudiante.grado} ·{" "}
                        {etiquetaEstudianteGenero(estudiante.genero)}
                        {estudiante.identificacion
                          ? ` · ${estudiante.tipo_id ?? "TI"} ${estudiante.identificacion}`
                          : ""}
                      </p>
                      <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                        <Badge variant="secondary">
                          <Timer className="mr-1 h-3 w-3" /> Llegadas tarde: {estudiante.faltas.llegada_tarde}
                        </Badge>
                        <Badge variant="secondary">
                          <ShirtIcon className="mr-1 h-3 w-3" /> Mal porte del uniforme:{" "}
                          {estudiante.faltas.mal_uniforme}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-hs-borde bg-card p-6 shadow-card">
                  <h2 className="text-lg font-semibold text-card-foreground">Registrar estudiante</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Toca lo que corresponda y guarda. La fecha y la hora se guardan automáticamente.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(Object.keys(FALTA_LABELS) as FaltaTipo[]).map((tipo) => {
                      const activo = seleccion.includes(tipo);
                      const yaRegistrada = estudiante.faltasHoy.includes(tipo);
                      const tono = tipo === "llegada_tarde" ? "aqua" : "lavanda";
                      const clases = yaRegistrada
                        ? tono === "aqua"
                          ? "border-hs-aqua-deep bg-hs-aqua-deep text-hs-deep-foreground"
                          : "border-hs-lavanda-deep bg-hs-lavanda-deep text-hs-deep-foreground"
                        : activo
                          ? tono === "aqua"
                            ? "border-hs-aqua-deep bg-hs-aqua text-hs-foreground"
                            : "border-hs-lavanda-deep bg-hs-lavanda text-hs-foreground"
                          : "border-hs-borde bg-card text-card-foreground hover:bg-hs-azul";
                      return (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => !yaRegistrada && abierto && toggle(tipo)}
                          aria-pressed={activo}
                          disabled={yaRegistrada || !abierto}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed ${clases}`}
                        >
                          {tipo === "llegada_tarde" ? (
                            <Timer className="h-5 w-5" />
                          ) : (
                            <ShirtIcon className="h-5 w-5" />
                          )}
                          <span className="font-medium">{FALTA_LABELS[tipo]}</span>
                          {yaRegistrada && (
                            <span className="ml-auto flex items-center gap-1 text-xs font-semibold">
                              <CheckCircle2 className="h-4 w-4" /> Registrado
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    onClick={onFaltas}
                    size="lg"
                    className="mt-4 h-12 w-full cursor-pointer"
                    disabled={seleccion.length === 0 || !abierto}
                  >
                    Guardar registro
                  </Button>
                </section>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
