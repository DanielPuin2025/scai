/**
 * Normalización única de grados para TODO el sistema (acceso, búsqueda,
 * filtros, reportes y modo sin conexión).
 *
 * Reconoce equivalencias como: 11A = 11a = 11 A = 11 a = 11-A = Once A =
 * once a = ONCE A = oncea = décimo primero A.
 *
 * IMPORTANTE: nunca modifica el formato guardado en Supabase. Solo sirve para
 * comparar; para mostrar y para consultar se sigue usando el texto real.
 */

const PALABRA_A_NUMERO: Record<string, number> = {
  cero: 0,
  transicion: 0,
  preescolar: 0,
  jardin: 0,
  uno: 1,
  primero: 1,
  primera: 1,
  dos: 2,
  segundo: 2,
  tres: 3,
  tercero: 3,
  tercer: 3,
  cuatro: 4,
  cuarto: 4,
  cinco: 5,
  quinto: 5,
  seis: 6,
  sexto: 6,
  siete: 7,
  septimo: 7,
  setimo: 7,
  ocho: 8,
  octavo: 8,
  nueve: 9,
  noveno: 9,
  diez: 10,
  decimo: 10,
  once: 11,
  undecimo: 11,
  onceavo: 11,
  doce: 12,
  duodecimo: 12,
};

function sinAcentos(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Divide "11-A", "Once A" u "oncea" en piezas comparables. */
function piezas(valor: string) {
  const base = sinAcentos(valor)
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .trim();
  return base.split(" ").filter(Boolean);
}

/**
 * Devuelve una clave canónica del grado: "11-A", "6-E", "0-A" o "11".
 * Si el grado no es reconocible (ej. "Aceleración"), devuelve el texto
 * limpio en mayúsculas para que igual se pueda comparar.
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
    if (tok in PALABRA_A_NUMERO) {
      if (numero === null) numero = PALABRA_A_NUMERO[tok];
      continue;
    }
    if (tok.length === 1 && /[a-z]/.test(tok)) {
      if (!letra) letra = tok.toUpperCase();
      continue;
    }
    // "oncea" -> "once" + "a"
    const raiz = tok.slice(0, -1);
    const ultima = tok.slice(-1);
    if (raiz in PALABRA_A_NUMERO && /[a-z]/.test(ultima)) {
      if (numero === null) numero = PALABRA_A_NUMERO[raiz];
      if (!letra) letra = ultima.toUpperCase();
      continue;
    }
    sobrantes.push(tok);
  }

  if (numero === null) return sobrantes.join(" ").toUpperCase().trim();
  return letra ? `${numero}-${letra}` : `${numero}`;
}

/** ¿Dos textos representan el mismo grado? ("11A" y "11-A" sí). */
export function coincideGrado(a: string | null | undefined, b: string | null | undefined) {
  const na = normalizarGrado(a);
  const nb = normalizarGrado(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // "11" también coincide con "11-A" cuando se busca un grado sin letra
  const soloNumeroA = /^\d+$/.test(na);
  const soloNumeroB = /^\d+$/.test(nb);
  if (soloNumeroA && nb.startsWith(`${na}-`)) return true;
  if (soloNumeroB && na.startsWith(`${nb}-`)) return true;
  return false;
}

/** Busca el grado REAL de Supabase que corresponde a lo que escribió la persona. */
export function resolverGrado(entrada: string | null | undefined, gradosReales: string[]) {
  if (!entrada) return null;
  const exacto = gradosReales.find((g) => g === entrada.trim());
  if (exacto) return exacto;
  const objetivo = normalizarGrado(entrada);
  if (!objetivo) return null;
  return (
    gradosReales.find((g) => normalizarGrado(g) === objetivo) ??
    gradosReales.find((g) => coincideGrado(g, entrada)) ??
    null
  );
}

/** Orden natural: 0-A, 0-B, 1-A ... 11-A. Los no numéricos van primero. */
export function compararGrados(a: string, b: string) {
  const na = normalizarGrado(a);
  const nb = normalizarGrado(b);
  const ma = /^(\d+)(?:-([A-Z]))?$/.exec(na);
  const mb = /^(\d+)(?:-([A-Z]))?$/.exec(nb);
  if (ma && mb) {
    const diff = Number(ma[1]) - Number(mb[1]);
    if (diff !== 0) return diff;
    return (ma[2] ?? "").localeCompare(mb[2] ?? "", "es");
  }
  if (ma) return 1;
  if (mb) return -1;
  return a.localeCompare(b, "es");
}

export function ordenarGrados(grados: string[]) {
  return [...grados].sort(compararGrados);
}

/**
 * ¿El grado corresponde a 11°? Acepta 11, 11A, 11-A, Once A, Undécimo, 1101…
 * Se usa la misma regla que aplica la base de datos.
 */
export function esGradoOnce(valor: string | null | undefined) {
  if (valor && /decimo\s*primer/.test(sinAcentos(valor))) return true;
  const norm = normalizarGrado(valor);
  if (!norm) return false;
  const numero = norm.split("-")[0];
  if (!/^\d+$/.test(numero)) return false;
  return numero.length <= 2 ? Number(numero) === 11 : Number(numero.slice(0, 2)) === 11;
}

/**
 * Grupo (letra) de un grado 11°: "11A", "11-A", "Once A" -> "A";
 * "1101" -> "A", "1102" -> "B". Devuelve "" si no tiene grupo.
 */
export function grupoOnce(valor: string | null | undefined): string {
  if (!valor) return "";
  const limpio = sinAcentos(valor).replace(/decimo\s*primero?/g, "once");
  const norm = normalizarGrado(limpio);
  const m = /^\d+-([A-Z])$/.exec(norm);
  if (m) return m[1];
  const num = /^11(\d{1,2})$/.exec(norm);
  if (num && Number(num[1]) > 0) return String.fromCharCode(64 + Number(num[1]));
  return "";
}
