/**
 * Catálogo y normalización oficial de grados y grupos para SCAI.
 * Soporta de 0 (Transición / Preescolar), 1 a 5 (Primaria) y 6 a 11 (Bachillerato).
 */

export const GRADOS_OFICIALES = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
] as const;

export const GRUPOS_OFICIALES = ["A", "B", "C", "D", "E"] as const;

export const ETIQUETAS_GRADOS: Record<string, string> = {
  "0": "0.° Transición / Preescolar",
  "1": "1.° Primero",
  "2": "2.° Segundo",
  "3": "3.° Tercero",
  "4": "4.° Cuarto",
  "5": "5.° Quinto",
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
  cero: 0,
  transicion: 0,
  preescolar: 0,
  jardin: 0,
  parvulos: 0,
  uno: 1,
  primero: 1,
  primera: 1,
  dos: 2,
  segundo: 2,
  segunda: 2,
  tres: 3,
  tercero: 3,
  tercera: 3,
  cuatro: 4,
  cuarto: 4,
  cuarta: 4,
  cinco: 5,
  quinto: 5,
  quinta: 5,
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
 * Ejemplos: "Transición A" -> "0-A", "Primero A" -> "1-A", "Sexto A" -> "6-A", "11 B" -> "11-B".
 */
export function normalizarGrado(valor: string | null | undefined): string {
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

    if (Object.hasOwn(PALABRA_A_NUMERO, tok)) {
      if (numero === null) numero = PALABRA_A_NUMERO[tok];
      continue;
    }

    if (tok.length === 1 && /[a-z]/.test(tok)) {
      if (!letra) letra = tok.toUpperCase();
      continue;
    }

    const raiz = tok.slice(0, -1);
    const ultima = tok.slice(-1);

    if (Object.hasOwn(PALABRA_A_NUMERO, raiz) && /[a-z]/.test(ultima)) {
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

/**
 * Ordena numéricamente de menor a mayor (0 a 11), y luego por letra (A, B, C...).
 * Ejemplo: 0-D antes de 1-C, 10-A antes de 10-B y 11-A.
 */
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

  if (ma) return -1;
  if (mb) return 1;

  return a.localeCompare(b, "es");
}

export function ordenarGrados(grados: string[]): string[] {
  return [...grados].sort(compararGrados);
}

export function esGradoOnce(valor: string | null | undefined): boolean {
  const norm = normalizarGrado(valor);

  if (!norm) return false;

  const numero = norm.split("-")[0];

  return Number(numero) === 11;
}

export function grupoOnce(valor: string | null | undefined): string {
  if (!valor) return "";

  const norm = normalizarGrado(valor);
  const coincidencia = /^\d+-([A-Z])$/.exec(norm);

  return coincidencia ? coincidencia[1] : "";
}
