import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, ShirtIcon, Timer, ClipboardList } from "lucide-react";
import {
  consultarEstudiante,
  listarGrados,
  type ConsultaEstudianteResultado,
  type ConsultaOpcion,
} from "@/lib/coordinador.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatoFecha(fecha: string) {
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}

function formatoHora(iso: string) {
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime())
    ? "—"
    : fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function ConsultaEstudiante() {
  const consultar = useServerFn(consultarEstudiante);
  const gradosFn = useServerFn(listarGrados);
  const [termino, setTermino] = useState("");
  const [grado, setGrado] = useState("todos");
  const gradosQuery = useQuery({ queryKey: ["grados"], queryFn: () => gradosFn({ data: undefined }) });
  const [resultado, setResultado] = useState<ConsultaEstudianteResultado | null>(null);
  const [opciones, setOpciones] = useState<ConsultaOpcion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const consulta = useMutation({
    mutationFn: (entrada: { termino?: string; id?: string; grado?: string }) => consultar({ data: entrada }),
    onSuccess: (res) => {
      if (res.ok === true) {
        setResultado(res.resultado);
        setOpciones([]);
        setError(null);
      } else if (res.ok === "varios") {
        setResultado(null);
        setOpciones(res.opciones);
        setError(null);
      } else {
        setResultado(null);
        setOpciones([]);
        setError(res.error);
      }
    },
    onError: () => {
      setResultado(null);
      setOpciones([]);
      setError("No se pudo completar la consulta. Intenta de nuevo.");
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valor = termino.trim();
    if (!valor && grado === "todos") return;
    consulta.mutate({
      termino: valor || undefined,
      grado: grado === "todos" ? undefined : grado,
    });
  }


  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="rounded-3xl border border-border/60 bg-pastel-mint/50 p-5 shadow-card">
        <Label htmlFor="consulta">Buscar estudiante</Label>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa el código, la identificación o el nombre, y si quieres filtra por grado.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Input
            id="consulta"
            value={termino}
            maxLength={80}
            placeholder="Ej: 1234567 o Ana Gómez"
            onChange={(e) => setTermino(e.target.value)}
            className="h-11"
          />
          <Select value={grado} onValueChange={setGrado}>
            <SelectTrigger aria-label="Grado" className="h-11 sm:w-48">
              <SelectValue placeholder="Todos los grados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los grados</SelectItem>
              {(gradosQuery.data ?? []).map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="lg" className="h-11 sm:w-40" disabled={consulta.isPending}>
            {consulta.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Consultar
          </Button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </form>

      {opciones.length > 0 && (
        <section className="rounded-3xl border border-border/60 bg-pastel-mint/50 p-5 shadow-card">
          <h3 className="text-base font-semibold text-card-foreground">
            {opciones.length} estudiantes coinciden. Selecciona uno:
          </h3>
          <ul className="mt-3 divide-y">
            {opciones.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-primary-soft/40"
                  onClick={() => consulta.mutate({ id: o.id })}
                >
                  <span className="text-sm font-medium text-card-foreground">{o.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    Código {o.codigo_sis} · Grado {o.grado}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}


      {resultado && (
        <>
          <section className="rounded-3xl border border-border/60 bg-pastel-mint/50 p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-card-foreground">{resultado.estudiante.nombre}</h3>
                <p className="text-sm text-muted-foreground">
                  Código {resultado.estudiante.codigo_sis} · Grado {resultado.estudiante.grado}
                </p>
              </div>
              <Badge variant={resultado.estudiante.activo ? "secondary" : "outline"}>
                {resultado.estudiante.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-primary-soft/40 p-4">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Identificación</dt>
                <dd className="mt-1 text-sm font-medium text-card-foreground">
                  {resultado.estudiante.tipo_id} {resultado.estudiante.identificacion ?? "—"}
                </dd>
              </div>
              <div className="rounded-2xl bg-primary-soft/40 p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" /> Total de faltas
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-card-foreground">{resultado.totales.total}</dd>
              </div>
              <div className="rounded-2xl bg-primary-soft/40 p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Timer className="h-3.5 w-3.5" /> Llegadas tarde
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-card-foreground">{resultado.totales.llegada_tarde}</dd>
              </div>
              <div className="rounded-2xl bg-primary-soft/40 p-4">
                <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <ShirtIcon className="h-3.5 w-3.5" /> Mal porte del uniforme
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-card-foreground">{resultado.totales.mal_uniforme}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl bg-panel-oscuro p-5 text-panel-oscuro-foreground shadow-card">
            <h3 className="text-base font-bold">Historial completo de faltas</h3>
            {resultado.historial.length === 0 ? (
              <p className="mt-3 text-sm font-semibold text-panel-oscuro-foreground/70">
                Este estudiante no tiene faltas registradas.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-panel-oscuro-soft hover:bg-transparent">
                      <TableHead className="font-bold text-panel-oscuro-foreground/80">Fecha</TableHead>
                      <TableHead className="font-bold text-panel-oscuro-foreground/80">Hora</TableHead>
                      <TableHead className="font-bold text-panel-oscuro-foreground/80">Llegada tarde</TableHead>
                      <TableHead className="font-bold text-panel-oscuro-foreground/80">Mal porte de uniforme</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resultado.historial.map((f) => (
                      <TableRow key={f.id} className="border-panel-oscuro-soft hover:bg-panel-oscuro-soft/50">
                        <TableCell className="whitespace-nowrap font-bold">{formatoFecha(f.fecha)}</TableCell>
                        <TableCell className="whitespace-nowrap font-bold">{formatoHora(f.hora)}</TableCell>
                        <TableCell className="font-bold">
                          {f.tipo === "llegada_tarde" ? "Sí" : "—"}
                        </TableCell>
                        <TableCell className="font-bold">
                          {f.tipo === "mal_uniforme" ? "Sí" : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
