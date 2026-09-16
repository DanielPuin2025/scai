import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CloudOff, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { registrarFaltas } from "@/lib/scai.functions";
import { listarPendientes, quitarPendiente, usePendientes } from "@/lib/offline-queue";

export function PendientesBanner() {
  const { items, online, refresh } = usePendientes();
  const faltas = useServerFn(registrarFaltas);
  const [sincronizando, setSincronizando] = useState(false);

  async function sincronizar() {
    if (sincronizando) return;
    setSincronizando(true);
    let ok = 0;
    for (const p of listarPendientes()) {
      try {
        if (p.kind !== "faltas") {
          quitarPendiente(p.id);
          continue;
        }
        const res = await faltas({
          data: { codigo: p.codigo, tipos: p.tipos ?? [], fecha: p.fecha, hora: p.hora },
        });
        if (res.ok) {
          quitarPendiente(p.id);
          ok += 1;
        }
      } catch {
        break;
      }
    }
    setSincronizando(false);
    refresh();
    if (ok > 0) toast.success(`${ok} registro(s) sincronizado(s)`);
  }

  useEffect(() => {
    if (online && items.length > 0 && !sincronizando) void sincronizar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, items.length]);

  if (online && items.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CloudOff className="h-4 w-4" />
        {online
          ? `${items.length} registro(s) pendiente(s) de sincronizar`
          : `Modo sin conexión${items.length ? ` · ${items.length} pendiente(s)` : ""}`}
      </p>
      {online && items.length > 0 && (
        <Button size="sm" variant="secondary" onClick={sincronizar} disabled={sincronizando}>
          {sincronizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sincronizar
        </Button>
      )}
    </div>
  );
}
