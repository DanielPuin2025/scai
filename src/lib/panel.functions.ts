// Ingreso a los paneles.
// La validación de contraseñas, el estado activo y la autorización
// deben comprobarse en la base de datos.
// Nunca se guardan credenciales fijas en el programa.

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

const codigoInstitucionalSchema = z
  .string()
  .trim()
  .min(3, { message: "Escribe tu código institucional" })
  .max(30, { message: "El código institucional es demasiado largo" });

const tokenSchema = z.object({
  token: z.string().uuid(),
});

const encargadoSchema = z.object({
  codigo_sis: z.string(),
  nombre: z.string(),
  grado: z.string(),
  genero: z.string().nullable(),
});

export type LoginRespuesta =
  | {
      ok: true;
      token: string;
      panel: PanelTipo;
      nombre: string;
      usuario: string;
      encargado: {
        codigo_sis: string;
        nombre: string;
        grado: string;
        genero: string | null;
      } | null;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Inicio de sesión de los paneles que utilizan usuario y contraseña:
 * Control Escolar y Horas Sociales, según la configuración de la base.
 */
export const iniciarSesionPanel = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) =>
    z
      .object({
        usuario: usuarioSchema,
        password: passwordSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<LoginRespuesta> => {
    try {
      return await rpcPanel<LoginRespuesta>("panel_login", {
        p_usuario: data.usuario,
        p_password: data.password,
      });
    } catch (error) {
      console.error("[LOGIN PANEL ERROR]", error);

      return {
        ok: false,
        error:
          "No se pudo iniciar sesión. Revisa tus datos e intenta de nuevo.",
      };
    }
  });

export type ControlEscolarLoginRespuesta =
  | {
      ok: true;
      token: string;
      panel: "control_escolar";
      nombre: string;
      usuario: string;
      encargado: {
        codigo_sis: string;
        nombre: string;
        grado: string;
        genero: string | null;
      } | null;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Inicio de sesión de Control Escolar mediante código institucional.
 *
 * IMPORTANTE:
 * La función SQL control_escolar_login debe existir en Supabase.
 * La base de datos debe validar el código, la autorización y el estado
 * de la cuenta, y emitir un token de sesión válido.
 */
export const iniciarSesionControlEscolar = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) =>
    z
      .object({
        codigo: codigoInstitucionalSchema,
      })
      .parse(data),
  )
  .handler(
    async ({ data }): Promise<ControlEscolarLoginRespuesta> => {
      try {
        return await rpcPanel<ControlEscolarLoginRespuesta>(
          "control_escolar_login",
          {
            p_codigo: data.codigo,
          },
        );
      } catch (error) {
        console.error("[LOGIN CONTROL ESCOLAR ERROR]", error);

        return {
          ok: false,
          error:
            "No se pudo verificar el código institucional. Revisa tu conexión e intenta de nuevo.",
        };
      }
    },
  );

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
  | {
      ok: false;
      error: string;
    };

/**
 * Inicio de sesión del estudiante mediante código institucional
 * y documento de identidad.
 */
export const iniciarSesionEstudiante = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) =>
    z
      .object({
        codigo: codigoInstitucionalSchema,
        documento: z
          .string()
          .trim()
          .min(3, { message: "Escribe tu número de documento" })
          .max(30, {
            message: "El número de documento es demasiado largo",
          }),
      })
      .parse(data),
  )
  .handler(
    async ({ data }): Promise<EstudianteLoginRespuesta> => {
      try {
        return await rpcPanel<EstudianteLoginRespuesta>(
          "estudiante_login",
          {
            p_codigo: data.codigo,
            p_documento: data.documento,
          },
        );
      } catch (error) {
        console.error("[LOGIN ESTUDIANTE ERROR]", error);

        return {
          ok: false,
          error:
            "No se pudo verificar tus datos. Revisa tu conexión e intenta de nuevo.",
        };
      }
    },
  );

/**
 * Cierra la sesión en la base de datos.
 * El dispositivo también debe borrar su sesión local.
 */
export const cerrarSesionPanel = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      await rpcPanel<null>("panel_logout", {
        p_token: data.token,
      });
    } catch (error) {
      console.error("[CIERRE SESION PANEL ERROR]", error);
    }

    return {
      ok: true as const,
    };
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
  asistencias: {
    fecha: string;
    hora: string;
  }[];
  faltas: {
    id: string;
    tipo: "llegada_tarde" | "mal_uniforme";
    fecha: string;
    observacion: string | null;
    hora: string;
  }[];
  observaciones: {
    id: string;
    texto: string;
    fecha: string;
  }[];
};

/**
 * Consulta los datos personales del estudiante autenticado.
 *
 * La función SQL estudiante_mis_datos debe verificar el token
 * y devolver exclusivamente los registros correspondientes
 * al estudiante asociado con esa sesión.
 */
export const misDatosEstudiante = createServerFn({
  method: "POST",
})
  .inputValidator((data: unknown) => tokenSchema.parse(data))
  .handler(async ({ data }): Promise<MisDatos> => {
    return rpcPanel<MisDatos>("estudiante_mis_datos", {
      p_token: data.token,
    });
  });

