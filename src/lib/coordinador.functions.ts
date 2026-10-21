import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { codigoSchema, normalizarTexto, ordenarGrados } from "./scai-schemas";
import { normalizarGrado } from "./grados";
import { ANIO_MINIMO } from "./anios";
import { horarioInput, type HorarioControl, type Jornada, type RegistroJornada } from "./jornada-schemas";

function limpiar(texto: string) {
  return normalizarTexto(texto).replace(/[%,()]/g, "");
}

const listarInput = z.object({
  q: z.string().trim().max(80).optional(),
  grado: z.string().trim().max(30).optional(),
  page: z.number().int().min(0).max(500).default(0),
});

const estudianteInput = z.object({
  id: z.string().uuid().optional(),
  codigo_sis: codigoSchema,
  nombre: z.string().trim().min(3, { message: "Nombre requerido" }).max(120),
  grado: z.string().trim().min(1, { message: "Grado requerido" }).max(30),
  tipo_id: z.string().trim().max(10).optional().nullable(),
  identificacion: z.string().trim().max(30).optional().nullable(),
});

export type EstudianteRow = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  tipo_id: string;
  identificacion: string | null;
  activo: boolean;
  faltas: { llegada_tarde: number; mal_uniforme: number; total: number };
};

export const listarEstudiantes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listarInput.parse(data))
  .handler(async ({ data, context }) => {
    const PAGE = 25;
    let query = context.supabase
      .from("estudiantes")
      .select("id, codigo_sis, nombre, grado, tipo_id, identificacion, activo", { count: "exact" })
      .order("nombre", { ascending: true })
      .range(data.page * PAGE, data.page * PAGE + PAGE - 1);

    // Búsqueda real en Supabase sobre columnas normalizadas (sin acentos ni mayúsculas)
    for (const token of limpiar(data.q ?? "").split(" ").filter(Boolean)) {
      query = query.or(
        `nombre_norm.ilike.%${token}%,codigo_norm.ilike.%${token}%,identificacion_norm.ilike.%${token}%`,
      );
    }

    if (data.grado) query = query.eq("grado", data.grado);

    const { data: rows, count, error } = await query;
    if (error) return { rows: [] as EstudianteRow[], count: 0, page: data.page, pageSize: PAGE };

    const base = rows ?? [];
    const ids = base.map((r) => r.id);
    const conteo = new Map<string, { llegada_tarde: number; mal_uniforme: number }>();
    if (ids.length > 0) {
      const { data: faltas } = await context.supabase
        .from("faltas")
        .select("estudiante_id, tipo")
        .in("estudiante_id", ids);
      for (const f of faltas ?? []) {
        const acc = conteo.get(f.estudiante_id) ?? { llegada_tarde: 0, mal_uniforme: 0 };
        if (f.tipo === "llegada_tarde") acc.llegada_tarde += 1;
        else acc.mal_uniforme += 1;
        conteo.set(f.estudiante_id, acc);
      }
    }

    const filas: EstudianteRow[] = base.map((r) => {
      const c = conteo.get(r.id) ?? { llegada_tarde: 0, mal_uniforme: 0 };
      return { ...r, faltas: { ...c, total: c.llegada_tarde + c.mal_uniforme } } as EstudianteRow;
    });

    return { rows: filas, count: count ?? 0, page: data.page, pageSize: PAGE };
  });

export const listarGrados = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Se pagina porque Supabase devuelve máximo 1000 filas y se perdían los grados altos
    const grados = new Set<string>();
    for (let page = 0; page < 20; page += 1) {
      const { data } = await context.supabase
        .from("estudiantes")
        .select("grado")
        .order("grado")
        .range(page * 1000, page * 1000 + 999);
      const filas = data ?? [];
      for (const f of filas) if (f.grado) grados.add(f.grado);
      if (filas.length < 1000) break;
    }
    return ordenarGrados(Array.from(grados));
  });

export const contarEstudiantes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase.from("estudiantes").select("id", { count: "exact", head: true });
    const { count: activos } = await context.supabase
      .from("estudiantes")
      .select("id", { count: "exact", head: true })
      .eq("activo", true);
    return { total: count ?? 0, activos: activos ?? 0 };
  });

export type ResumenGrado = {
  grado: string;
  estudiantes: number;
  faltas: number;
  llegada_tarde: number;
  mal_uniforme: number;
  estudiantesConFaltas: number;
};

export const resumenGrado = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ grado: z.string().trim().min(1).max(30) }).parse(data))
  .handler(async ({ data, context }): Promise<ResumenGrado> => {
    const { data: alumnos } = await context.supabase.from("estudiantes").select("id").eq("grado", data.grado);
    const ids = (alumnos ?? []).map((a) => a.id);
    let llegada = 0;
    let uniforme = 0;
    const conFaltas = new Set<string>();
    if (ids.length > 0) {
      const { data: faltas } = await context.supabase
        .from("faltas")
        .select("estudiante_id, tipo")
        .in("estudiante_id", ids);
      for (const f of faltas ?? []) {
        if (f.tipo === "llegada_tarde") llegada += 1;
        else uniforme += 1;
        conFaltas.add(f.estudiante_id);
      }
    }
    return {
      grado: data.grado,
      estudiantes: ids.length,
      faltas: llegada + uniforme,
      llegada_tarde: llegada,
      mal_uniforme: uniforme,
      estudiantesConFaltas: conFaltas.size,
    };
  });

export const guardarEstudiante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => estudianteInput.parse(data))
  .handler(async ({ data, context }) => {
    const payload = {
      codigo_sis: data.codigo_sis,
      nombre: data.nombre,
      grado: data.grado,
      tipo_id: data.tipo_id || "TI",
      identificacion: data.identificacion || null,
    };


    if (data.id) {
      const { error } = await context.supabase.from("estudiantes").update(payload).eq("id", data.id);
      if (error) return { ok: false as const, error: "No se pudo actualizar el estudiante" };
      return { ok: true as const };
    }

    const { error } = await context.supabase.from("estudiantes").insert(payload);
    if (error) {
      return {
        ok: false as const,
        error: error.code === "23505" ? "Ya existe un estudiante con ese código" : "No se pudo crear el estudiante",
      };
    }
    return { ok: true as const };
  });

/** No se elimina información: el estudiante se archiva (inactivo) conservando todo su historial. */
export const cambiarEstadoEstudiante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid(), activo: z.boolean() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("estudiantes").update({ activo: data.activo }).eq("id", data.id);
    if (error) return { ok: false as const, error: "No se pudo cambiar el estado del estudiante" };
    return { ok: true as const };
  });

/** Cierre de año escolar: archiva a los estudiantes activos sin borrar faltas ni fechas. */
export const cerrarAnioEscolar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ grado: z.string().trim().max(30).optional(), confirmacion: z.literal("ARCHIVAR") }).parse(data),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase.from("estudiantes").update({ activo: false }).eq("activo", true);
    if (data.grado) query = query.eq("grado", data.grado);
    const { data: filas, error } = await query.select("id");
    if (error) return { ok: false as const, error: "No se pudo archivar el año escolar" };
    return { ok: true as const, archivados: (filas ?? []).length };
  });

export type Reporte = {
  totales: { estudiantes: number; llegadaTarde: number; malUniforme: number; total: number };
  porGrado: {
    grado: string;
    estudiantes: number;
    llegada_tarde: number;
    mal_uniforme: number;
    total: number;
    primera_fecha: string | null;
    ultima_fecha: string | null;
  }[];
  porDia: { fecha: string; llegada_tarde: number; mal_uniforme: number }[];
  recientes: { fecha: string; hora: string; tipo: string; nombre: string; grado: string; codigo_sis: string }[];
};

const reporteInput = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dias: z.number().int().min(1).max(365).default(30),
  grado: z.string().trim().max(20).optional(),
  estudiante_id: z.string().uuid().optional(),
  tipo: z.enum(["llegada_tarde", "mal_uniforme"]).optional(),
});

export const obtenerReporte = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => reporteInput.parse(data))
  .handler(async ({ data, context }): Promise<Reporte> => {
    const desde = data.desde ?? new Date(Date.now() - data.dias * 86400000).toISOString().slice(0, 10);
    const hasta = data.hasta ?? new Date().toISOString().slice(0, 10);

    // PostgREST limita cada respuesta (1000 filas): se pagina para contar todos los estudiantes
    const cargarEstudiantes = async () => {
      const todos: { id: string; grado: string }[] = [];
      for (let desdeFila = 0; ; desdeFila += 1000) {
        let q = context.supabase
          .from("estudiantes")
          .select("id, grado")
          .order("id")
          .range(desdeFila, desdeFila + 999);
        if (data.grado) q = q.eq("grado", data.grado);
        const { data: lote } = await q;
        todos.push(...(lote ?? []));
        if (!lote || lote.length < 1000) break;
      }
      return { data: todos };
    };
    const estudiantesQuery = cargarEstudiantes();

    let faltasQuery = context.supabase
      .from("faltas")
      .select("fecha, tipo, created_at, estudiantes:estudiantes!faltas_estudiante_id_fkey!inner(nombre, grado, codigo_sis)")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5000);

    if (data.grado) faltasQuery = faltasQuery.eq("estudiantes.grado", data.grado);
    if (data.estudiante_id) faltasQuery = faltasQuery.eq("estudiante_id", data.estudiante_id);
    if (data.tipo) faltasQuery = faltasQuery.eq("tipo", data.tipo);

    const [estudiantesRes, faltasRes] = await Promise.all([estudiantesQuery, faltasQuery]);

    type FaltaJoin = {
      fecha: string;
      tipo: string;
      created_at: string;
      estudiantes: { nombre: string; grado: string; codigo_sis: string } | null;
    };
    const faltas = (faltasRes.data ?? []) as unknown as FaltaJoin[];
    const estudiantes = (estudiantesRes.data ?? []) as { id: string; grado: string }[];

    const conteoEstudiantes = new Map<string, number>();
    for (const e of estudiantes) {
      conteoEstudiantes.set(e.grado, (conteoEstudiantes.get(e.grado) ?? 0) + 1);
    }

    type GradoAcc = {
      llegada_tarde: number;
      mal_uniforme: number;
      primera_fecha: string | null;
      ultima_fecha: string | null;
    };
    const gradoMap = new Map<string, GradoAcc>();
    const diaMap = new Map<string, { llegada_tarde: number; mal_uniforme: number }>();
    let llegadaTarde = 0;
    let malUniforme = 0;

    for (const f of faltas) {
      if (f.tipo === "llegada_tarde") llegadaTarde += 1;
      else malUniforme += 1;

      const grado = f.estudiantes?.grado ?? "Sin grado";
      const g = gradoMap.get(grado) ?? {
        llegada_tarde: 0,
        mal_uniforme: 0,
        primera_fecha: null,
        ultima_fecha: null,
      };
      const d = diaMap.get(f.fecha) ?? { llegada_tarde: 0, mal_uniforme: 0 };
      if (f.tipo === "llegada_tarde") {
        g.llegada_tarde += 1;
        d.llegada_tarde += 1;
      } else {
        g.mal_uniforme += 1;
        d.mal_uniforme += 1;
      }
      if (!g.primera_fecha || f.fecha < g.primera_fecha) g.primera_fecha = f.fecha;
      if (!g.ultima_fecha || f.fecha > g.ultima_fecha) g.ultima_fecha = f.fecha;
      gradoMap.set(grado, g);
      diaMap.set(f.fecha, d);
    }

    // Incluye grados sin faltas para que el reporte por grado sea completo
    for (const grado of conteoEstudiantes.keys()) {
      if (!gradoMap.has(grado)) {
        gradoMap.set(grado, { llegada_tarde: 0, mal_uniforme: 0, primera_fecha: null, ultima_fecha: null });
      }
    }

    return {
      totales: {
        estudiantes: estudiantes.length,
        llegadaTarde,
        malUniforme,
        total: llegadaTarde + malUniforme,
      },
      porGrado: Array.from(gradoMap, ([grado, v]) => ({
        grado,
        estudiantes: conteoEstudiantes.get(grado) ?? 0,
        llegada_tarde: v.llegada_tarde,
        mal_uniforme: v.mal_uniforme,
        total: v.llegada_tarde + v.mal_uniforme,
        primera_fecha: v.primera_fecha,
        ultima_fecha: v.ultima_fecha,
      })).sort((a, b) => a.grado.localeCompare(b.grado)),
      porDia: Array.from(diaMap, ([fecha, v]) => ({ fecha, ...v })).sort((a, b) => a.fecha.localeCompare(b.fecha)),
      recientes: faltas.slice(0, 200).map((f) => ({
        fecha: f.fecha,
        hora: f.created_at,
        tipo: f.tipo,
        nombre: f.estudiantes?.nombre ?? "—",
        grado: f.estudiantes?.grado ?? "—",
        codigo_sis: f.estudiantes?.codigo_sis ?? "—",
      })),
    };
  });


export type FaltaHistorial = {
  id: string;
  fecha: string;
  hora: string;
  tipo: "llegada_tarde" | "mal_uniforme";
  observacion: string | null;
};

export type ConsultaEstudianteResultado = {
  estudiante: {
    id: string;
    nombre: string;
    codigo_sis: string;
    grado: string;
    tipo_id: string;
    identificacion: string | null;
    genero: string | null;
    activo: boolean;
  };
  totales: { total: number; llegada_tarde: number; mal_uniforme: number };
  historial: FaltaHistorial[];
};

export type ConsultaOpcion = { id: string; nombre: string; codigo_sis: string; grado: string };

export type ConsultaRespuesta =
  | { ok: true; resultado: ConsultaEstudianteResultado }
  | { ok: false; error: string }
  | { ok: "varios"; opciones: ConsultaOpcion[] };

export const consultarEstudiante = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        termino: z.string().trim().max(80).optional(),
        grado: z.string().trim().max(30).optional(),
        id: z.string().uuid().optional(),
      })
      .refine((v) => Boolean(v.id ?? v.grado ?? (v.termino && v.termino.length > 0)), { message: "Dato requerido" })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<ConsultaRespuesta> => {
    const columnas = "id, nombre, codigo_sis, grado, tipo_id, identificacion, genero, activo";
    let filas: ConsultaEstudianteResultado["estudiante"][] | null = null;

    if (data.id) {
      const { data: uno, error } = await context.supabase.from("estudiantes").select(columnas).eq("id", data.id).limit(1);
      if (error) return { ok: false as const, error: "No se pudo consultar la base de datos" };
      filas = uno;
    } else {
      const t = limpiar(data.termino ?? "");
      let busqueda = context.supabase.from("estudiantes").select(columnas).order("nombre").limit(30);
      if (data.grado) busqueda = busqueda.eq("grado", data.grado);
      for (const token of t.split(" ").filter(Boolean)) {
        busqueda = busqueda.or(
          `codigo_norm.ilike.%${token}%,identificacion_norm.ilike.%${token}%,nombre_norm.ilike.%${token}%`,
        );
      }
      const { data: muchos, error } = await busqueda;
      if (error) return { ok: false as const, error: "No se pudo consultar la base de datos" };
      filas = muchos;
      const exacto = (muchos ?? []).find(
        (f) =>
          normalizarTexto(f.codigo_sis ?? "") === t || normalizarTexto(f.identificacion ?? "") === t,
      );
      if (exacto) filas = [exacto];

      else if ((muchos ?? []).length > 1) {
        return {
          ok: "varios" as const,
          opciones: (muchos ?? []).map((f) => ({
            id: f.id,
            nombre: f.nombre,
            codigo_sis: f.codigo_sis,
            grado: f.grado,
          })),
        };
      }
    }

    const est = filas?.[0];
    if (!est) return { ok: false as const, error: "No se encontró ningún estudiante con ese dato" };



    const { data: faltas } = await context.supabase
      .from("faltas")
      .select("id, fecha, tipo, observacion, created_at")
      .eq("estudiante_id", est.id)
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    const historial: FaltaHistorial[] = (faltas ?? []).map((f) => ({
      id: f.id,
      fecha: f.fecha,
      hora: f.created_at,
      tipo: f.tipo as FaltaHistorial["tipo"],
      observacion: f.observacion,
    }));

    return {
      ok: true as const,
      resultado: {
        estudiante: est,
        totales: {
          total: historial.length,
          llegada_tarde: historial.filter((f) => f.tipo === "llegada_tarde").length,
          mal_uniforme: historial.filter((f) => f.tipo === "mal_uniforme").length,
        },
        historial,
      },
    };
  });

export type ObservacionRow = {
  id: string;
  texto: string;
  created_at: string;
  updated_at: string;
};

export const listarObservaciones = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ estudiante_id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<ObservacionRow[]> => {
    const { data: rows } = await context.supabase
      .from("observaciones")
      .select("id, texto, created_at, updated_at")
      .eq("estudiante_id", data.estudiante_id)
      .order("created_at", { ascending: false })
      .limit(200);
    return (rows ?? []) as ObservacionRow[];
  });

export const guardarObservacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        estudiante_id: z.string().uuid(),
        texto: z.string().trim().min(3, { message: "Escribe la observación" }).max(1000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("observaciones")
        .update({ texto: data.texto })
        .eq("id", data.id);
      if (error) return { ok: false as const, error: "No se pudo actualizar la observación" };
      return { ok: true as const };
    }
    const { error } = await context.supabase
      .from("observaciones")
      .insert({ estudiante_id: data.estudiante_id, texto: data.texto, registrado_por: context.userId });
    if (error) return { ok: false as const, error: "No se pudo guardar la observación" };
    return { ok: true as const };
  });

export const eliminarObservacion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("observaciones").delete().eq("id", data.id);
    if (error) return { ok: false as const, error: "No se pudo eliminar la observación" };
    return { ok: true as const };
  });

/* ===== Configuración y control de jornada ===== */

export const obtenerHorarioCoordinador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HorarioControl> => {
    const { data } = await context.supabase
      .from("horario_control")
      .select("id, hora_inicio, hora_puntual_hasta, hora_tarde_desde, hora_fin, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);
    const fila = data?.[0];
    if (fila) return fila as HorarioControl;
    return {
      id: "",
      hora_inicio: "06:00:00",
      hora_puntual_hasta: "06:00:00",
      hora_tarde_desde: "06:00:00",
      hora_fin: "19:00:00",
      updated_at: new Date().toISOString(),
    };
  });

export const guardarHorario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => horarioInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: existente, error: errorConsulta } = await context.supabase
      .from("horario_control")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (errorConsulta) {
      return {
        ok: false as const,
        error: "No se pudo consultar el horario actual",
      };
    }

    const ahora = new Date().toISOString();

    if (existente?.[0]) {
      const { data: actualizado, error } = await context.supabase
        .from("horario_control")
        .update({
          hora_inicio: data.hora_inicio,
          hora_puntual_hasta: data.hora_puntual_hasta,
          hora_tarde_desde: data.hora_tarde_desde,
          hora_fin: data.hora_fin,
          updated_at: ahora,
        })
        .eq("id", existente[0].id)
        .select(
          "id, hora_inicio, hora_puntual_hasta, hora_tarde_desde, hora_fin, updated_at",
        )
        .single();

      if (error || !actualizado) {
        return {
          ok: false as const,
          error: error?.message || "No se pudo guardar el horario",
        };
      }

      const hoy = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Bogota",
      }).format(new Date());
      const { error: errorSincronizacion } = await context.supabase
        .from("jornadas")
        .update({
          hora_inicio: data.hora_inicio,
          hora_fin: data.hora_fin,
        })
        .eq("fecha", hoy)
        .eq("estado", "activa");

      if (errorSincronizacion) {
        return {
          ok: false as const,
          error:
            "El horario se guardó, pero no se pudo sincronizar con la jornada de hoy",
        };
      }

      return {
        ok: true as const,
        horario: actualizado as HorarioControl,
      };
    }

    const { data: nuevo, error } = await context.supabase
      .from("horario_control")
      .insert({
        hora_inicio: data.hora_inicio,
        hora_puntual_hasta: data.hora_puntual_hasta,
        hora_tarde_desde: data.hora_tarde_desde,
        hora_fin: data.hora_fin,
        updated_at: ahora,
      })
      .select(
        "id, hora_inicio, hora_puntual_hasta, hora_tarde_desde, hora_fin, updated_at",
      )
      .single();

    if (error || !nuevo) {
      return {
        ok: false as const,
        error: error?.message || "No se pudo crear el horario",
      };
    }

    const hoy = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
    }).format(new Date());
    const { error: errorSincronizacion } = await context.supabase
      .from("jornadas")
      .update({
        hora_inicio: data.hora_inicio,
        hora_fin: data.hora_fin,
      })
      .eq("fecha", hoy)
      .eq("estado", "activa");

    if (errorSincronizacion) {
      return {
        ok: false as const,
        error:
          "El horario se guardó, pero no se pudo sincronizar con la jornada de hoy",
      };
    }

    return {
      ok: true as const,
      horario: nuevo as HorarioControl,
    };
  });
export type JornadaResumen = Jornada & { registros: number };

export const listarJornadas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ limite: z.number().int().min(1).max(200).default(60) }).parse(data))
  .handler(async ({ data, context }): Promise<JornadaResumen[]> => {
    const { data: filas } = await context.supabase
      .from("jornadas")
      .select("id, encargado_nombre, encargado_grado, fecha, hora_inicio, hora_fin, estado, created_at")
      .order("fecha", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limite);

    const jornadas = (filas ?? []) as Jornada[];
    if (jornadas.length === 0) return [];

    const { data: faltas } = await context.supabase
      .from("faltas")
      .select("jornada_id")
      .in("jornada_id", jornadas.map((j) => j.id));

    const conteo = new Map<string, number>();
    for (const f of faltas ?? []) {
      if (!f.jornada_id) continue;
      conteo.set(f.jornada_id, (conteo.get(f.jornada_id) ?? 0) + 1);
    }

    return jornadas.map((j) => ({ ...j, registros: conteo.get(j.id) ?? 0 }));
  });

export const detalleJornada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<RegistroJornada[]> => {
    const { data: filas } = await context.supabase
      .from("faltas")
      .select("id, tipo, fecha, created_at, estudiantes:estudiantes!faltas_estudiante_id_fkey!inner(nombre, grado, codigo_sis)")
      .eq("jornada_id", data.id)
      .order("created_at", { ascending: true })
      .limit(500);

    type Fila = {
      id: string;
      tipo: string;
      fecha: string;
      created_at: string;
      estudiantes: { nombre: string; grado: string; codigo_sis: string } | null;
    };

    return ((filas ?? []) as unknown as Fila[]).map((f) => ({
      id: f.id,
      hora: f.created_at,
      fecha: f.fecha,
      tipo: f.tipo as RegistroJornada["tipo"],
      nombre: f.estudiantes?.nombre ?? "—",
      grado: f.estudiantes?.grado ?? "—",
      codigo_sis: f.estudiantes?.codigo_sis ?? "—",
    }));
  });

/* ===== Horas sociales agrupadas por encargado ===== */

export type JornadaDetalleEncargado = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  horas: number;
  registros: RegistroJornada[];
};

export type EncargadoHorasSociales = {
  clave: string;
  nombre: string;
  grado: string;
  totalHoras: number;
  totalEstudiantes: number;
  jornadas: JornadaDetalleEncargado[];
};

/**
 * Cada jornada COMPLETADA equivale a 1 hora, sin importar cuántos estudiantes
 * se hayan registrado en ella. Las jornadas se agrupan por encargado usando la
 * normalización única de grados.
 */
export const resumenHorasSociales = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ anio: z.number().int().min(ANIO_MINIMO).max(ANIO_MINIMO + 50).optional() }).parse(data),
  )
  .handler(async ({ data, context }): Promise<EncargadoHorasSociales[]> => {
    let query = context.supabase
      .from("jornadas")
      .select("id, encargado_nombre, encargado_grado, fecha, hora_inicio, hora_fin, estado, created_at")
      .order("fecha", { ascending: false })
      .limit(1000);

    if (data.anio) query = query.gte("fecha", `${data.anio}-01-01`).lte("fecha", `${data.anio}-12-31`);

    const { data: filas } = await query;
    const jornadas = (filas ?? []) as Jornada[];
    if (jornadas.length === 0) return [];

    // Consultar en lotes para evitar peticiones demasiado largas a Supabase.
    const LOTE = 100;
    const dividir = <T,>(lista: T[]): T[][] => {
      const lotes: T[][] = [];
      for (let i = 0; i < lista.length; i += LOTE) lotes.push(lista.slice(i, i + LOTE));
      return lotes;
    };

    type FaltaFila = {
      id: string;
      tipo: string;
      fecha: string;
      created_at: string;
      jornada_id: string | null;
      estudiante_id: string;
    };

    const faltas: FaltaFila[] = [];
    for (const lote of dividir(jornadas.map((j) => j.id))) {
      const { data: parte, error: errorFaltas } = await context.supabase
        .from("faltas")
        .select("id, tipo, fecha, created_at, jornada_id, estudiante_id")
        .in("jornada_id", lote)
        .order("created_at", { ascending: true })
        .limit(5000);
      if (errorFaltas) {
        throw new Error(`No se pudieron cargar las anotaciones: ${errorFaltas.message}`);
      }
      faltas.push(...((parte ?? []) as FaltaFila[]));
    }

    type EstudianteFila = { id: string; nombre: string; grado: string; codigo_sis: string };
    const estudiantesPorId = new Map<string, EstudianteFila>();
    const estudianteIds = [...new Set(faltas.map((f) => f.estudiante_id))];
    for (const lote of dividir(estudianteIds)) {
      const { data: parte, error: errorEstudiantes } = await context.supabase
        .from("estudiantes")
        .select("id, nombre, grado, codigo_sis")
        .in("id", lote);
      if (errorEstudiantes) {
        throw new Error(`No se pudieron cargar los estudiantes: ${errorEstudiantes.message}`);
      }
      for (const e of (parte ?? []) as EstudianteFila[]) estudiantesPorId.set(e.id, e);
    }

    const porJornada = new Map<string, RegistroJornada[]>();
    for (const f of faltas) {
      if (!f.jornada_id) continue;
      const estudiante = estudiantesPorId.get(f.estudiante_id);
      const lista = porJornada.get(f.jornada_id) ?? [];
      lista.push({
        id: f.id,
        hora: f.created_at,
        fecha: f.fecha,
        tipo: f.tipo as RegistroJornada["tipo"],
        nombre: estudiante?.nombre ?? "—",
        grado: estudiante?.grado ?? "—",
        codigo_sis: estudiante?.codigo_sis ?? "—",
      });
      porJornada.set(f.jornada_id, lista);
    }

    const encargados = new Map<string, EncargadoHorasSociales>();
    for (const j of jornadas) {
      const clave = `${normalizarTexto(j.encargado_nombre)}|${normalizarGrado(j.encargado_grado)}`;
      const actual =
        encargados.get(clave) ??
        ({
          clave,
          nombre: j.encargado_nombre,
          grado: j.encargado_grado,
          totalHoras: 0,
          totalEstudiantes: 0,
          jornadas: [],
        } satisfies EncargadoHorasSociales);

      const registros = porJornada.get(j.id) ?? [];
      // 1 hora por jornada completada (finalizada), sin importar los registros.
      const horas = j.estado === "finalizada" ? 1 : 0;
      actual.totalHoras += horas;
      actual.totalEstudiantes += new Set(registros.map((r) => r.codigo_sis)).size;
      actual.jornadas.push({
        id: j.id,
        fecha: j.fecha,
        hora_inicio: j.hora_inicio,
        hora_fin: j.hora_fin,
        estado: j.estado,
        horas,
        registros,
      });
      encargados.set(clave, actual);
    }

    return Array.from(encargados.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  });