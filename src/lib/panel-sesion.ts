// Sesión local de los paneles de SCAI.
// El token debe ser emitido y validado por la base de datos.
// localStorage solamente conserva la sesión para facilitar la navegación.
// Nunca debe utilizarse como sustituto de la autorización del servidor.

import { useCallback, useEffect, useState } from "react";

export type PanelTipo =
  | "control_escolar"
  | "horas_sociales"
  | "estudiante";

export type EncargadoSesion = {
  codigo_sis: string;
  nombre: string;
  grado: string;
  genero: string | null;
};

export type SesionPanel = {
  token: string;
  panel: PanelTipo;
  nombre: string;
  usuario?: string;
  encargado?: EncargadoSesion | null;
  fecha: string;
};

const CLAVE = "scai_sesion_panel_v1";
const EVENTO = "scai-sesion-panel";

export function hoyLocal(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
  }).format(new Date());
}

/**
 * Verifica la estructura básica de la sesión almacenada.
 * Esta validación local no sustituye la comprobación del token
 * y los permisos en el servidor.
 */
function esSesionValida(s: unknown): s is SesionPanel {
  if (!s || typeof s !== "object") return false;

  const sesion = s as Partial<SesionPanel>;

  const panelesValidos: PanelTipo[] = [
    "control_escolar",
    "horas_sociales",
    "estudiante",
  ];

  return (
    typeof sesion.token === "string" &&
    sesion.token.length > 0 &&
    typeof sesion.nombre === "string" &&
    typeof sesion.fecha === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(sesion.fecha) &&
    panelesValidos.includes(sesion.panel as PanelTipo)
  );
}

/**
 * Lee la sesión local.
 * La sesión caduca al cambiar la fecha de Colombia.
 */
export function leerSesion(): SesionPanel | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CLAVE);

    if (!raw) return null;

    const sesion: unknown = JSON.parse(raw);

    if (!esSesionValida(sesion) || sesion.fecha !== hoyLocal()) {
      window.localStorage.removeItem(CLAVE);
      return null;
    }

    return sesion;
  } catch {
    window.localStorage.removeItem(CLAVE);
    return null;
  }
}

/**
 * Guarda o elimina la sesión y notifica a los componentes suscritos.
 */
export function guardarSesion(sesion: SesionPanel | null): void {
  if (typeof window === "undefined") return;

  if (sesion && esSesionValida(sesion)) {
    window.localStorage.setItem(CLAVE, JSON.stringify(sesion));
  } else {
    window.localStorage.removeItem(CLAVE);
  }

  window.dispatchEvent(new Event(EVENTO));
}

/**
 * Hook para leer la sesión permitida en cada panel.
 */
export function usePanelSesion(paneles: PanelTipo[]) {
  const [sesion, setSesion] = useState<SesionPanel | null>(null);
  const [listo, setListo] = useState(false);

  const refrescar = useCallback(() => {
    const actual = leerSesion();

    setSesion(
      actual && paneles.includes(actual.panel) ? actual : null,
    );

    setListo(true);

    // La lista de paneles es fija por pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneles.join(",")]);

  useEffect(() => {
    refrescar();

    window.addEventListener(EVENTO, refrescar);
    window.addEventListener("storage", refrescar);

    return () => {
      window.removeEventListener(EVENTO, refrescar);
      window.removeEventListener("storage", refrescar);
    };
  }, [refrescar]);

  return {
    sesion,
    listo,
    guardar: guardarSesion,
  };
}
