// Consultas y registros del panel CONTROL ESCOLAR / HORAS SOCIALES.
// Todo pasa por funciones seguras de la base de datos que exigen un token de
// sesión válido: sin sesión no se devuelve ni un solo dato de un estudiante.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rpcPanel } from "./db.server";
import { faltaInput, ordenarGrados, FALTA_LABELS } from "./scai-schemas";
import type { EstudianteOpcion, EstudiantePublico, FaltaTipo } from "./scai-schemas";

const token = z.string().uuid({ message: "Tu sesión terminó. Vuelve a ingresar." });

type FilaEstudiante = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  identificacion: string | null;
};

type FilaDetalle = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
  identificacion: string | null;
  tipo_id: string | null;
  llegada_tarde: number;
  mal_uniforme: number;
  faltasHoy: FaltaTipo[];
};

function aPublico(f: FilaDetalle): EstudiantePublico {
  return {
    id: f.id,
    codigo_sis: f.codigo_sis,
    nombre: f.nombre,
    grado: f.grado,
    genero: f.genero,
    identificacion: f.identificacion,
    tipo_id: f.tipo_id,
    faltas: {
      llegada_tarde: Number(f.llegada_tarde ?? 0),
      mal_uniforme: Number(f.mal_uniforme ?? 0),
      total: Number(f.llegada_tarde ?? 0) + Number(f.mal_uniforme ?? 0),
    },
    faltasHoy: Array.from(new Set(f.faltasHoy ?? [])),
    asistenciaHoy: false,
  };
}

export const listarGradosPublicos = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token }).parse(data))
  .handler(async ({ data }) => {
    const filas = await rpcPanel<string[] | { panel_grados: string }[]>("panel_grados", { p_token: data.token });
    const valores = (filas ?? []).map((f) => (typeof f === "string" ? f : f.panel_grados)).filter(Boolean);
    return ordenarGrados(Array.from(new Set(valores)));
  });

export const buscarEstudiantes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token,
        q: z.string().trim().max(80).optional(),
        grado: z.string().trim().max(30).optional(),
      })
      .refine((v) => Boolean((v.q && v.q.length > 0) || v.grado), { message: "Escribe un dato o elige un grado" })
      .parse(data),
  )
  .handler(async ({ data }): Promise<EstudianteOpcion[]> => {
    const filas = await rpcPanel<FilaEstudiante[]>("panel_buscar_estudiantes", {
      p_token: data.token,
      p_q: data.q ?? "",
      p_grado: data.grado ?? null,
    });
    return filas ?? [];
  });

export const obtenerEstudiante = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token, id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<EstudiantePublico | null> => {
    const fila = await rpcPanel<FilaDetalle | null>("panel_estudiante", { p_token: data.token, p_id: data.id });
    return fila ? aPublico(fila) : null;
  });

export const registrarFaltas = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => faltaInput.extend({ token }).parse(data))
  .handler(async ({ data }) => {
    type Respuesta = {
      ok: boolean;
      error?: string;
      fecha?: string;
      hora?: string;
      registradas?: FaltaTipo[];
      duplicadas?: FaltaTipo[];
      estudiante?: { nombre: string; grado: string; codigo_sis: string };
    };

    const res = await rpcPanel<Respuesta>("panel_registrar_faltas", {
      p_token: data.token,
      p_codigo: data.codigo,
      p_tipos: data.tipos,
      p_fecha: data.fecha ?? null,
      p_hora: data.hora ?? null,
      p_jornada_id: data.jornada_id ?? null,
    });

    if (!res?.ok) {
      const dup = (res?.duplicadas ?? []) as FaltaTipo[];
      return {
        ok: false as const,
        error:
          dup.length === 1
            ? `Este estudiante ya tiene registrada la falta "${FALTA_LABELS[dup[0]]}" el día de hoy. El historial anterior se conserva.`
            : (res?.error ?? "No se pudo guardar el registro"),
      };
    }

    const registradas = (res.registradas ?? []) as FaltaTipo[];
    return {
      ok: true as const,
      fecha: res.fecha!,
      hora: res.hora!,
      estudiante: res.estudiante!,
      registradas,
      duplicadas: (res.duplicadas ?? []) as FaltaTipo[],
      cantidad: registradas.length,
    };
  });

/** Descarga el directorio completo (datos reales) para permitir el uso sin conexión. */
export const descargarDirectorio = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token }).parse(data))
  .handler(async ({ data }) => {
    type Fila = {
      id: string;
      codigo_sis: string;
      nombre: string;
      grado: string;
      genero: string | null;
      identificacion: string | null;
      tipo_id: string | null;
      llegada_tarde: number;
      mal_uniforme: number;
      faltas_hoy: FaltaTipo[];
    };

    const filas = await rpcPanel<Fila[]>("panel_directorio", { p_token: data.token });
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());

    return {
      actualizado: new Date().toISOString(),
      fecha: hoy,
      estudiantes: (filas ?? []).map((f) => ({
        id: f.id,
        codigo_sis: f.codigo_sis,
        nombre: f.nombre,
        grado: f.grado,
        genero: f.genero,
        identificacion: f.identificacion,
        tipo_id: f.tipo_id,
        llegada_tarde: Number(f.llegada_tarde ?? 0),
        mal_uniforme: Number(f.mal_uniforme ?? 0),
        faltasHoy: f.faltas_hoy ?? [],
      })),
    };
  });
