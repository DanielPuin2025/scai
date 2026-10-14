/** Años académicos disponibles: comienzan en 2026 y avanzan dinámicamente. */
export const ANIO_MINIMO = 2026;

export function aniosAcademicos(extra = 1) {
  const actual = new Date().getFullYear();
  const ultimo = Math.max(ANIO_MINIMO, actual + extra);
  const lista: number[] = [];
  for (let a = ANIO_MINIMO; a <= ultimo; a += 1) lista.push(a);
  return lista;
}

export function anioPorDefecto() {
  return Math.max(ANIO_MINIMO, new Date().getFullYear());
}

export const FECHA_MINIMA = `${ANIO_MINIMO}-01-01`;

/** Recorta una fecha ISO para que nunca sea anterior a 2026. */
export function limitarFecha(fecha: string) {
  return fecha < FECHA_MINIMA ? FECHA_MINIMA : fecha;
}
