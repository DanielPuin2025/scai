// Sesión local de los paneles (Control Escolar, Horas Sociales y Estudiante).
// Solo se guarda el token que emite la base de datos: sin token no se puede
// consultar ni registrar absolutamente nada.
import { useCallback, useEffect, useState } from "react";

export type PanelTipo = "control_escolar" | "horas_sociales" | "estudiante";

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

export function hoyLocal() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

export function leerSesion(): SesionPanel | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return null;
    const s = JSON.parse(raw) as SesionPanel;
    // La sesión solo vale para el día en que se abrió.
    if (!s?.token || s.fecha !== hoyLocal()) {
      window.localStorage.removeItem(CLAVE);
      return null;
    }
    return s;
  } catch {
    window.localStorage.removeItem(CLAVE);
    return null;
  }
}

export function guardarSesion(s: SesionPanel | null) {
  if (typeof window === "undefined") return;
  if (s) window.localStorage.setItem(CLAVE, JSON.stringify(s));
  else window.localStorage.removeItem(CLAVE);
  window.dispatchEvent(new Event(EVENTO));
}

export function usePanelSesion(paneles: PanelTipo[]) {
  const [sesion, setSesion] = useState<SesionPanel | null>(null);
  const [listo, setListo] = useState(false);

  const refrescar = useCallback(() => {
    const s = leerSesion();
    setSesion(s && paneles.includes(s.panel) ? s : null);
    setListo(true);
    // paneles es una lista fija por pantalla
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paneles.join(",")]);

  useEffect(() => {
    refrescar();
    window.addEventListener(EVENTO, refrescar);
    return () => window.removeEventListener(EVENTO, refrescar);
  }, [refrescar]);

  return { sesion, listo, guardar: guardarSesion };
}
