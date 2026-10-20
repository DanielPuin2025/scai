/*
 * Configuración de apariencia de SCAI (editor visual).
 * Define el esquema, los valores predeterminados y la traducción de la
 * configuración a variables CSS. La lógica del sistema nunca depende de aquí:
 * solo colores, tamaños, textos visibles y elementos configurables.
 */
import { z } from "zod";

export const FUENTES_DISPONIBLES = [
  "Sora",
  "Manrope",
  "Inter",
  "Poppins",
  "Montserrat",
  "Nunito",
  "Raleway",
  "Roboto",
  "Open Sans",
  "Lato",
  "Work Sans",
  "Rubik",
  "Oswald",
  "Playfair Display",
  "Merriweather",
] as const;

const FUENTES_GOOGLE: Record<string, string> = {
  Sora: "Sora",
  Manrope: "Manrope",
  Inter: "Inter",
  Poppins: "Poppins",
  Montserrat: "Montserrat",
  Nunito: "Nunito",
  Raleway: "Raleway",
  Roboto: "Roboto",
  "Open Sans": "Open+Sans",
  Lato: "Lato",
  "Work Sans": "Work+Sans",
  Rubik: "Rubik",
  Oswald: "Oswald",
  "Playfair Display": "Playfair+Display",
  Merriweather: "Merriweather",
};

const colorHex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido (usa formato #rrggbb)");

export const coloresSchema = z.object({
  primario: colorHex,
  primarioTexto: colorHex,
  fondo: colorHex,
  superficie: colorHex,
  texto: colorHex,
  textoSuave: colorHex,
  borde: colorHex,
  acento: colorHex,
  error: colorHex,
  exito: colorHex,
  advertencia: colorHex,
});

export const tipografiaSchema = z.object({
  fuenteTitulos: z.string().max(60),
  fuenteCuerpo: z.string().max(60),
  escala: z.number().min(0.8).max(1.4),
  pesoTitulos: z.number().min(400).max(800),
});

export const botonesSchema = z.object({
  radio: z.number().min(0).max(30),
  alto: z.number().min(32).max(64),
  tamanoTexto: z.number().min(11).max(20),
  peso: z.number().min(400).max(800),
});

export const tarjetasSchema = z.object({
  radio: z.number().min(0).max(36),
  sombra: z.enum(["ninguna", "suave", "media", "fuerte"]),
});

export const logoSchema = z.object({
  url: z.string().max(4000),
  tamano: z.number().min(0).max(320),
  posicion: z.enum(["izquierda", "centro", "derecha"]),
  mostrar: z.boolean(),
});

export const textosSchema = z.object({
  nombreSistema: z.string().max(60),
  nombreCompleto: z.string().max(120),
  institucion: z.string().max(120),
  lemaInicio: z.string().max(300),
  textoCoordinador: z.string().max(300),
  textoControlEscolar: z.string().max(300).default(""),
  textoEstudiante: z.string().max(300),
  pieInicio: z.string().max(160),
  tituloPanel: z.string().max(80),
  tituloHorasSociales: z.string().max(80),
});

export const visibilidadSchema = z.object({
  mostrarPie: z.boolean(),
  mostrarLema: z.boolean(),
  mostrarDecoracion: z.boolean(),
});

export const modulosSchema = z.object({
  estudiante: z.object({ colorAcento: z.string().max(9) }),
  coordinador: z.object({ colorAcento: z.string().max(9) }),
});

export const aparienciaSchema = z.object({
  tema: z.enum(["claro", "oscuro", "automatico"]),
  colores: coloresSchema,
  tipografia: tipografiaSchema,
  botones: botonesSchema,
  tarjetas: tarjetasSchema,
  logo: logoSchema,
  textos: textosSchema,
  visibilidad: visibilidadSchema,
  modulos: modulosSchema,
});

export type AparienciaConfig = z.infer<typeof aparienciaSchema>;

const SECCIONES = [
  "colores",
  "tipografia",
  "botones",
  "tarjetas",
  "logo",
  "textos",
  "visibilidad",
  "modulos",
] as const;

/** Valores que replican el diseño original de SCAI. */
export const aparienciaDefault: AparienciaConfig = aparienciaSchema.parse({
  tema: "automatico",
  colores: {
    primario: "#3451b2",
    primarioTexto: "#ffffff",
    fondo: "#f7f9fd",
    superficie: "#ffffff",
    texto: "#262e4d",
    textoSuave: "#59617f",
    borde: "#dde2ec",
    acento: "#3b6ed7",
    error: "#d6335c",
    exito: "#159f6c",
    advertencia: "#dfa63d",
  },
  tipografia: { fuenteTitulos: "Sora", fuenteCuerpo: "Manrope", escala: 1, pesoTitulos: 700 },
  botones: { radio: 12, alto: 36, tamanoTexto: 14, peso: 500 },
  tarjetas: { radio: 24, sombra: "media" },
  logo: { url: "", tamano: 0, posicion: "centro", mostrar: true },
  textos: {
    nombreSistema: "SCAI",
    nombreCompleto: "Sistema de Control de Acceso Institucional",
    institucion: "Megacolegio El Progreso",
    lemaInicio:
      "Registro y control de asistencia y faltas de los estudiantes del Megacolegio El Progreso.",
    textoCoordinador: "Inicia sesión para gestionar estudiantes, registrar faltas y consultar reportes.",
    textoControlEscolar: "Ingreso autorizado para registrar estudiantes, llegadas tarde, uniforme e incidencias.",
    textoEstudiante: "Consulta tu propia información: asistencias, faltas, llegadas tarde y observaciones.",
    pieInicio: "Megacolegio El Progreso · SCAI",
    tituloPanel: "Panel del coordinador",
    tituloHorasSociales: "Horas sociales",
  },
  visibilidad: { mostrarPie: true, mostrarLema: true, mostrarDecoracion: true },
  modulos: { estudiante: { colorAcento: "" }, coordinador: { colorAcento: "" } },
});

/**
 * Combina una configuración guardada (posiblemente parcial o corrupta) con los
 * valores predeterminados. Nunca lanza: si una sección es inválida se usa el
 * valor por defecto, para que la apariencia no pueda romper la aplicación.
 */
export function combinarApariencia(parcial: unknown): AparienciaConfig {
  const p = (parcial && typeof parcial === "object" ? parcial : {}) as Record<string, unknown>;
  const resultado: Record<string, unknown> = {
    tema: ["claro", "oscuro", "automatico"].includes(p.tema as string) ? p.tema : aparienciaDefault.tema,
  };
  for (const seccion of SECCIONES) {
    const esquema = aparienciaSchema.shape[seccion];
    const intento = esquema.safeParse({
      ...aparienciaDefault[seccion],
      ...(p[seccion] && typeof p[seccion] === "object" ? p[seccion] : {}),
    });
    resultado[seccion] = intento.success ? intento.data : aparienciaDefault[seccion];
  }
  return resultado as unknown as AparienciaConfig;
}

const SOMBRAS: Record<AparienciaConfig["tarjetas"]["sombra"], string> = {
  ninguna: "none",
  suave: "0 1px 3px rgb(30 40 80 / 0.10)",
  media: "0 1px 2px rgb(52 81 178 / 0.06), 0 12px 30px -18px rgb(52 81 178 / 0.35)",
  fuerte: "0 24px 60px -22px rgb(52 81 178 / 0.55)",
};

function urlFuente(familia: string): string | null {
  const nombre = FUENTES_GOOGLE[familia];
  return nombre ? `https://fonts.googleapis.com/css2?family=${nombre}:wght@400;500;600;700;800&display=swap` : null;
}

/** Genera el bloque CSS que aplica la configuración sobre los tokens del sistema. */
export function aparienciaACss(cfg: AparienciaConfig): string {
  const c = cfg.colores;
  const reglas: string[] = [];

  const vars = [
    `--primary: ${c.primario}`,
    `--primary-foreground: ${c.primarioTexto}`,
    `--background: ${c.fondo}`,
    `--card: ${c.superficie}`,
    `--card-foreground: ${c.texto}`,
    `--popover: ${c.superficie}`,
    `--popover-foreground: ${c.texto}`,
    `--foreground: ${c.texto}`,
    `--muted-foreground: ${c.textoSuave}`,
    `--border: ${c.borde}`,
    `--input: ${c.borde}`,
    `--ring: ${c.primario}`,
    `--accent: ${c.acento}`,
    `--accent-foreground: ${c.primarioTexto}`,
    `--destructive: ${c.error}`,
    `--destructive-foreground: #ffffff`,
    `--success: ${c.exito}`,
    `--success-foreground: #ffffff`,
    `--warning: ${c.advertencia}`,
    `--warning-foreground: #262e4d`,
    `--font-display: "${cfg.tipografia.fuenteTitulos}", ui-sans-serif, system-ui, sans-serif`,
    `--font-sans: "${cfg.tipografia.fuenteCuerpo}", ui-sans-serif, system-ui, sans-serif`,
    `--shadow-card: ${SOMBRAS[cfg.tarjetas.sombra]}`,
    `--acento-modulo: ${c.primario}`,
    // El degradado institucional sigue al color primario elegido.
    `--gradient-institucional: linear-gradient(150deg, color-mix(in oklab, ${c.primario} 82%, #101635) 0%, ${c.primario} 55%, color-mix(in oklab, ${c.primario} 72%, #ffffff) 100%)`,
  ];
  if (cfg.botones.radio !== aparienciaDefault.botones.radio) vars.push(`--radius: ${cfg.botones.radio}px`);

  reglas.push(`:root, .dark { ${vars.join("; ")} }`);

  if (cfg.tipografia.escala !== 1) {
    reglas.push(`html { font-size: ${(cfg.tipografia.escala * 100).toFixed(1)}%; }`);
  }
  if (cfg.tipografia.pesoTitulos !== aparienciaDefault.tipografia.pesoTitulos) {
    reglas.push(`h1, h2, h3, h4 { font-weight: ${cfg.tipografia.pesoTitulos}; }`);
  }

  // Botones (sin tocar los iconos cuadrados).
  const b = cfg.botones;
  if (b.alto !== aparienciaDefault.botones.alto) {
    reglas.push(`[data-slot="button"]:not([data-size="icon"]) { height: ${b.alto}px; }`);
  }
  if (b.tamanoTexto !== aparienciaDefault.botones.tamanoTexto || b.peso !== aparienciaDefault.botones.peso) {
    reglas.push(
      `[data-slot="button"] { font-size: ${b.tamanoTexto}px; font-weight: ${b.peso}; }`,
    );
  }

  // Tarjetas y paneles redondeados.
  if (cfg.tarjetas.radio !== aparienciaDefault.tarjetas.radio) {
    reglas.push(`.rounded-3xl { border-radius: ${cfg.tarjetas.radio}px; }`);
  }

  // Acento por módulo (estudiante / coordinador) sobre fondo suave y encabezado.
  const acentoEst = cfg.modulos.estudiante.colorAcento.trim();
  const acentoCoord = cfg.modulos.coordinador.colorAcento.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(acentoEst)) {
    reglas.push(
      `main[data-modulo="estudiante"] { --acento-modulo: ${acentoEst}; --gradient-institucional: linear-gradient(150deg, color-mix(in oklab, ${acentoEst} 82%, #101635) 0%, ${acentoEst} 55%, color-mix(in oklab, ${acentoEst} 72%, #ffffff) 100%); }`,
    );
  }
  if (/^#[0-9a-fA-F]{6}$/.test(acentoCoord)) {
    reglas.push(
      `main[data-modulo="coordinador"] { --acento-modulo: ${acentoCoord}; --gradient-institucional: linear-gradient(150deg, color-mix(in oklab, ${acentoCoord} 82%, #101635) 0%, ${acentoCoord} 55%, color-mix(in oklab, ${acentoCoord} 72%, #ffffff) 100%); }`,
    );
  }
  reglas.push(
    `.bg-suave { background-image: linear-gradient(170deg, var(--background) 0%, color-mix(in oklab, var(--acento-modulo) 14%, var(--background)) 55%, color-mix(in oklab, var(--acento-modulo) 9%, var(--background)) 100%); }`,
  );

  return reglas.join("\n");
}

export { urlFuente };
