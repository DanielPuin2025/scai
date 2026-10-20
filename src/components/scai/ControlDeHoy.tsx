import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Clock, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { finalizarJornada } from "@/lib/jornada.functions";
import { fechaLarga, formatoHora12, type HorarioControl } from "@/lib/jornada-schemas";
import type { SesionHorasSociales } from "./AccesoHorasSociales";

type Props = {
  token: string;
  sesion: SesionHorasSociales;
  abierto: boolean;
  /**
   * Horario vigente en la base de datos.
   * Se recibe desde la página para que el cambio hecho por el coordinador
   * se vea aquí sin tener que volver a abrir la jornada.
   */
  horario?: HorarioControl;
  onFinalizada: () => void;
  onSalir: () => void;
};

/**
 * Identificación, jornada vigente y cierre de la sesión local del encargado.
 *
 * El botón de finalizar queda bloqueado cuando:
 * - la jornada ya fue finalizada
 * - estamos fuera del horario configurado
 */
export function ControlDeHoy({
  token,
  sesion,
  abierto,
  horario: horarioVigente,
  onFinalizada,
  onSalir,
}: Props) {
  const finalizar = useServerFn(finalizarJornada);

  const { encargado, jornada } = sesion;

  // Siempre se muestra el horario vigente en la base de datos.
  // Solo si aún no llegó, se usa el que trajo la apertura de la jornada.
  const horario = horarioVigente ?? sesion.horario;

  const finalizada = jornada.estado === "finalizada";

  const puedeFinalizar = !finalizada;

  async function onFinalizar() {
    if (finalizada) {
      toast.error("La jornada ya fue finalizada.");
      return;
    }

    const res = await finalizar({
      data: {
        token,
        id: jornada.id,
      },
    });

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success("Jornada finalizada. Se contabilizó 1 hora social.");
    onFinalizada();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="cursor-pointer border-hs-borde bg-card"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent className="max-w-md rounded-2xl border-hs-borde">
            <AlertDialogHeader>
              <AlertDialogTitle>¿Deseas cerrar la sesión?</AlertDialogTitle>

              <AlertDialogDescription>
                Si cierras la sesión, tendrás que volver a ingresar tus datos
                para continuar con el control de horas sociales.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel className="cursor-pointer">
                Cancelar
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={onSalir}
                className="cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Cerrar sesión
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <section className="rounded-3xl border border-hs-borde bg-hs-azul p-6 shadow-card">
        <h2 className="text-lg font-semibold text-hs-foreground">
          Encargado del control de hoy
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-hs-azul-deep">
            <UserRound className="h-7 w-7" />
          </span>

          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-hs-foreground">
              {encargado.nombre}
            </h2>

            <p className="text-sm text-hs-foreground/80">
              Grado {encargado.grado} · Código {encargado.codigo_sis}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-hs-borde bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
            <Clock className="h-5 w-5 text-hs-aqua-deep" />
            Jornada de hoy
          </h3>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              finalizada || !abierto
                ? "bg-hs-lavanda text-hs-foreground"
                : "bg-hs-aqua-deep text-hs-deep-foreground"
            }`}
          >
            {finalizada
              ? "Jornada finalizada"
              : abierto
                ? "Jornada activa"
                : "Fuera del horario"}
          </span>
        </div>

        <p className="mt-3 text-base font-medium capitalize text-card-foreground">
          {fechaLarga(jornada.fecha)}
        </p>

        {!abierto && !finalizada && (
          <p className="mt-3 rounded-2xl bg-hs-lavanda px-4 py-3 text-sm text-hs-foreground">
            El horario configurado por el coordinador ya terminó.
            No se pueden hacer nuevos registros, pero sí puedes finalizar la jornada.
          </p>
        )}

        {finalizada && (
          <p className="mt-3 rounded-2xl bg-hs-lavanda px-4 py-3 text-sm text-hs-foreground">
            Esta jornada ya fue finalizada. No se pueden realizar nuevos
            registros.
          </p>
        )}

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-hs-azul px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-hs-foreground/70">
              Hora de inicio
            </dt>
            <dd className="mt-1 text-lg font-semibold text-hs-foreground">
              {formatoHora12(horario.hora_inicio)}
            </dd>
          </div>

          <div className="rounded-2xl bg-hs-aqua px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-hs-foreground/70">
              Puntual hasta
            </dt>
            <dd className="mt-1 text-lg font-semibold text-hs-foreground">
              {formatoHora12(horario.hora_puntual_hasta)}
            </dd>
          </div>

          <div className="rounded-2xl bg-hs-lavanda px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-hs-foreground/70">
              Llegada tarde desde
            </dt>
            <dd className="mt-1 text-lg font-semibold text-hs-foreground">
              {formatoHora12(horario.hora_tarde_desde)}
            </dd>
          </div>

          <div className="rounded-2xl bg-hs-azul px-4 py-3">
            <dt className="text-xs font-semibold uppercase text-hs-foreground/70">
              Hora de finalización
            </dt>
            <dd className="mt-1 text-lg font-semibold text-hs-foreground">
              {formatoHora12(horario.hora_fin)}
            </dd>
          </div>
        </dl>

        <Button
          onClick={() => void onFinalizar()}
          disabled={!puedeFinalizar}
          size="lg"
          className="mt-5 h-12 w-full cursor-pointer disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="h-4 w-4" />

          {finalizada
            ? "Jornada finalizada"
            : abierto
              ? "Finalizar jornada (1 hora social)"
              : "Finalizar jornada (1 hora social)"}
        </Button>
      </section>
    </div>
  );
}