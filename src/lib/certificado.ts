import type { EncargadoHorasSociales } from "./coordinador.functions";

const RUTA = "/certificado-horas-sociales.pdf";

/**
 * Descarga exactamente la plantilla entregada, sin abrir otra pestaña
 * (algunos navegadores, como Edge, bloquean la pestaña nueva).
 */
export async function descargarCertificado(e: EncargadoHorasSociales) {
  const nombre = `certificado-horas-sociales-${e.nombre.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.pdf`;
  try {
    const resp = await fetch(RUTA, { cache: "no-store" });
    if (!resp.ok) throw new Error(String(resp.status));
    const blob = new Blob([await resp.arrayBuffer()], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    window.location.assign(RUTA);
  }
}
