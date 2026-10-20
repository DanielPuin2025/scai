/*
 * Contexto global de apariencia: carga la configuración guardada, la aplica en
 * tiempo real (CSS, tema, fuentes) y permite vista previa desde el editor.
 * Envuelve toda la aplicación en el root, pero la lógica del sistema nunca
 * depende de ella: los textos usan useTexto(clave, valorDefecto).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { obtenerApariencia } from "./apariencia.functions";
import {
  aparienciaACss,
  aparienciaDefault,
  combinarApariencia,
  urlFuente,
  type AparienciaConfig,
} from "./apariencia";

export const CLAVE_APARIENCIA = ["apariencia"] as const;

export const aparienciaQueryOptions = queryOptions({
  queryKey: CLAVE_APARIENCIA,
  queryFn: () => obtenerApariencia(),
});

type ContextoApariencia = {
  config: AparienciaConfig;
  /** Vista previa en vivo desde el editor (null = volver a la configuración guardada). */
  mostrarVistaPrevia: (cfg: AparienciaConfig | null) => void;
};

const Ctx = createContext<ContextoApariencia>({
  config: aparienciaDefault,
  mostrarVistaPrevia: () => {},
});

/** Aplica la configuración al documento (CSS dinámico, tema, fuentes). */
export function aplicarApariencia(cfg: AparienciaConfig) {
  if (typeof document === "undefined") return;

  const ID = "apariencia-dinamica";
  let estilo = document.getElementById(ID) as HTMLStyleElement | null;
  if (!estilo) {
    estilo = document.createElement("style");
    estilo.id = ID;
    document.head.appendChild(estilo);
  }
  estilo.textContent = aparienciaACss(cfg);

  const html = document.documentElement;
  if (cfg.tema === "oscuro") html.classList.add("dark");
  else if (cfg.tema === "claro") html.classList.remove("dark");
  else html.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Carga perezosa de las fuentes elegidas en el editor.
  for (const familia of [cfg.tipografia.fuenteTitulos, cfg.tipografia.fuenteCuerpo]) {
    const href = urlFuente(familia);
    if (!href) continue;
    const id = `fuente-${familia.toLowerCase().replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) continue;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

export function AparienciaProvider({ inicial, children }: { inicial: AparienciaConfig; children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    ...aparienciaQueryOptions,
    initialData: { config: combinarApariencia(inicial) },
  });
  const config = data.config;
  const [previa, setPrevia] = useState<AparienciaConfig | null>(null);
  const efectivo = previa ?? config;

  useEffect(() => {
    aplicarApariencia(efectivo);
  }, [efectivo]);

  const valor = useMemo<ContextoApariencia>(
    () => ({
      config,
      mostrarVistaPrevia: (cfg) => {
        setPrevia(cfg);
        if (!cfg) void queryClient.invalidateQueries({ queryKey: CLAVE_APARIENCIA });
      },
    }),
    [config, queryClient],
  );

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useApariencia(): AparienciaConfig {
  return useContext(Ctx).config;
}

/** Texto configurable de la interfaz. Si no hay valor guardado usa el diseño original. */
export function useTexto(clave: keyof AparienciaConfig["textos"], defecto: string): string {
  const { config } = useContext(Ctx);
  return config.textos[clave] || defecto;
}

/** Acceso para el editor: config actual + función de vista previa. */
export function useAparienciaEditor() {
  return useContext(Ctx);
}
