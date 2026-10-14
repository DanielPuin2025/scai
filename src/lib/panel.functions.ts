// Ingreso a los paneles. La verificación de la contraseña, el estado activo,
// la autorización y el grado 11° ocurre dentro de la base de datos: el
// programa nunca compara contraseñas ni guarda datos fijos.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rpcPanel } from "./db.server";
import type { PanelTipo } from "./panel-sesion";

const usuarioSchema = z
  .string()
  .trim()
  .min(3, { message: "Escribe tu usuario" })
  .max(60, { message: "El usuario es demasiado largo" });

const passwordSchema = z
  .string()
  .min(1, { message: "Escribe tu contraseña" })
  .max(72, { message: "La contraseña es demasiado larga" });

export type LoginRespuesta =
  | {
      ok: true;
      token: string;
      panel: PanelTipo;
      nombre: string;
      usuario: string;
      encargado: { codigo_sis: string; nombre: string; grado: string; genero: string | null } | null;
    }
  | { ok: false; error: string };

/** Usuario + contraseña para CONTROL ESCOLAR y HORAS SOCIALES. */
export const iniciarSesionPanel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ usuario: usuarioSchema, password: passwordSchema }).parse(data),
  )
  .handler(async ({ data }): Promise<LoginRespuesta> => {
    try {
      return await rpcPanel<LoginRespuesta>("panel_login", {
        p_usuario: data.usuario,
        p_password: data.password,
      });
    } catch (error) {
      console.error("[LOGIN PANEL ERROR]", error);
      throw error;
    }
  });

export type EstudianteLoginRespuesta =
  | {
      ok: true;
      token: string;
      estudiante: {
        id: string;
        codigo_sis: string;
        nombre: string;
        grado: string;
        genero: string | null;
        tipo_id: string | null;
      };
    }
  | { ok: false; error: string };

/** Panel personal del estudiante: código institucional + documento de identidad. */
export const iniciarSesionEstudiante = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        codigo: z.string().trim().min(3, { message: "Escribe tu código institucional" }).max(30),
        documento: z.string().trim().min(3, { message: "Escribe tu número de documento" }).max(30),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<EstudianteLoginRespuesta> => {
    try {
      return await rpcPanel<EstudianteLoginRespuesta>("estudiante_login", {
        p_codigo: data.codigo,
        p_documento: data.documento,
      });
    } catch {
      return { ok: false, error: "No se pudo verificar tus datos. Revisa tu conexión e intenta de nuevo." };
    }
  });

export const cerrarSesionPanel = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    try {
      await rpcPanel<null>("panel_logout", { p_token: data.token });
    } catch {
      /* la sesión se cierra igual en el dispositivo */
    }
    return { ok: true as const };
  });

export type MisDatos = {
  estudiante: {
    id: string;
    codigo_sis: string;
    nombre: string;
    grado: string;
    genero: string | null;
    tipo_id: string | null;
    identificacion: string | null;
  };
  asistencias: { fecha: string; hora: string }[];
  faltas: { id: string; tipo: "llegada_tarde" | "mal_uniforme"; fecha: string; observacion: string | null; hora: string }[];
  observaciones: { id: string; texto: string; fecha: string }[];
};

/**
 * Datos del estudiante que inició sesión. La base de datos solo devuelve la
 * información ligada al token: es imposible ver los datos de otro estudiante
 * cambiando la dirección, el código o cualquier dato del programa.
 */
export const misDatosEstudiante = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<MisDatos> => {
    return rpcPanel<MisDatos>("estudiante_mis_datos", { p_token: data.token });
  });
