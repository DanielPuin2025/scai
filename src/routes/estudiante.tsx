import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  CalendarCheck,
  ClipboardList,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogOut,
  Mars,
  ShirtIcon,
  Timer,
  UserRound,
  Venus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  cerrarSesionPanel,
  iniciarSesionEstudiante,
  misDatosEstudiante,
} from "@/lib/panel.functions";
import {
  guardarSesion,
  hoyLocal,
  usePanelSesion,
  type PanelTipo,
  type SesionPanel,
} from "@/lib/panel-sesion";
import { normalizarGenero, etiquetaEstudianteGenero } from "@/lib/genero";
import { FALTA_LABELS } from "@/lib/scai-schemas";
import { fechaLarga, horaDeFecha } from "@/lib/jornada-schemas";
import logo from "@/assets/logo-scai.png";

export const Route = createFileRoute("/estudiante")({
  head: () => ({
    meta: [
      { title: "Mi información · SCAI" },
      {
        name: "description",
        content:
          "Cada estudiante consulta únicamente su propia información: asistencias, faltas y llegadas tarde.",
      },
      { property: "og:title", content: "Mi información · SCAI" },
      {
        property: "og:description",
        content:
          "Consulta personal y privada de asistencias, faltas y llegadas tarde del estudiante.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EstudiantePage,
});

const PANELES: PanelTipo[] = ["estudiante"];

function EstudiantePage() {
  const paneles = useMemo(() => PANELES, []);
  const { sesion, listo, guardar } = usePanelSesion(paneles);
  const datosFn = useServerFn(misDatosEstudiante);
  const salirFn = useServerFn(cerrarSesionPanel);

  const token = sesion?.token;

  const datos = useQuery({
    queryKey: ["mis-datos", token],
    queryFn: () => datosFn({ data: { token: token! } }),
    enabled: Boolean(token),
    retry: false,
  });

  async function salir() {
    if (token) {
      await salirFn({ data: { token } }).catch(() => undefined);
    }

    guardar(null);
  }

  const genero = normalizarGenero(
    datos.data?.estudiante.genero ?? null,
  );

  const llegadas = (datos.data?.faltas ?? []).filter(
    (f) => f.tipo === "llegada_tarde",
  );

  const uniformes = (datos.data?.faltas ?? []).filter(
    (f) => f.tipo === "mal_uniforme",
  );

  return (
    <main
      data-modulo="mi-informacion"
      className="min-h-screen bg-background pb-16"
    >
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
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">
              SCAI
            </p>

            <h1 className="text-xl font-semibold text-primary-foreground">
              Mi información
            </h1>
          </div>

          {sesion && (
            <Button
              variant="ghost"
              className="cursor-pointer text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => void salir()}
            >
              <LogOut className="h-4 w-4" />
              Salir
            </Button>
          )}
        </div>
      </header>

      <div className="mx-auto mt-6 w-full max-w-3xl space-y-5 px-5">
        {!listo ? (
          <div className="rounded-3xl border border-hs-borde bg-card p-10 text-center shadow-card">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-hs-azul-deep" />
          </div>
        ) : !sesion ? (
          <AccesoEstudiante />
        ) : datos.isLoading ? (
          <div className="rounded-3xl border border-hs-borde bg-card p-10 text-center shadow-card">
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-hs-azul-deep" />
          </div>
        ) : datos.isError || !datos.data ? (
          <section className="rounded-3xl border border-hs-borde bg-hs-lavanda p-6 text-center">
            <h2 className="text-lg font-semibold text-hs-foreground">
              Tu sesión terminó
            </h2>

            <p className="mt-1 text-sm text-hs-foreground/80">
              Vuelve a ingresar para consultar tu información.
            </p>

            <Button
              className="mt-4 cursor-pointer"
              onClick={() => guardar(null)}
            >
              Volver a ingresar
            </Button>
          </section>
        ) : (
          <>
            {/* INFORMACIÓN DEL ESTUDIANTE */}
            <section className="rounded-3xl border border-hs-borde bg-card p-6 shadow-card">
              <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <span
                  className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-hs-azul text-hs-azul-deep"
                  role="img"
                  aria-label={etiquetaEstudianteGenero(
                    datos.data.estudiante.genero,
                  )}
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
                  <h2 className="text-xl font-semibold text-card-foreground">
                    {datos.data.estudiante.nombre}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Código {datos.data.estudiante.codigo_sis} · Grado{" "}
                    {datos.data.estudiante.grado}
                  </p>

                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Badge variant="secondary">
                      <CalendarCheck className="mr-1 h-3 w-3" />
                      Asistencias: {datos.data.asistencias.length}
                    </Badge>

                    <Badge variant="secondary">
                      <Timer className="mr-1 h-3 w-3" />
                      Llegadas tarde: {llegadas.length}
                    </Badge>

                    <Badge variant="secondary">
                      <ShirtIcon className="mr-1 h-3 w-3" />
                      Mal porte del uniforme: {uniformes.length}
                    </Badge>
                  </div>
                </div>
              </div>
            </section>

            {/* REGISTRO DE FALLAS */}
            <section className="rounded-3xl border border-hs-borde bg-card p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
                  <ClipboardList className="h-5 w-5 text-hs-aqua-deep" />
                  Registro de fallas
                </h2>

                <Badge variant="secondary">
                  Total de fallas: {datos.data.faltas.length}
                </Badge>
              </div>

              {datos.data.faltas.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-hs-azul px-4 py-3 text-sm text-hs-foreground">
                  No tienes fallas registradas.
                </p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-2xl border border-hs-borde">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-hs-azul">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">
                            Tipo de falla
                          </th>

                          <th className="px-4 py-3 text-left font-semibold">
                            Fecha
                          </th>

                          <th className="px-4 py-3 text-left font-semibold">
                            Hora
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-hs-borde">
                        {datos.data.faltas.map((f) => (
                          <tr key={f.id}>
                            <td className="px-4 py-3 font-medium text-card-foreground">
                              {FALTA_LABELS[f.tipo]}
                            </td>

                            <td className="px-4 py-3 capitalize text-muted-foreground">
                              {fechaLarga(f.fecha)}
                            </td>

                            <td className="px-4 py-3 text-muted-foreground">
                              {f.hora ? horaDeFecha(f.hora) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

/**
 * Ingreso personal:
 * código institucional + documento de identidad.
 */
function AccesoEstudiante() {
  const entrar = useServerFn(iniciarSesionEstudiante);

  const [codigo, setCodigo] = useState("");
  const [documento, setDocumento] = useState("");
  const [verDocumento, setVerDocumento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (codigo.trim().length < 3 || documento.trim().length < 3) {
      setError(
        "Escribe tu código institucional y tu número de documento.",
      );
      return;
    }

    if (!navigator.onLine) {
      setError(
        "Sin conexión: el ingreso necesita internet para verificar tus datos.",
      );
      return;
    }

    setEnviando(true);
    setError(null);

    try {
      const res = await entrar({
        data: {
          codigo: codigo.trim(),
          documento: documento.trim(),
        },
      });

      if (!res.ok) {
        // No se borra lo escrito:
        // el estudiante solo corrige lo necesario.
        setError(res.error);
        return;
      }

      const sesion: SesionPanel = {
        token: res.token,
        panel: "estudiante",
        nombre: res.estudiante.nombre,
        fecha: hoyLocal(),
      };

      guardarSesion(sesion);
    } catch {
      setError(
        "No se pudo verificar tus datos. Intenta de nuevo.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-lg rounded-3xl border border-hs-borde bg-card p-7 shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hs-aqua text-hs-foreground">
        <UserRound className="h-6 w-6" />
      </span>

      <h2 className="mt-4 text-xl font-semibold text-card-foreground">
        Consulta tu información
      </h2>

      <p className="mt-1 text-sm text-muted-foreground">
        Ingresa con tu código institucional y tu número de documento.
        Solo podrás ver tu propia información.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="codigo-est">
            Código institucional
          </Label>

          <Input
            id="codigo-est"
            autoComplete="off"
            autoFocus
            placeholder="Ej: 010804"
            value={codigo}
            maxLength={30}
            onChange={(e) => {
              setCodigo(e.target.value);
              setError(null);
            }}
            className="mt-1 h-12 text-base tracking-wide"
          />
        </div>

        <div>
          <Label htmlFor="documento-est">
            Número de documento
          </Label>

          <div className="relative mt-1">
            <Input
              id="documento-est"
              type={verDocumento ? "text" : "password"}
              autoComplete="off"
              value={documento}
              maxLength={30}
              onChange={(e) => {
                setDocumento(e.target.value);
                setError(null);
              }}
              className="h-12 pr-12 text-base"
            />

            <button
              type="button"
              onClick={() =>
                setVerDocumento((v) => !v)
              }
              aria-label={
                verDocumento
                  ? "Ocultar documento"
                  : "Mostrar documento"
              }
              className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {verDocumento ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-hs-lavanda px-4 py-3 text-sm font-medium text-hs-foreground">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={enviando}
          className="h-12 w-full cursor-pointer"
        >
          {enviando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}

          Consultar
        </Button>
      </form>
    </section>
  );
}