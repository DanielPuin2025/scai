// src/lib/asignaciones.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizarTexto } from "./scai-schemas";
import { numeroGrado, ordenarGrados } from "./grados";
import { FUNCIONES, type FuncionEncargado } from "./encargado-schemas";

export const GRADOS_ASIGNABLES = [6, 7, 8, 9, 10, 11] as const;

export type GrupoGrado = { numero: number; grupos: string[] };

export type AsignacionFila = {
  id: string;
  funcion: FuncionEncargado;
  activa: boolean;
  created_at: string;
  finalizada_at: string | null;
  estudiante: { id: string; codigo_sis: string; nombre: string; grado: string };
  horas: number;
};

export type FichaEncargado = {
  estudiante: {
    id: string;
    codigo_sis: string;
    nombre: string;
    grado: string;
    genero: string | null;
    tipo_id: string | null;
    identificacion: string | null;
    activo: boolean;
  };
  horas_total: number;
  asignaciones: { id: string; funcion: FuncionEncargado; activa: boolean; created_at: string; finalizada_at: string | null }[];
  jornadas: { id: string; fecha: string; estado: string; funcion: string | null; acreditada: boolean }[];
};

export type CandidatoAsignacion = { id: string; codigo_sis: string; nombre: string; grado: string };

type Rpc = (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
function rpc(supabase: unknown): Rpc {
  const client = supabase as { rpc: Rpc };
  return client.rpc.bind(client) as Rpc;
}
function error(e: { message: string } | null) {
  if (!e) return;
  if (e.message.includes("no_autorizado")) throw new Error("No tienes permisos de coordinador.");
  throw new Error("No se pudo completar la operación. Intenta de nuevo.");
}

export const gradosAsignacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GrupoGrado[]> => {
    const porNumero = new Map<number, Set<string>>();

    // Se recorre en páginas de 1000 filas porque Supabase limita a 1000 registros por consulta
    for (let page = 0; page < 20; page++) {
      const { data, error: err } = await context.supabase
        .from("estudiantes")
        .select("grado")
        .eq("activo", true)
        .range(page * 1000, page * 1000 + 999);

      if (err) break;
      const filas = data ?? [];

      for (const fila of filas) {
        const n = numeroGrado(fila.grado);
        if (n === null || n < 6 || n > 11) continue;
        if (!porNumero.has(n)) porNumero.set(n, new Set());
        porNumero.get(n)!.add(fila.grado);
      }

      if (filas.length < 1000) break;
    }

    return GRADOS_ASIGNABLES.map((numero) => ({
      numero,
      grupos: ordenarGrados([...(porNumero.get(numero) ?? [])]),
    }));
  });

export const buscarParaAsignar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        q: z.string().trim().max(80).optional(),
        grupos: z.array(z.string().trim().max(30)).max(100).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<CandidatoAsignacion[]> => {
    let query = context.supabase
      .from("estudiantes")
      .select("id, codigo_sis, nombre, grado")
      .eq("activo", true)
      .order("nombre")
      .limit(60);

    const palabras = normalizarTexto(data.q ?? "")
      .replace(/[%,()*]/g, "")
      .split(" ")
      .filter(Boolean);

    for (const p of palabras) {
      query = query.or(`nombre_norm.ilike.%${p}%,codigo_norm.ilike.%${p}%,identificacion_norm.ilike.%${p}%`);
    }

    if (data.grupos && data.grupos.length > 0) {
      query = query.in("grado", data.grupos);
    }

    const { data: filas, error: e } = await query;
    if (e) throw new Error("No se pudo buscar estudiantes.");
    return (filas ?? []) as CandidatoAsignacion[];
  });

export const listarAsignaciones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ estado: z.enum(["vigentes", "finalizadas", "todas"]) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<AsignacionFila[]> => {
    const { data: filas, error: e } = await rpc(context.supabase)("admin_listar_asignaciones", {
      p_estado: data.estado,
    });
    error(e);
    return (filas ?? []) as AsignacionFila[];
  });

export const crearAsignacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ estudiante_id: z.string().uuid(), funcion: z.enum(FUNCIONES) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: res, error: e } = await rpc(context.supabase)("admin_crear_asignacion", {
      p_estudiante_id: data.estudiante_id,
      p_funcion: data.funcion,
    });
    error(e);
    return res as { ok: true; id: string } | { ok: false; error: string };
  });

export const finalizarAsignacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error: e } = await rpc(context.supabase)("admin_finalizar_asignacion", { p_id: data.id });
    error(e);
    return res as { ok: true } | { ok: false; error: string };
  });

export const fichaEncargado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ estudiante_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: res, error: e } = await rpc(context.supabase)("admin_ficha_encargado", {
      p_estudiante_id: data.estudiante_id,
    });
    error(e);
    return (res ?? null) as FichaEncargado | null;
  });
