import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  faltaInput,
  fechaHoyColombia,
  normalizarTexto,
  ordenarGrados,
  FALTA_LABELS,
} from "./scai-schemas";
import { buscarInput } from "./scai-schemas";
import type {
  EstudianteHistorial,
  EstudianteOpcion,
  EstudiantePublico,
  FaltaTipo,
} from "./scai-schemas";

const COLUMNAS = "id, codigo_sis, nombre, grado, genero, identificacion, tipo_id, activo";

function limpiar(texto: string) {
  return normalizarTexto(texto).replace(/[%,()]/g, "");
}

/** Lista todos los grados reales, paginando para no perder registros (Supabase limita a 1000 filas). */
async function gradosReales(client: {
  from: (t: string) => {
    select: (c: string) => { order: (c: string) => { range: (a: number, b: number) => Promise<{ data: { grado: string }[] | null }> } };
  };
}) {
  const grados = new Set<string>();
  for (let page = 0; page < 20; page += 1) {
    const { data } = await client.from("estudiantes").select("grado").order("grado").range(page * 1000, page * 1000 + 999);
    const filas = data ?? [];
    for (const f of filas) if (f.grado) grados.add(f.grado);
    if (filas.length < 1000) break;
  }
  return ordenarGrados(Array.from(grados));
}

export const listarGradosPublicos = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return gradosReales(supabaseAdmin as never);
});

async function buscarPorCodigo(codigo: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const t = limpiar(codigo);
  const { data: filas, error } = await supabaseAdmin
    .from("estudiantes")
    .select(COLUMNAS)
    .or(`codigo_norm.eq.${t},identificacion_norm.eq.${t}`)
    .limit(1);

  if (!error && filas?.[0]) return filas[0];

  // Older databases may not have the generated normalized columns yet.
  // Keep code and document lookup working while those migrations are applied.
  const valorOriginal = codigo.trim();
  const porCodigo = await supabaseAdmin
    .from("estudiantes")
    .select(COLUMNAS)
    .ilike("codigo_sis", valorOriginal)
    .limit(1);
  if (porCodigo.error) throw new Error("No se pudo consultar la base de datos");
  if (porCodigo.data?.[0]) return porCodigo.data[0];

  const porIdentificacion = await supabaseAdmin
    .from("estudiantes")
    .select(COLUMNAS)
    .ilike("identificacion", valorOriginal)
    .limit(1);
  if (porIdentificacion.error) throw new Error("No se pudo consultar la base de datos");
  return porIdentificacion.data?.[0] ?? null;
}

async function detalle(est: {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
  identificacion: string | null;
  tipo_id: string | null;
}): Promise<EstudiantePublico> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: faltas, error } = await supabaseAdmin
    .from("faltas")
    .select("id, tipo, fecha, created_at, observacion")
    .eq("estudiante_id", est.id)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error("No se pudo consultar el historial del estudiante");

  const hoy = fechaHoyColombia();
  const llegada = (faltas ?? []).filter((f) => f.tipo === "llegada_tarde").length;
  const uniforme = (faltas ?? []).filter((f) => f.tipo === "mal_uniforme").length;
  const faltasHoy = (faltas ?? []).filter((f) => f.fecha === hoy).map((f) => f.tipo as FaltaTipo);
  const historial: EstudianteHistorial[] = (faltas ?? []).map((f) => ({
    id: f.id,
    fecha: f.fecha,
    hora: f.created_at,
    tipo: f.tipo as FaltaTipo,
    observacion: f.observacion,
  }));

  return {
    id: est.id,
    codigo_sis: est.codigo_sis,
    nombre: est.nombre,
    grado: est.grado,
    genero: est.genero,
    identificacion: est.identificacion,
    tipo_id: est.tipo_id,
    faltas: { llegada_tarde: llegada, mal_uniforme: uniforme, total: llegada + uniforme },
    faltasHoy: Array.from(new Set(faltasHoy)),
    historial,
    asistenciaHoy: false,
  };
}

/** Búsqueda flexible: código, identificación, nombre, apellido, nombre + apellido y/o grado. */
export const buscarEstudiantes = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ q: z.string().trim().max(80).optional(), grado: z.string().trim().max(30).optional() })
      .refine((v) => Boolean((v.q && v.q.length > 0) || v.grado), { message: "Escribe un dato o elige un grado" })
      .parse(data),
  )
  .handler(async ({ data }): Promise<EstudianteOpcion[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("estudiantes").select(COLUMNAS).order("nombre").limit(40);

    if (data.grado) query = query.eq("grado", data.grado);

    for (const token of limpiar(data.q ?? "").split(" ").filter(Boolean)) {
      query = query.or(
        `nombre_norm.ilike.%${token}%,codigo_norm.ilike.%${token}%,identificacion_norm.ilike.%${token}%`,
      );
    }

    const { data: filas, error } = await query;
    if (error) throw new Error("No se pudo consultar la base de datos");
    return (filas ?? []).map((f) => ({
      id: f.id,
      codigo_sis: f.codigo_sis,
      nombre: f.nombre,
      grado: f.grado,
      identificacion: f.identificacion,
    }));
  });

export const obtenerEstudiante = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<EstudiantePublico | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: filas } = await supabaseAdmin.from("estudiantes").select(COLUMNAS).eq("id", data.id).limit(1);
    const est = filas?.[0];
    return est ? detalle(est) : null;
  });

export const buscarEstudiante = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => buscarInput.parse(data))
  .handler(async ({ data }): Promise<EstudiantePublico | null> => {
    const est = await buscarPorCodigo(data.codigo);
    return est ? detalle(est) : null;
  });

export const registrarFaltas = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => faltaInput.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const est = await buscarPorCodigo(data.codigo);
    if (!est) return { ok: false as const, error: "Estudiante no encontrado" };

    const fecha = data.fecha ?? fechaHoyColombia();
    const created_at = data.hora ?? new Date().toISOString();

    // Validación con datos reales: una sola falta de cada tipo por estudiante y día
    const { data: existentes, error: existentesError } = await supabaseAdmin
      .from("faltas")
      .select("tipo")
      .eq("estudiante_id", est.id)
      .eq("fecha", fecha);
    if (existentesError) {
      return { ok: false as const, error: "No se pudo validar el historial del estudiante" };
    }

    const yaRegistradas = new Set((existentes ?? []).map((f) => f.tipo as FaltaTipo));
    const nuevas = data.tipos.filter((t) => !yaRegistradas.has(t));
    const duplicadas = data.tipos.filter((t) => yaRegistradas.has(t));

    if (nuevas.length === 0) {
      return {
        ok: false as const,
        error:
          duplicadas.length === 1
            ? `Este estudiante ya tiene registrada la falta "${FALTA_LABELS[duplicadas[0]]}" el día de hoy. El historial anterior se conserva.`
            : "Este estudiante ya tiene registradas estas faltas el día de hoy. El historial anterior se conserva.",
      };
    }

    // El índice único faltas_unicas_por_dia bloquea duplicados simultáneos desde varios dispositivos
    const { error } = await supabaseAdmin
      .from("faltas")
      .upsert(
        nuevas.map((tipo) => ({ estudiante_id: est.id, tipo, fecha, created_at })),
        { onConflict: "estudiante_id,tipo,fecha", ignoreDuplicates: true },
      );

    if (error) return { ok: false as const, error: "No se pudieron guardar las faltas" };
    return {
      ok: true as const,
      fecha,
      hora: created_at,
      estudiante: { nombre: est.nombre, grado: est.grado, codigo_sis: est.codigo_sis },
      registradas: nuevas,
      duplicadas,
      cantidad: nuevas.length,
    };
  });

/** Descarga el directorio completo (datos reales) para permitir el uso sin conexión. */
export const descargarDirectorio = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const hoy = fechaHoyColombia();

  const estudiantes: {
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
  }[] = [];

  for (let page = 0; page < 20; page += 1) {
    const { data, error } = await supabaseAdmin
      .from("estudiantes")
      .select(COLUMNAS)
      .order("nombre")
      .range(page * 1000, page * 1000 + 999);
    if (error) throw new Error("No se pudo descargar el directorio");
    const filas = data ?? [];
    for (const f of filas) {
      estudiantes.push({
        id: f.id,
        codigo_sis: f.codigo_sis,
        nombre: f.nombre,
        grado: f.grado,
        genero: f.genero,
        identificacion: f.identificacion,
        tipo_id: f.tipo_id,
        llegada_tarde: 0,
        mal_uniforme: 0,
        faltasHoy: [],
      });
    }
    if (filas.length < 1000) break;
  }

  const indice = new Map(estudiantes.map((e) => [e.id, e]));
  for (let page = 0; page < 60; page += 1) {
    const { data } = await supabaseAdmin
      .from("faltas")
      .select("estudiante_id, tipo, fecha")
      .range(page * 1000, page * 1000 + 999);
    const filas = data ?? [];
    for (const f of filas) {
      const e = indice.get(f.estudiante_id);
      if (!e) continue;
      if (f.tipo === "llegada_tarde") e.llegada_tarde += 1;
      if (f.tipo === "mal_uniforme") e.mal_uniforme += 1;
      if (f.fecha === hoy && !e.faltasHoy.includes(f.tipo as FaltaTipo)) e.faltasHoy.push(f.tipo as FaltaTipo);
    }
    if (filas.length < 1000) break;
  }

  return { actualizado: new Date().toISOString(), fecha: hoy, estudiantes };
});
