import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarCheck, ShirtIcon, Timer, Users } from "lucide-react";
import { contarEstudiantes, listarGrados, obtenerReporte } from "@/lib/coordinador.functions";
import { FALTA_LABELS, type FaltaTipo } from "@/lib/scai-schemas";
import { Skeleton } from "@/components/ui/skeleton";
import { aniosAcademicos, anioPorDefecto, FECHA_MINIMA, limitarFecha } from "@/lib/anios";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CHART_COLORS = { tarde: "var(--color-chart-1)", uniforme: "var(--color-chart-2)" };

function hoyISO() {
  // Nunca se muestran fechas anteriores al año mínimo académico (2026).
  return limitarFecha(new Date().toISOString().slice(0, 10));
}
function haceDias(n: number) {
  return limitarFecha(new Date(Date.now() - n * 86400000).toISOString().slice(0, 10));
}
function formatoFecha(fecha: string | null) {
  if (!fecha) return "—";
  const [y, m, d] = fecha.split("-");
  return `${d}/${m}/${y}`;
}
function formatoHora(iso: string) {
  const f = new Date(iso);
  return Number.isNaN(f.getTime()) ? "—" : f.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

export function ReportPanel() {
  const reporte = useServerFn(obtenerReporte);
  const grados = useServerFn(listarGrados);
  const contar = useServerFn(contarEstudiantes);

  const [grado, setGrado] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [desde, setDesde] = useState(haceDias(30));
  const [hasta, setHasta] = useState(hoyISO());
  const [anio, setAnio] = useState(String(anioPorDefecto()));

  function cambiarAnio(valor: string) {
    setAnio(valor);
    setDesde(`${valor}-01-01`);
    setHasta(`${valor}-12-31`);
  }
  const gradosQuery = useQuery({ queryKey: ["grados"], queryFn: () => grados({ data: undefined }) });
  const totalQuery = useQuery({ queryKey: ["conteo-estudiantes"], queryFn: () => contar({ data: undefined }) });

  const filtros = {
    desde,
    hasta,
    grado: grado === "todos" ? undefined : grado,
    tipo: tipo === "todos" ? undefined : (tipo as FaltaTipo),
  };

  const { data, isPending } = useQuery({
    queryKey: ["reporte", filtros],
    queryFn: () => reporte({ data: filtros }),
  });

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/60 bg-pastel-blue/60 p-5 shadow-card">
        <h3 className="text-base font-semibold text-card-foreground">Filtros del reporte</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <Label htmlFor="r-anio">Año académico</Label>
            <Select value={anio} onValueChange={cambiarAnio}>
              <SelectTrigger id="r-anio" className="mt-1 w-full cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {aniosAcademicos().map((a) => (
                  <SelectItem key={a} value={String(a)} className="cursor-pointer">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="r-grado">Grado</Label>
            <Select value={grado} onValueChange={setGrado}>
              <SelectTrigger id="r-grado" className="mt-1 w-full">
                <SelectValue placeholder="Todos" />
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
          </div>
          <div>
            <Label htmlFor="r-tipo">Tipo de falta</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="r-tipo" className="mt-1 w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas las faltas</SelectItem>
                <SelectItem value="llegada_tarde">{FALTA_LABELS.llegada_tarde}</SelectItem>
                <SelectItem value="mal_uniforme">{FALTA_LABELS.mal_uniforme}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="r-desde">Desde</Label>
            <Input id="r-desde" type="date" min={FECHA_MINIMA} value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="r-hasta">Hasta</Label>
            <Input id="r-hasta" type="date" value={hasta} min={desde > FECHA_MINIMA ? desde : FECHA_MINIMA} onChange={(e) => setHasta(e.target.value)} className="mt-1" />
          </div>
        </div>

      </section>

      {isPending || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Estudiantes inscritos", value: totalQuery.data?.total ?? data.totales.estudiantes, icon: Users },
              { label: "Faltas totales", value: data.totales.total, icon: CalendarCheck },
              { label: "Llegadas tarde", value: data.totales.llegadaTarde, icon: Timer },
              { label: "Mal porte del uniforme", value: data.totales.malUniforme, icon: ShirtIcon },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-3xl border border-border/60 bg-pastel-blue/60 p-5 shadow-card">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-3 text-3xl font-semibold text-card-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-border/60 bg-pastel-blue/60 p-5 shadow-card">
              <h3 className="text-base font-semibold text-card-foreground">Faltas por grado</h3>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.porGrado.filter((g) => g.total > 0)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="grado" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={28} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="llegada_tarde" name="Llegada tarde" fill={CHART_COLORS.tarde} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="mal_uniforme" name="Mal porte del uniforme" fill={CHART_COLORS.uniforme} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          <div className="rounded-3xl border border-border/60 bg-pastel-blue/60 p-5 shadow-card">
            <h3 className="text-base font-semibold text-card-foreground">Resumen por grado</h3>
            <div className="mt-4 max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grado</TableHead>
                    <TableHead className="text-right">Estudiantes</TableHead>
                    <TableHead className="text-right">Llegada tarde</TableHead>
                    <TableHead className="text-right">Mal porte del uniforme</TableHead>
                    <TableHead className="text-right">Total faltas</TableHead>
                    <TableHead>Primera falta</TableHead>
                    <TableHead>Última falta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.porGrado.map((g) => (
                    <TableRow key={g.grado}>
                      <TableCell className="font-medium">{g.grado}</TableCell>
                      <TableCell className="text-right">{g.estudiantes}</TableCell>
                      <TableCell className="text-right">{g.llegada_tarde}</TableCell>
                      <TableCell className="text-right">{g.mal_uniforme}</TableCell>
                      <TableCell className="text-right font-semibold">{g.total}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatoFecha(g.primera_fecha)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatoFecha(g.ultima_fecha)}</TableCell>
                    </TableRow>
                  ))}
                  {data.porGrado.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Sin información para los filtros seleccionados.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="rounded-3xl bg-panel-oscuro p-5 text-panel-oscuro-foreground shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-bold">Faltas del periodo</h3>
              <button
                type="button"
                onClick={() => exportarCsv(data.recientes)}
                className="rounded-xl bg-panel-oscuro-soft px-3 py-2 text-sm font-bold text-panel-oscuro-foreground transition-colors hover:brightness-110"
              >
                Exportar CSV
              </button>
            </div>
            {data.recientes.length === 0 ? (
              <p className="mt-4 py-8 text-center text-sm font-semibold text-panel-oscuro-foreground/70">
                Sin faltas registradas con estos filtros.
              </p>
            ) : (
              <>
                <ul className="mt-4 grid max-h-[32rem] gap-3 overflow-auto pr-1 sm:grid-cols-2">
                  {data.recientes.map((r, i) => (
                    <li key={`${r.codigo_sis}-${r.fecha}-${r.tipo}-${i}`} className="rounded-2xl bg-panel-oscuro-soft p-4">
                      <p className="font-bold leading-tight">{r.nombre}</p>
                      <p className="mt-0.5 text-sm font-semibold text-panel-oscuro-foreground/80">
                        Grado {r.grado}
                      </p>
                      <dl className="mt-3 grid grid-cols-2 gap-2">
                        {[
                          { label: "Fecha", value: formatoFecha(r.fecha) },
                          { label: "Hora", value: formatoHora(r.hora) },
                          { label: "Llegada tarde", value: r.tipo === "llegada_tarde" ? "Sí" : "—" },
                          { label: "Mal porte de uniforme", value: r.tipo === "mal_uniforme" ? "Sí" : "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-xl bg-panel-oscuro p-2.5">
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-panel-oscuro-foreground/70">
                              {label}
                            </dt>
                            <dd className="mt-0.5 text-sm font-bold">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-panel-oscuro-soft p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-panel-oscuro-foreground/70">
                      <Timer className="h-3.5 w-3.5" /> Total llegadas tarde
                    </p>
                    <p className="mt-1 text-2xl font-bold">{data.totales.llegadaTarde}</p>
                  </div>
                  <div className="rounded-2xl bg-panel-oscuro-soft p-4">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-panel-oscuro-foreground/70">
                      <ShirtIcon className="h-3.5 w-3.5" /> Total mal porte de uniforme
                    </p>
                    <p className="mt-1 text-2xl font-bold">{data.totales.malUniforme}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function exportarCsv(
  rows: { fecha: string; hora: string; nombre: string; grado: string; tipo: string; codigo_sis: string }[],
) {
  const header = "Fecha,Hora,Codigo,Estudiante,Grado,Falta\n";
  const body = rows
    .map((r) =>
      [
        r.fecha,
        formatoHora(r.hora),
        r.codigo_sis,
        `"${r.nombre}"`,
        r.grado,
        r.tipo === "llegada_tarde" ? FALTA_LABELS.llegada_tarde : FALTA_LABELS.mal_uniforme,
      ].join(","),
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `faltas-scai-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
