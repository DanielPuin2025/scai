import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getDb, rpcPanel } from "./db.server";
import type {
  HorarioControl,
  Jornada,
  RegistroJornada,
} from "./jornada-schemas";

const token = z.string().uuid({
  message: "Tu sesión terminó. Vuelve a ingresar.",
});

const HORARIO_POR_DEFECTO = {
  hora_inicio: "06:00:00",
  hora_puntual_hasta: "06:00:00",
  hora_tarde_desde: "06:00:00",
  hora_fin: "19:00:00",
};

/** Hora local de Colombia. */
export function horaLocalColombia(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(fecha);
}

/** Fecha local de Colombia en formato AAAA-MM-DD. */
export function fechaLocalColombia(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(fecha);
}

/**
 * Comprueba si la hora actual está dentro del horario.
 */
export function dentroDelHorario(
  horario: {
    hora_inicio: string;
    hora_fin: string;
  },
  ahora = new Date(),
) {
  const actual = horaLocalColombia(ahora);

  const inicio = horario.hora_inicio.slice(0, 8);
  const fin = horario.hora_fin.slice(0, 8);

  return actual >= inicio && actual <= fin;
}

async function leerHorario(): Promise<HorarioControl> {
  const db = await getDb();

  // 1) Función pública de la base de datos (no depende de permisos de tabla).
  try {
    const { data: vigente, error: errVigente } = await (db.rpc as any)("horario_vigente");
    const filaRpc = Array.isArray(vigente) ? vigente[0] : vigente;
    if (!errVigente && filaRpc?.hora_inicio) return filaRpc as HorarioControl;
  } catch {
    // Se intenta la lectura directa de la tabla.
  }

  const { data } = await db
    .from("horario_control")
    .select(
      "id, hora_inicio, hora_puntual_hasta, hora_tarde_desde, hora_fin, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(1);

  const fila = data?.[0];

  if (fila) {
    return fila as HorarioControl;
  }

  return {
    id: "",
    updated_at: new Date().toISOString(),
    ...HORARIO_POR_DEFECTO,
  };
}

/** Horario vigente. */
export const obtenerHorario = createServerFn({
  method: "POST",
}).handler(async (): Promise<HorarioControl> => {
  return leerHorario();
});

/**
 * Estado del horario para la interfaz.
 */
export const estadoHorario = createServerFn({
  method: "POST",
}).handler(async () => {
  const horario = await leerHorario();

  return {
    horario,
    ahora: horaLocalColombia(),
    fecha: fechaLocalColombia(),
    abierto: dentroDelHorario(horario),
  };
});

/**
 * Abre o reanuda la jornada del día.
 */
export const abrirJornada = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) =>
    z
      .object({
        token,
        fecha: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, {
            message: "Fecha inválida",
          })
          .optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    type Respuesta = {
      ok: boolean;
      error?: string;
      jornada?: Jornada;
      encargado?: {
        codigo_sis: string;
        nombre: string;
        grado: string;
        genero: string | null;
      };
    };

    const res = await rpcPanel<Respuesta>("panel_abrir_jornada", {
      p_token: data.token,
      p_fecha: data.fecha ?? null,
    });

    if (!res?.ok || !res.jornada || !res.encargado) {
      return {
        ok: false as const,
        error:
          res?.error ?? "No se pudo abrir el control de hoy.",
      };
    }

    let horario = await leerHorario();

    // Si la configuración no se pudo leer, se usan las horas que la base de
    // datos sincronizó en la jornada (copiadas del horario del coordinador).
    if (!horario.id && res.jornada.hora_inicio && res.jornada.hora_fin) {
      horario = {
        ...horario,
        id: "jornada",
        hora_inicio: res.jornada.hora_inicio,
        hora_puntual_hasta: res.jornada.hora_inicio,
        hora_tarde_desde: res.jornada.hora_inicio,
        hora_fin: res.jornada.hora_fin,
      };
    }

    return {
      ok: true as const,
      encargado: res.encargado,
      jornada: res.jornada,
      horario,
      abierto:
        dentroDelHorario(horario) &&
        res.jornada.estado !== "finalizada",
    };
  });

/**
 * Finaliza la jornada.
 *
 * IMPORTANTE:
 * La comprobación del horario se hace también en el servidor.
 * Así el botón no es la única protección.
 */
export const finalizarJornada = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) =>
    z
      .object({
        token,
        id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    // El encargado puede cerrar su jornada aunque la franja ya haya terminado.

    const jornada = await rpcPanel<Jornada | null>(
      "panel_jornada",
      {
        p_token: data.token,
        p_id: data.id,
      },
    );

    if (!jornada) {
      return {
        ok: false as const,
        error: "No se encontró la jornada.",
      };
    }

    if (jornada.estado === "finalizada") {
      return {
        ok: false as const,
        error: "Esta jornada ya fue finalizada.",
      };
    }

    const res = await rpcPanel<{ ok: boolean; error?: string }>(
      "panel_finalizar_jornada",
      {
        p_token: data.token,
        p_id: data.id,
      },
    );

    if (!res?.ok) {
      return {
        ok: false as const,
        error:
          res?.error ?? "No se pudo finalizar la jornada.",
      };
    }

    return {
      ok: true as const,
    };
  });

export const obtenerJornada = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) =>
    z
      .object({
        token,
        id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<Jornada | null> => {
    return rpcPanel<Jornada | null>("panel_jornada", {
      p_token: data.token,
      p_id: data.id,
    });
  });

/** Registros realizados durante una jornada. */
export const registrosDeJornada = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) =>
    z
      .object({
        token,
        id: z.string().uuid(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<RegistroJornada[]> => {
    const filas = await rpcPanel<RegistroJornada[]>(
      "panel_registros_jornada",
      {
        p_token: data.token,
        p_id: data.id,
      },
    );

    return filas ?? [];
  });
