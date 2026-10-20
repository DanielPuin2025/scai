// src/lib/encargado.functions.ts
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rpcPanel } from "./db.server";
import {
  NOVEDADES,
  type NovedadTipo,
  type LoginEncargadoRespuesta,
  type EstadoEncargado,
  type EstudianteRegistro,
  type OpcionEstudiante,
} from "./encargado-schemas";

const token = z.string().uuid({ message: "Tu sesión terminó. Vuelve a ingresar." });

type Resultado = { ok: true } | { ok: false; error: string };

const codigoSchema = z
  .string()
  .trim()
  .min(1, { message: "Escribe tu código institucional" })
  .max(30, { message: "El código es demasiado largo" });

export const iniciarSesionEncargado = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        codigo: codigoSchema,
        password: z.string().min(1).max(72).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<LoginEncargadoRespuesta> => {
    try {
      const pwd = data.password || data.codigo;
      return await rpcPanel<LoginEncargadoRespuesta>("encargado_login", {
        p_codigo: data.codigo,
        p_password: pwd,
      });
    } catch {
      return { ok: false, error: "No se pudo verificar el acceso. Revisa tu conexión e intenta de nuevo." };
    }
  });

export const estadoEncargado = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token }).parse(data))
  .handler(async ({ data }) => rpcPanel<EstadoEncargado>("encargado_estado", { p_token: data.token }));

export const finalizarJornadaEncargado = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token }).parse(data))
  .handler(async ({ data }) =>
    rpcPanel<{ ok: true; acreditada: boolean } | { ok: false; error: string }>("encargado_finalizar_jornada", {
      p_token: data.token,
    }),
  );

export const cambiarPasswordEncargado = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token,
        actual: z.string().min(1).max(72),
        nueva: z.string().min(6, { message: "Mínimo 6 caracteres" }).max(72),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    rpcPanel<Resultado>("encargado_cambiar_password", {
      p_token: data.token,
      p_actual: data.actual,
      p_nueva: data.nueva,
    }),
  );

export const gradosEncargado = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token }).parse(data))
  .handler(async ({ data }) => {
    const filas = await rpcPanel<string[] | { encargado_grados: string }[]>("encargado_grados", {
      p_token: data.token,
    });
    return (filas ?? []).map((g) => (typeof g === "string" ? g : g.encargado_grados)).filter(Boolean);
  });

export const buscarEstudiantesEncargado = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token,
        q: z.string().trim().max(80).optional(),
        grado: z.string().trim().max(30).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const filas = await rpcPanel<OpcionEstudiante[]>("encargado_buscar_estudiantes", {
      p_token: data.token,
      p_q: data.q ?? "",
      p_grado: data.grado ?? null,
    });
    return filas ?? [];
  });

export const estudianteEncargado = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token, id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) =>
    rpcPanel<EstudianteRegistro | null>("encargado_estudiante", { p_token: data.token, p_id: data.id }),
  );

export const registrarNovedades = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token,
        estudiante_id: z.string().uuid(),
        tipos: z.array(z.enum(NOVEDADES)).min(1, { message: "Selecciona al menos una novedad" }).max(3),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    rpcPanel<
      | { ok: true; registradas: NovedadTipo[]; duplicadas: NovedadTipo[] }
      | { ok: false; error: string }
    >("encargado_registrar_novedades", {
      p_token: data.token,
      p_estudiante_id: data.estudiante_id,
      p_tipos: data.tipos,
    }),
  );
