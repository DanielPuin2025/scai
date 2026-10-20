import { z } from "zod";

export const horaSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: "Hora inválida" });

export const horarioInput = z.object({
  hora_inicio: horaSchema,
  hora_puntual_hasta: horaSchema,
  hora_tarde_desde: horaSchema,
  hora_fin: horaSchema,
});

/**
 * Acceso a horas sociales: SOLO el código institucional.
 * Se maneja como texto para conservar los ceros iniciales (ej. "010804").
 */
export const codigoEncargadoSchema = z
  .string()
  .trim()
  .min(3, { message: "El código debe tener al menos 3 caracteres" })
  .max(30, { message: "El código es demasiado largo" })
  .regex(/^[A-Za-z0-9-]+$/, { message: "El código solo admite letras, números y guiones" });

export const accesoEncargadoInput = z.object({
  codigo: codigoEncargadoSchema,
  fecha: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Fecha inválida" })
    .optional(),
});

export type EncargadoAutorizado = {
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
};

export type HorarioControl = {
  id: string;
  hora_inicio: string;
  hora_puntual_hasta: string;
  hora_tarde_desde: string;
  hora_fin: string;
  updated_at: string;
};

export type Jornada = {
  id: string;
  encargado_nombre: string;
  encargado_grado: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  estado: string;
  created_at: string;
};

export type RegistroJornada = {
  id: string;
  hora: string;
  fecha: string;
  tipo: "llegada_tarde" | "mal_uniforme";
  nombre: string;
  grado: string;
  codigo_sis: string;
};

/** Convierte "06:00:00" en "6:00 a. m." */
export function formatoHora12(hora: string | null | undefined) {
  if (!hora) return "—";
  const [h, m] = hora.split(":");
  const horas = Number(h);
  const sufijo = horas < 12 ? "a. m." : "p. m.";
  const h12 = horas % 12 === 0 ? 12 : horas % 12;
  return `${h12}:${m} ${sufijo}`;
}

/** Hora legible a partir de una marca de tiempo completa. */
export function horaDeFecha(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function fechaLarga(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
