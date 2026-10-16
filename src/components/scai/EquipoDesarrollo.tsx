import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Eye, UsersRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ingrid from "@/assets/equipo/ingrid.png";
import sharik from "@/assets/equipo/sharik.png";

const desarrolladoras = [
  { foto: ingrid, nombre: "INGRID YISEL MENDIBELSO CHAVITA" },
  { foto: sharik, nombre: "SHARIK JOHANA RINCON GUACHE" },
];

/** Local dialog state never changes the session or current route. */
export function EquipoDesarrollo() {
  return (
    <Dialog>
      <footer className="scai-creditos">
        <p>2026 SCAI (Sistema de Control de Acceso Institucional) - Derechos reservados, elaborado por:</p>
        <DialogTrigger asChild>
          <Button size="sm" className="scai-equipo-ver"><Eye aria-hidden="true" />Ver</Button>
        </DialogTrigger>
      </footer>
      <DialogPortal>
        <DialogOverlay className="scai-equipo-overlay" />
        <DialogPrimitive.Content className="scai-equipo-modal">
          <header className="scai-equipo-encabezado">
            <span className="scai-equipo-icono"><UsersRound size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <DialogTitle className="scai-equipo-titulo">EQUIPO DE DESARROLLO</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="scai-equipo-cerrar" aria-label="Cerrar equipo de desarrollo" title="Cerrar">
                <X aria-hidden="true" />
              </Button>
            </DialogClose>
          </header>
          <DialogDescription className="sr-only">Desarrolladoras del Sistema de Control de Acceso Institucional SCAI.</DialogDescription>
          <div className="scai-equipo-tarjetas">
            {desarrolladoras.map(({ foto, nombre }) => (
              <article key={nombre} className="scai-equipo-tarjeta">
                <img src={foto} alt={nombre} width={184} height={184} className="scai-equipo-foto" />
                <span className="scai-equipo-detalle" aria-hidden="true" />
                <h3>{nombre}</h3>
                <p>DESARROLLADORA</p>
              </article>
            ))}
          </div>
          <div className="scai-equipo-firma" aria-hidden="true">SCAI <span>·</span> Sistema de Control de Acceso Institucional</div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
