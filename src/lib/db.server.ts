// src/lib/db.server.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function createPublicClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error(
      "Faltan las variables SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY en el archivo .env",
    );
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _publico: ReturnType<typeof createPublicClient> | undefined;

export async function getDb() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return supabaseAdmin;
  }
  if (!_publico) _publico = createPublicClient();
  return _publico;
}

type RpcArgs = Record<string, unknown>;

export async function rpcPanel<T>(nombre: string, args: RpcArgs): Promise<T> {
  const db = await getDb();
  // Llamada directa conservando el contexto del cliente
  const { data, error } = await (db.rpc as any)(nombre, args);

  if (error) {
    console.error("[SCAI RPC ERROR]", { nombre, mensaje: error.message });
    if (error.message.includes("sesion_invalida")) throw new Error("SESION_INVALIDA");
    if (error.message.includes("no_autorizado")) throw new Error("NO_AUTORIZADO");
    throw new Error(error.message || "No se pudo conectar con la base de datos.");
  }

  return data as T;
}
