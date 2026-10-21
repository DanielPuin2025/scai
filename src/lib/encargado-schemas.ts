// src/lib/encargado-schemas.ts
// Tipos y etiquetas compartidas del Control Escolar

export const FUNCIONES = ["registro_control_escolar", "vigilancia"] as const;
export type FuncionEncargado = (typeof FUNCIONES)[number];
export const FUNCION_LABELS: Record<FuncionEncargado, string> = {
  registro_control_escolar: "Registro de Control Escolar",
  vigilancia: "Vigilancia",
};

export const NOVEDADES = ["llegada_tarde", "mal_uniforme"] as const;
export type NovedadTipo = (typeof NOVEDADES)[number];
export const NOVEDAD_LABELS: Record<NovedadTipo, string> = {
  llegada_tarde: "Llegada tarde",
  mal_uniforme: "Mal porte del uniforme",
};

export type EncargadoInfo = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
};

export type AsignacionInfo = {
  id: string;
  funcion: FuncionEncargado;
  created_at: string;
};

export type LoginEncargadoRespuesta =
  | { ok: true; token: string; debe_cambiar: boolean; encargado: EncargadoInfo; asignacion: AsignacionInfo }
  | { ok: false; error: string };

export type EstadoEncargado = {
  ok: true;
  fecha: string;
  ahora: string;
  horario: { hora_inicio: string; hora_fin: string };
  dentro_horario: boolean;
  encargado: EncargadoInfo;
  asignacion: AsignacionInfo;
  jornada: {
    id: string;
    fecha: string;
    estado: string;
    hora_inicio: string;
    hora_fin: string;
    finalizada_at: string | null;
  };
  hora_acreditada_hoy: boolean;
  horas_total: number;
  novedades_hoy: number;
};

export type EstudianteRegistro = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
  falta_injustificada?: number;
  llegada_tarde: number;
  mal_uniforme: number;
  hoy: NovedadTipo[];
};

export type OpcionEstudiante = {
  id: string;
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
};
