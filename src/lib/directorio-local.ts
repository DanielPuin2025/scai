import { normalizarTexto, ordenarGrados } from "./scai-schemas";
import type { EstudianteOpcion, EstudiantePublico, FaltaTipo } from "./scai-schemas";
import { listarPendientes } from "./offline-queue";

const KEY = "scai_directorio_v1";

export type EstudianteLocal = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
  identificacion: string | null;
  tipo_id: string | null;
  llegada_tarde: number;
  mal_uniforme: number;
  faltasHoy: FaltaTipo[];
};

export type DirectorioLocal = {
  actualizado: string;
  fecha: string;
  estudiantes: EstudianteLocal[];
};

export function guardarDirectorio(dir: DirectorioLocal) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(dir));
    window.dispatchEvent(new Event("scai-directorio"));
  } catch {
    /* almacenamiento lleno: se ignora, la app sigue funcionando en línea */
  }
}

export function leerDirectorio(): DirectorioLocal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DirectorioLocal) : null;
  } catch {
    return null;
  }
}

export function gradosLocales(): string[] {
  const dir = leerDirectorio();
  if (!dir) return [];
  return ordenarGrados(Array.from(new Set(dir.estudiantes.map((e) => e.grado).filter(Boolean))));
}

/** Búsqueda local con la misma lógica del servidor: nombre, apellido, código o documento + grado. */
export function buscarLocal(q: string, grado?: string): EstudianteOpcion[] {
  const dir = leerDirectorio();
  if (!dir) return [];
  const tokens = normalizarTexto(q).split(" ").filter(Boolean);

  return dir.estudiantes
    .filter((e) => (grado ? e.grado === grado : true))
    .filter((e) => {
      if (tokens.length === 0) return true;
      const campo = normalizarTexto(`${e.nombre} ${e.codigo_sis} ${e.identificacion ?? ""}`);
      return tokens.every((t) => campo.includes(t));
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    .slice(0, 40)
    .map((e) => ({
      id: e.id,
      codigo_sis: e.codigo_sis,
      nombre: e.nombre,
      grado: e.grado,
      identificacion: e.identificacion,
    }));
}

/** Detalle offline: totales guardados + faltas pendientes de sincronizar del día. */
export function detalleLocal(id: string, hoy: string): EstudiantePublico | null {
  const dir = leerDirectorio();
  const e = dir?.estudiantes.find((x) => x.id === id);
  if (!e) return null;

  const pendientesHoy = listarPendientes()
    .filter((p) => p.kind === "faltas" && p.codigo === e.codigo_sis && p.fecha === hoy)
    .flatMap((p) => p.tipos ?? []);

  const faltasHoy = Array.from(new Set([...(dir?.fecha === hoy ? e.faltasHoy : []), ...pendientesHoy]));
  const extraTarde = pendientesHoy.filter((t) => t === "llegada_tarde").length;
  const extraUniforme = pendientesHoy.filter((t) => t === "mal_uniforme").length;

  return {
    id: e.id,
    codigo_sis: e.codigo_sis,
    nombre: e.nombre,
    grado: e.grado,
    genero: e.genero,
    identificacion: e.identificacion,
    tipo_id: e.tipo_id,
    faltas: {
      llegada_tarde: e.llegada_tarde + extraTarde,
      mal_uniforme: e.mal_uniforme + extraUniforme,
      total: e.llegada_tarde + e.mal_uniforme + extraTarde + extraUniforme,
    },
    faltasHoy,
    historial: [],
    asistenciaHoy: false,
  };
}
