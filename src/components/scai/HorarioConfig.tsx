import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlarmClock, Clock, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  guardarHorario,
  obtenerHorarioCoordinador,
} from "@/lib/coordinador.functions";
import { formatoHora12 } from "@/lib/jornada-schemas";

function corta(hora: string) {
  return hora.slice(0, 5);
}

function minutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function HorarioConfig() {
  const obtener = useServerFn(obtenerHorarioCoordinador);
  const guardar = useServerFn(guardarHorario);
  const qc = useQueryClient();

  const horarioQuery = useQuery({
    queryKey: ["horario-control"],
    queryFn: () => obtener({ data: undefined }),
  });

  const [inicio, setInicio] = useState("06:00");
  const [puntual, setPuntual] = useState("06:00");
  const [tarde, setTarde] = useState("06:00");
  const [fin, setFin] = useState("19:00");

  useEffect(() => {
    const h = horarioQuery.data;

    if (!h) return;

    setInicio(corta(h.hora_inicio));
    setPuntual(corta(h.hora_puntual_hasta));
    setTarde(corta(h.hora_tarde_desde));
    setFin(corta(h.hora_fin));
  }, [horarioQuery.data]);

  const mutacion = useMutation({
    mutationFn: async () => {
      /*
       * Validamos el orden del horario antes de enviarlo.
       *
       * Inicio <= puntual <= tarde <= finalización
       */
      const inicioMin = minutos(inicio);
      const puntualMin = minutos(puntual);
      const tardeMin = minutos(tarde);
      const finMin = minutos(fin);

      if (inicioMin > puntualMin) {
        return {
          ok: false as const,
          error:
            "La hora de inicio no puede ser posterior a la hora de puntualidad.",
        };
      }

      if (puntualMin > tardeMin) {
        return {
          ok: false as const,
          error:
            "La hora de puntualidad no puede ser posterior al inicio de la llegada tarde.",
        };
      }

      if (tardeMin > finMin) {
        return {
          ok: false as const,
          error:
            "La hora de llegada tarde no puede ser posterior a la hora de finalización.",
        };
      }

      return guardar({
        data: {
          hora_inicio: inicio,
          hora_puntual_hasta: puntual,
          hora_tarde_desde: tarde,
          hora_fin: fin,
        },
      });
    },

    onSuccess: async (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }

      /*
       * IMPORTANTE:
       * Volvemos a consultar la base de datos inmediatamente
       * después de guardar.
       */
      try {
        const actualizado = await obtener({
          data: undefined,
        });

        /*
         * Actualizamos los campos del formulario con lo que
         * realmente quedó guardado en Supabase.
         */
        setInicio(corta(actualizado.hora_inicio));
        setPuntual(corta(actualizado.hora_puntual_hasta));
        setTarde(corta(actualizado.hora_tarde_desde));
        setFin(corta(actualizado.hora_fin));

        /*
         * Actualizamos también la caché de React Query.
         */
        qc.setQueryData(["horario-control"], actualizado);

        /*
         * Finalmente hacemos una invalidación para que cualquier
         * otra parte del panel que use este horario se actualice.
         */
        await qc.invalidateQueries({
          queryKey: ["horario-control"],
        });
        await qc.invalidateQueries({ queryKey: ["horas-sociales"] });

        toast.success("Horario de control actualizado correctamente");
      } catch {
        toast.error(
          "El horario se guardó, pero no se pudo actualizar la vista.",
        );
      }
    },

    onError: () => {
      toast.error("No se pudo guardar el horario");
    },
  });

  return (
    <section className="space-y-5">
      <div className="rounded-3xl bg-jornada p-6 shadow-float">
        <h2 className="flex items-center gap-2 text-2xl font-extrabold uppercase tracking-tight">
          <AlarmClock className="h-7 w-7" />
          Configuración y control de jornada
        </h2>

        <p className="mt-2 text-base font-semibold opacity-90">
          Estas horas se aplican automáticamente al estudiante encargado del
          control.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Inicio del control", inicio],
            ["Puntual hasta", puntual],
            ["Llegada tarde desde", tarde],
            ["Finalización", fin],
          ].map(([titulo, valor]) => (
            <div
              key={titulo}
              className="rounded-2xl bg-black/25 p-4"
            >
              <p className="text-xs font-bold uppercase tracking-widest opacity-90">
                {titulo}
              </p>

              <p className="mt-1 text-xl font-extrabold">
                {formatoHora12(valor)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border/60 bg-pastel-lavender p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-lg font-bold text-pastel-foreground">
          <Clock className="h-5 w-5" />
          Editar horario
        </h3>

        <form
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();

            if (!mutacion.isPending) {
              mutacion.mutate();
            }
          }}
        >
          <div>
            <Label htmlFor="hora-inicio">
              Hora de inicio del control
            </Label>

            <Input
              id="hora-inicio"
              type="time"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              required
              className="mt-1 h-11 bg-background"
            />
          </div>

          <div>
            <Label htmlFor="hora-puntual">
              Puntual hasta
            </Label>

            <Input
              id="hora-puntual"
              type="time"
              value={puntual}
              onChange={(e) => setPuntual(e.target.value)}
              required
              className="mt-1 h-11 bg-background"
            />
          </div>

          <div>
            <Label htmlFor="hora-tarde">
              Llegada tarde desde
            </Label>

            <Input
              id="hora-tarde"
              type="time"
              value={tarde}
              onChange={(e) => setTarde(e.target.value)}
              required
              className="mt-1 h-11 bg-background"
            />
          </div>

          <div>
            <Label htmlFor="hora-fin">
              Finalización del control
            </Label>

            <Input
              id="hora-fin"
              type="time"
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              required
              className="mt-1 h-11 bg-background"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full sm:w-56"
              disabled={mutacion.isPending}
            >
              {mutacion.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}

              {mutacion.isPending
                ? "Guardando..."
                : "Guardar horario"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
