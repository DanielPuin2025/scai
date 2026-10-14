import { z } from "zod";

export const codigoSchema = z
  .string()
  .trim()
  .min(3, { message: "El código debe tener al menos 3 caracteres" })
  .max(30, { message: "El código es demasiado largo" })
  .regex(/^[A-Za-z0-9-]+$/, { message: "El código solo admite letras, números y guiones" });

export const faltaTipoSchema = z.enum(["llegada_tarde", "mal_uniforme"]);

export type FaltaTipo = z.infer<typeof faltaTipoSchema>;

export const FALTA_LABELS: Record<FaltaTipo, string> = {
  llegada_tarde: "Llegada tarde",
  mal_uniforme: "Mal porte del uniforme",
};

export const buscarInput = z.object({ codigo: codigoSchema });

export const asistenciaInput = z.object({
  codigo: codigoSchema,
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida" })
    .optional(),
});

export const faltaInput = z.object({
  codigo: codigoSchema,
  tipos: z.array(faltaTipoSchema).min(1, { message: "Selecciona al menos una falta" }).max(2),
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida" })
    .optional(),
  hora: z.string().datetime().optional(),
  jornada_id: z.string().uuid().optional(),
});


/** Normaliza texto para comparar búsquedas (sin acentos, minúsculas, sin espacios extra). */
export function normalizarTexto(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Grados: una sola función de normalización para todo el sistema.
 * Se re-exporta desde aquí para no romper los imports existentes.
 */
export { compararGrados, ordenarGrados, normalizarGrado, coincideGrado, resolverGrado } from "./grados";

export type EstudiantePublico = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
  identificacion: string | null;
  tipo_id: string | null;
  faltas: { llegada_tarde: number; mal_uniforme: number; total: number };
  faltasHoy: FaltaTipo[];
  asistenciaHoy: boolean;
};

export type EstudianteOpcion = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  identificacion: string | null;
};
