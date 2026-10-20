import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, ClipboardList, FileDown, Loader2, ShirtIcon, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { resumenHorasSociales } from "@/lib/coordinador.functions";
import { fechaLarga, formatoHora12, horaDeFecha } from "@/lib/jornada-schemas";
import { FALTA_LABELS } from "@/lib/scai-schemas";
import { aniosAcademicos, anioPorDefecto } from "@/lib/anios";
import { descargarCertificado } from "@/lib/certificado";

export function JornadasHistorial() {
  const resumen = useServerFn(resumenHorasSociales);
  const [anio, setAnio] = useState(String(anioPorDefecto()));
  const [abiertos, setAbiertos] = useState<string[]>([]);

  const query = useQuery({
    queryKey: ["horas-sociales", anio],
    queryFn: () => resumen({ data: { anio: Number(anio) } }),
    refetchInterval: 30_000,
  });

  const encargados = query.data ?? [];

  function alternar(clave: string) {
    setAbiertos((prev) => (prev.includes(clave) ? prev.filter((c) => c !== clave) : [...prev, clave]));
  }

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-hs-borde bg-hs-azul p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-hs-foreground">
          <ClipboardList className="h-7 w-7" /> Horas sociales
        </h2>
        <p className="mt-2 text-sm text-hs-foreground/80">
          Cada jornada completada equivale a 1 hora, sin importar cuántos estudiantes se hayan registrado.
        </p>
        <div className="mt-4 w-44">
          <Select value={anio} onValueChange={setAnio}>
            <SelectTrigger className="h-11 w-full cursor-pointer bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aniosAcademicos().map((a) => (
                <SelectItem key={a} value={String(a)} className="cursor-pointer">
                  Año {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="rounded-3xl border border-hs-borde bg-card p-10 text-center shadow-card">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
        </div>
      ) : encargados.length === 0 ? (
        <p className="rounded-3xl border border-hs-borde bg-card p-6 text-center text-sm text-muted-foreground">
          Todavía no hay jornadas de horas sociales registradas en {anio}.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-hs-borde bg-card shadow-card">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead className="bg-hs-azul text-xs uppercase tracking-wide text-hs-foreground">
              <tr>
                <th className="px-4 py-3">Encargado</th>
                <th className="px-4 py-3">Grado</th>
                <th className="px-4 py-3">Total horas</th>
                <th className="px-4 py-3">Estudiantes registrados</th>
                <th className="px-4 py-3">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {encargados.map((e) => {
                const abierto = abiertos.includes(e.clave);
                return (
                  <Fragment key={e.clave}>
                    <tr className="border-t border-hs-borde">
                      <td className="px-4 py-3 font-medium text-card-foreground">{e.nombre}</td>
                      <td className="px-4 py-3">{e.grado}</td>
                      <td className="px-4 py-3 font-semibold">{e.totalHoras}</td>
                      <td className="px-4 py-3">{e.totalEstudiantes}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => alternar(e.clave)}
                            aria-expanded={abierto}
                            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-hs-aqua px-3 py-1 text-xs font-semibold text-hs-foreground"
                          >
                            {abierto ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            {abierto ? "Ocultar" : "Ver"} jornadas
                          </button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => descargarCertificado(e)}
                          >
                            <FileDown className="h-4 w-4" /> Descargar PDF
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {abierto && (
                      <tr className="border-t border-hs-borde bg-hs-azul/40">
                        <td colSpan={5} className="px-4 py-4">
                          <ul className="space-y-3">
                            {e.jornadas.map((j) => (
                              <li key={j.id} className="rounded-2xl border border-hs-borde bg-card p-4">
                                <p className="font-semibold text-card-foreground">
                                  {fechaLarga(j.fecha)} · {formatoHora12(j.hora_inicio)} a{" "}
                                  {formatoHora12(j.hora_fin)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {j.estado === "finalizada" ? "Jornada finalizada" : "Jornada activa"} · {j.horas}{" "}
                                  hora(s) · {j.registros.length} anotación(es)
                                </p>
                                {j.registros.length > 0 ? (
                                  <ul className="mt-2 divide-y divide-hs-borde">
                                    {j.registros.map((r) => (
                                      <li key={r.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                                        {r.tipo === "llegada_tarde" ? (
                                          <Timer className="h-4 w-4 text-hs-aqua-deep" />
                                        ) : (
                                          <ShirtIcon className="h-4 w-4 text-hs-lavanda-deep" />
                                        )}
                                        <span className="font-medium text-card-foreground">{r.nombre}</span>
                                        <span className="text-muted-foreground">Grado {r.grado}</span>
                                        <span className="text-muted-foreground">{FALTA_LABELS[r.tipo]}</span>
                                        <span className="ml-auto text-muted-foreground">{horaDeFecha(r.hora)}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-sm text-muted-foreground">Sin estudiantes registrados.</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Button variant="outline" className="cursor-pointer" onClick={() => void query.refetch()}>
        Actualizar
      </Button>
    </section>
  );
}
