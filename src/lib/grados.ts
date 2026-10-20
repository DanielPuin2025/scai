/**
 * Catálogo y normalización oficial de grados y grupos para SCAI.
 * Grados oficiales: 6° a 11° con grupos A, B, C, D, E.
 */

export const GRADOS_OFICIALES = ["6", "7", "8", "9", "10", "11"] as const;
export const GRUPOS_OFICIALES = ["A", "B", "C", "D", "E"] as const;

export const ETIQUETAS_GRADOS: Record<string, string> = {
  "6": "6.° Sexto",
  "7": "7.° Séptimo",
  "8": "8.° Octavo",
  "9": "9.° Noveno",
  "10": "10.° Décimo",
  "11": "11.° Once",
};

export function obtenerGruposPorGrado(grado: string): string[] {
  return GRUPOS_OFICIALES.map((letra) => `${grado}-${letra}`);
}

const PALABRA_A_NUMERO: Record<string, number> = {
  seis: 6,
  sexto: 6,
  siete: 7,
  septimo: 7,
  ocho: 8,
  octavo: 8,
  nueve: 9,
  noveno: 9,
  diez: 10,
  decimo: 10,
  once: 11,
  undecimo: 11,
};

function sinAcentos(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function piezas(valor: string): string[] {
  const base = sinAcentos(valor)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .trim();

  return base.split(" ").filter(Boolean);
}

/**
 * Convierte representaciones de grado a un formato uniforme.
 * Ejemplos: "Sexto A" -> "6-A", "11 B" -> "11-B".
 */
export function normalizarGrado(
  valor: string | null | undefined,
): string {
  if (!valor) return "";

  const toks = piezas(valor);
  if (toks.length === 0) return "";

  let numero: number | null = null;
  let letra = "";
  const sobrantes: string[] = [];

  for (const tok of toks) {
    if (/^\d+$/.test(tok)) {
      if (numero === null) numero = Number(tok);
      continue;
    }

    if (tok in PALABRA_A_NUMERO) {
      if (numero === null) numero = PALABRA_A_NUMERO[tok];
      continue;
    }

    if (tok.length === 1 && /[a-z]/.test(tok)) {
      if (!letra) letra = tok.toUpperCase();
      continue;
    }

    const raiz = tok.slice(0, -1);
    const ultima = tok.slice(-1);

    if (raiz in PALABRA_A_NUMERO && /[a-z]/.test(ultima)) {
      if (numero === null) numero = PALABRA_A_NUMERO[raiz];
      if (!letra) letra = ultima.toUpperCase();
      continue;
    }

    sobrantes.push(tok);
  }

  if (numero === null) {
    return sobrantes.join(" ").toUpperCase().trim();
  }

  return letra ? `${numero}-${letra}` : `${numero}`;
}

/**
 * Devuelve el número del grado normalizado.
 * Ejemplos: "Sexto A" -> 6, "11-B" -> 11.
 * Devuelve null si no puede identificar un grado numérico.
 */
export function numeroGrado(
  valor: string | number | null | undefined,
): number | null {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const normalizado = normalizarGrado(String(valor));
  const coincidencia = /^(\d+)(?:-[A-Z])?$/.exec(normalizado);

  if (!coincidencia) return null;

  const numero = Number(coincidencia[1]);

  return Number.isInteger(numero) ? numero : null;
}

/**
 * Resuelve una representación de grado a su formato normalizado.
 * Devuelve una cadena vacía si no hay un valor válido.
 */
export function resolverGrado(
  valor: string | number | null | undefined,
): string {
  if (valor === null || valor === undefined || valor === "") {
    return "";
  }

  return normalizarGrado(String(valor));
}

export function coincideGrado(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizarGrado(a);
  const nb = normalizarGrado(b);

  if (!na || !nb) return false;
  if (na === nb) return true;

  const soloNumeroA = /^\d+$/.test(na);
  const soloNumeroB = /^\d+$/.test(nb);

  if (soloNumeroA && nb.startsWith(`${na}-`)) return true;
  if (soloNumeroB && na.startsWith(`${nb}-`)) return true;

  return false;
}

export function compararGrados(a: string, b: string): number {
  const na = normalizarGrado(a);
  const nb = normalizarGrado(b);

  const ma = /^(\d+)(?:-([A-Z]))?$/.exec(na);
  const mb = /^(\d+)(?:-([A-Z]))?$/.exec(nb);

  if (ma && mb) {
    const diferencia = Number(ma[1]) - Number(mb[1]);

    if (diferencia !== 0) return diferencia;

    return (ma[2] ?? "").localeCompare(mb[2] ?? "", "es");
  }

  if (ma) return 1;
  if (mb) return -1;

  return a.localeCompare(b, "es");
}

export function ordenarGrados(grados: string[]): string[] {
  return [...grados].sort(compararGrados);
}

export function esGradoOnce(
  valor: string | null | undefined,
): boolean {
  const norm = normalizarGrado(valor);

  if (!norm) return false;

  const numero = norm.split("-")[0];

  return Number(numero) === 11;
}

export function grupoOnce(
  valor: string | null | undefined,
): string {
  if (!valor) return "";

  const norm = normalizarGrado(valor);
  const coincidencia = /^\d+-([A-Z])$/.exec(norm);

  return coincidencia ? coincidencia[1] : "";
}
