// Funciones de servidor para el editor de apariencia.
// - obtenerApariencia: pública (la config visual la lee todo el mundo).
// - guardar/restaurar/rol: protegidas con requireSupabaseAuth y verificación
//   de rol (coordinador o programador) contra la tabla real user_roles.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { combinarApariencia, type AparienciaConfig } from "./apariencia";

// La tabla apariencia no está en los tipos generados; se accede con una
// proyección mínima tipada a mano para no tocar el resto del sistema.
type Consulta = {
  maybeSingle: () => Promise<{ data: { datos: unknown; actualizado_en: string | null } | null; error: unknown }>;
};
type TablaApariencia = {
  select: (columnas: string) => { eq: (col: string, valor: unknown) => Consulta };
  update: (valores: Record<string, unknown>) => { eq: (col: string, valor: unknown) => Promise<{ error: unknown }> };
};

function tablaDe(db: unknown): TablaApariencia {
  return (db as { from: (tabla: string) => TablaApariencia }).from("apariencia");
}

type ContextoAuth = { supabase: unknown; userId: string };

async function verificarRol(context: ContextoAuth) {
  const rpc = (context.supabase as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown }>;
  }).rpc;
  const cliente = context.supabase as never;
  const { data: coord } = await rpc.call(cliente, "has_role", {
    _user_id: context.userId,
    _role: "coordinador",
  });
  const { data: prog } = await rpc.call(cliente, "has_role", {
    _user_id: context.userId,
    _role: "programador",
  });
  return { esCoordinador: Boolean(coord), esProgramador: Boolean(prog) };
}

function exigirPermiso(roles: { esCoordinador: boolean; esProgramador: boolean }) {
  if (!roles.esCoordinador && !roles.esProgramador) {
    throw new Error("No tienes permiso para editar la apariencia del sistema.");
  }
}

/** Lectura pública de la configuración guardada. Nunca falla: si algo va mal devuelve los valores predeterminados. */
export const obtenerApariencia = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getDb } = await import("./db.server");
    const db = await getDb();
    const { data } = await tablaDe(db).select("datos, actualizado_en").eq("id", 1).maybeSingle();
    return { config: combinarApariencia(data?.datos ?? null) };
  } catch (error) {
    console.error("apariencia: no se pudo leer la configuración, se usan los valores predeterminados", error);
    return { config: combinarApariencia(null) };
  }
});

export const guardarApariencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const d = data as { config?: unknown };
    if (!d || typeof d !== "object" || typeof d.config !== "object" || d.config === null) {
      throw new Error("Configuración inválida.");
    }
    return { config: combinarApariencia(d.config) };
  })
  .handler(async ({ data, context }) => {
    const roles = await verificarRol(context);
    exigirPermiso(roles);
    const db = context.supabase as unknown as { from: (t: string) => TablaApariencia };
    const { error } = await db
      .from("apariencia")
      .update({
        datos: data.config,
        actualizado_por: context.userId,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw error;
    return { ok: true, config: data.config };
  });

/** Restaura la apariencia original (los valores predeterminados del sistema). */
export const restaurarApariencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await verificarRol(context);
    exigirPermiso(roles);
    const db = context.supabase as unknown as { from: (t: string) => TablaApariencia };
    const { error } = await db
      .from("apariencia")
      .update({ datos: {}, actualizado_por: context.userId, actualizado_en: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
    return { ok: true, config: combinarApariencia(null) };
  });

/** Indica el rol del usuario actual para mostrar u ocultar secciones del editor. */
export const obtenerMiRol = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const roles = await verificarRol(context);
    const rol: "programador" | "coordinador" | null = roles.esProgramador
      ? "programador"
      : roles.esCoordinador
        ? "coordinador"
        : null;
    return rol;
  });

export type ResultadoApariencia = { config: AparienciaConfig };
