import { useCallback, useEffect, useState } from "react";
import type { FaltaTipo } from "./scai-schemas";

const KEY = "scai_pendientes_v1";

export type Pendiente = {
  id: string;
  kind: "asistencia" | "faltas";
  codigo: string;
  nombre: string;
  fecha: string;
  hora?: string;
  tipos?: FaltaTipo[];
};

function read(): Pendiente[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Pendiente[]) : [];
  } catch {
    return [];
  }
}

function write(items: Pendiente[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("scai-pendientes"));
}

export function encolar(item: Omit<Pendiente, "id">) {
  const items = read();
  items.push({ ...item, id: crypto.randomUUID() });
  write(items);
}

export function listarPendientes() {
  return read();
}

export function quitarPendiente(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function usePendientes() {
  const [items, setItems] = useState<Pendiente[]>([]);
  const [online, setOnline] = useState(true);

  const refresh = useCallback(() => setItems(read()), []);

  useEffect(() => {
    refresh();
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("scai-pendientes", refresh);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("scai-pendientes", refresh);
    };
  }, [refresh]);

  return { items, online, refresh };
}
