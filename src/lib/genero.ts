/**
 * Género: se usa ÚNICAMENTE el campo real "genero" de Supabase.
 * Nunca se deduce a partir del nombre. Si viene vacío o desconocido,
 * se devuelve null y la interfaz lo muestra como "Sin registrar".
 */

export type Genero = "F" | "M";

export function normalizarGenero(valor: string | null | undefined): Genero | null {
  if (!valor) return null;
  const v = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (!v) return null;
  if (v === "F" || v === "FEMENINO" || v === "FEMENINA" || v === "MUJER") return "F";
  if (v === "M" || v === "MASCULINO" || v === "MASCULINA" || v === "HOMBRE") return "M";
  return null;
}

export function etiquetaGenero(valor: string | null | undefined) {
  const g = normalizarGenero(valor);
  if (g === "F") return "Femenino";
  if (g === "M") return "Masculino";
  return "Sin registrar";
}

export function etiquetaEstudianteGenero(valor: string | null | undefined) {
  const g = normalizarGenero(valor);
  if (g === "F") return "Estudiante femenina";
  if (g === "M") return "Estudiante masculino";
  return "Género sin registrar";
}
