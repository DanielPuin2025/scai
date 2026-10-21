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

      <section className="rounded-3xl border-2 border-sky-200 bg-sky-50/80 p-6 shadow-card sm:p-7 dark:border-sky-800/60 dark:bg-sky-950/40">
        <h2 className="text-xl font-extrabold text-sky-950 dark:text-sky-100">
          Encargado del control de hoy
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-200/80 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200">
            <UserRound className="h-7 w-7" />
          </span>

          <div className="min-w-0">
            <h2 className="text-2xl font-extrabold text-sky-950 dark:text-sky-100">
              {encargado.nombre}
            </h2>

            <p className="text-base font-semibold text-sky-800 dark:text-sky-200">
              Grado {encargado.grado} · Código {encargado.codigo_sis}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border-2 border-violet-200 bg-violet-50/80 p-6 shadow-card sm:p-7 dark:border-violet-800/60 dark:bg-violet-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-2xl font-extrabold text-violet-950 dark:text-violet-100">
            <Clock className="h-6 w-6 text-violet-700 dark:text-violet-300" />
            Jornada de hoy
          </h3>

          <span
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              finalizada || !abierto
                ? "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                : "bg-emerald-200 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-100"
            }`}
          >
            {finalizada
              ? "Jornada finalizada"
              : abierto
                ? "Jornada activa"
                : "Fuera del horario"}
          </span>
        </div>

        <p className="mt-4 text-lg font-bold capitalize text-violet-950 dark:text-violet-100">
          {fechaLarga(jornada.fecha)}
        </p>

        {!abierto && !finalizada && (
          <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3 text-base font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
            El horario configurado por el coordinador ya terminó.
            No se pueden hacer nuevos registros, pero sí puedes finalizar la jornada.
          </p>
        )}

        {finalizada && (
          <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-100/80 px-4 py-3 text-base font-medium text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-100">
            Esta jornada ya fue finalizada. No se pueden realizar nuevos
            registros.
          </p>
        )}

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sky-300 bg-sky-100 px-5 py-4 dark:border-sky-800 dark:bg-sky-900/50">
            <dt className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Hora de inicio
            </dt>
            <dd className="mt-1.5 text-2xl font-extrabold text-slate-950 dark:text-slate-100">
              {formatoHora12(horario.hora_inicio)}
            </dd>
          </div>

          <div className="rounded-2xl border border-teal-300 bg-teal-100 px-5 py-4 dark:border-teal-800 dark:bg-teal-900/50">
            <dt className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Puntual hasta
            </dt>
            <dd className="mt-1.5 text-2xl font-extrabold text-slate-950 dark:text-slate-100">
              {formatoHora12(horario.hora_puntual_hasta)}
            </dd>
          </div>

          <div className="rounded-2xl border border-purple-300 bg-purple-100 px-5 py-4 dark:border-purple-800 dark:bg-purple-900/50">
            <dt className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Llegada tarde desde
            </dt>
            <dd className="mt-1.5 text-2xl font-extrabold text-slate-950 dark:text-slate-100">
              {formatoHora12(horario.hora_tarde_desde)}
            </dd>
          </div>

          <div className="rounded-2xl border border-indigo-300 bg-indigo-100 px-5 py-4 dark:border-indigo-800 dark:bg-indigo-900/50">
            <dt className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
              Hora de finalización
            </dt>
            <dd className="mt-1.5 text-2xl font-extrabold text-slate-950 dark:text-slate-100">
              {formatoHora12(horario.hora_fin)}
            </dd>
          </div>
        </dl>

        <Button
          onClick={() => void onFinalizar()}
          disabled={!puedeFinalizar}
          size="lg"
          className="mt-6 h-14 w-full cursor-pointer bg-indigo-700 text-lg font-extrabold text-white shadow-md hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-400 dark:bg-indigo-600 dark:hover:bg-indigo-500"
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