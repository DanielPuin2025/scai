// src/components/scai/AsignacionesAdmin.tsx
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarCheck2, History, Loader2, Search, ShieldCheck, UserRound, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  buscarParaAsignar,
  crearAsignacion,
  fichaEncargado,
  finalizarAsignacion,
  gradosAsignacion,
  listarAsignaciones,
  type AsignacionFila,
  type CandidatoAsignacion,
} from "@/lib/asignaciones.functions";
import { FUNCIONES, FUNCION_LABELS, type FuncionEncargado } from "@/lib/encargado-schemas";
import { fechaLarga } from "@/lib/jornada-schemas";

const TODOS = "todos";

function fechaHora(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AsignacionesAdmin() {
  const qc = useQueryClient();
  const gradosFn = useServerFn(gradosAsignacion);
  const buscarFn = useServerFn(buscarParaAsignar);
  const listarFn = useServerFn(listarAsignaciones);

  const [numero, setNumero] = useState<string>(TODOS);
  const [grupo, setGrupo] = useState<string>(TODOS);
  const [termino, setTermino] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<CandidatoAsignacion[] | null>(null);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const gradosQuery = useQuery({ queryKey: ["asignacion-grados"], queryFn: () => gradosFn() });
  const vigentes = useQuery({
    queryKey: ["asignaciones", "vigentes"],
    queryFn: () => listarFn({ data: { estado: "vigentes" } }),
  });
  const historial = useQuery({
    queryKey: ["asignaciones", "todas"],
    queryFn: () => listarFn({ data: { estado: "todas" } }),
  });

  const grupos = useMemo(() => {
    const lista = gradosQuery.data ?? [];
    if (numero === TODOS) return [];
    return lista.find((g) => String(g.numero) === numero)?.grupos ?? [];
  }, [gradosQuery.data, numero]);

  function gruposFiltro(): string[] | undefined {
    if (grupo !== TODOS) return [grupo];
    if (numero !== TODOS) return grupos.length > 0 ? grupos : undefined;
    return undefined;
  }

  async function onBuscar(e?: React.FormEvent) {
    e?.preventDefault();
    setBuscando(true);
    try {
      const res = await buscarFn({ data: { q: termino.trim() || undefined, grupos: gruposFiltro() } });
      setResultados(res);
    } catch {
      toast.error("No se pudo buscar. Intenta de nuevo.");
    } finally {
      setBuscando(false);
    }
  }

  function refrescar() {
    void qc.invalidateQueries({ queryKey: ["asignaciones"] });
    void qc.invalidateQueries({ queryKey: ["ficha-encargado"] });
  }

  const vigentePorEstudiante = new Map((vigentes.data ?? []).map((a) => [a.estudiante.id, a]));

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <h2 className="text-lg font-semibold text-card-foreground">Asignar encargado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Filtra por grado (6.º a 11.º) y grupos existentes, busca por nombre, apellido o código y abre la ficha del estudiante.
        </p>

        <form onSubmit={onBuscar} className="mt-5 grid gap-3 md:grid-cols-[10rem_12rem_1fr_auto] md:items-end">
          <div>
            <Label htmlFor="asig-grado">Grado</Label>
            <Select
              value={numero}
              onValueChange={(v) => {
                setNumero(v);
                setGrupo(TODOS);
              }}
            >
              <SelectTrigger id="asig-grado" className="mt-1 h-11 w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>6.º a 11.º</SelectItem>
                {(gradosQuery.data ?? []).map((g) => (
                  <SelectItem key={g.numero} value={String(g.numero)}>
                    {g.numero}.º
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="asig-grupo">Grupo</Label>
            <Select value={grupo} onValueChange={setGrupo} disabled={numero === TODOS}>
              <SelectTrigger id="asig-grupo" className="mt-1 h-11 w-full">
                <SelectValue placeholder="Todos los grupos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TODOS}>Todos los grupos</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {numero !== TODOS && grupos.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">No hay grupos registrados en este grado.</p>
            )}
          </div>
          <div>
            <Label htmlFor="asig-q">Nombre, apellido o código</Label>
            <Input
              id="asig-q"
              value={termino}
              maxLength={80}
              autoComplete="off"
              placeholder="Ej: gomez o 00712"
              onChange={(e) => setTermino(e.target.value)}
              className="mt-1 h-11"
            />
          </div>
          <Button type="submit" className="h-11" disabled={buscando}>
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
          </Button>
        </form>

        {resultados !== null && (
          <div className="mt-5">
            {resultados.length === 0 ? (
              <p className="rounded-2xl border border-border/60 bg-muted px-4 py-3 text-sm text-muted-foreground">
                No se encontraron estudiantes con esos filtros.
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-border overflow-auto rounded-2xl border border-border/60">
                {resultados.map((r) => {
                  const vig = vigentePorEstudiante.get(r.id);
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => setSeleccionado(r.id)}
                        className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted"
                      >
                        <span className="font-medium text-card-foreground">{r.nombre}</span>
                        <span className="flex items-center gap-2 text-xs text-muted-foreground">
                          Código {r.codigo_sis} · Grado {r.grado}
                          {vig && <Badge variant="secondary">{FUNCION_LABELS[vig.funcion]}</Badge>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </section>

      {seleccionado && (
        <FichaEstudiante
          estudianteId={seleccionado}
          onCerrar={() => setSeleccionado(null)}
          onCambio={refrescar}
        />
      )}

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <Tabs defaultValue="vigentes">
          <TabsList>
            <TabsTrigger value="vigentes">
              <ShieldCheck className="mr-1 h-4 w-4" /> Vigentes
            </TabsTrigger>
            <TabsTrigger value="historial">
              <History className="mr-1 h-4 w-4" /> Historial
            </TabsTrigger>
          </TabsList>
          <TabsContent value="vigentes" className="mt-4">
            <TablaAsignaciones
              filas={vigentes.data}
              cargando={vigentes.isLoading}
              vacio="No hay encargados con asignación vigente."
              onVer={setSeleccionado}
              onCambio={refrescar}
            />
          </TabsContent>
          <TabsContent value="historial" className="mt-4">
            <TablaAsignaciones
              filas={historial.data}
              cargando={historial.isLoading}
              vacio="Aún no hay asignaciones registradas."
              onVer={setSeleccionado}
              onCambio={refrescar}
            />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function TablaAsignaciones({
  filas,
  cargando,
  vacio,
  onVer,
  onCambio,
}: {
  filas: AsignacionFila[] | undefined;
  cargando: boolean;
  vacio: string;
  onVer: (id: string) => void;
  onCambio: () => void;
}) {
  if (cargando) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />;
  if (!filas || filas.length === 0) return <p className="text-sm text-muted-foreground">{vacio}</p>;
  return (
    <ul className="divide-y divide-border rounded-2xl border border-border/60">
      {filas.map((a) => (
        <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={() => onVer(a.estudiante.id)} className="min-w-0 text-left">
            <p className="font-medium text-card-foreground hover:underline">{a.estudiante.nombre}</p>
            <p className="text-xs text-muted-foreground">
              Código {a.estudiante.codigo_sis} · Grado {a.estudiante.grado} · Desde {fechaHora(a.created_at)}
              {a.finalizada_at ? ` · Hasta ${fechaHora(a.finalizada_at)}` : ""}
            </p>
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{FUNCION_LABELS[a.funcion]}</Badge>
            <Badge variant="outline">
              {a.horas} {a.horas === 1 ? "hora" : "horas"}
            </Badge>
            {a.activa ? (
              <BotonFinalizar asignacion={a} onCambio={onCambio} />
            ) : (
              <Badge variant="outline">Finalizada</Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function BotonFinalizar({ asignacion, onCambio }: { asignacion: AsignacionFila; onCambio: () => void }) {
  const finalizarFn = useServerFn(finalizarAsignacion);
  const [enviando, setEnviando] = useState(false);
  async function confirmar() {
    setEnviando(true);
    try {
      const res = await finalizarFn({ data: { id: asignacion.id } });
      if (!res.ok) toast.error(res.error);
      else toast.success("Asignación finalizada. El encargado ya no puede ingresar.");
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo finalizar.");
    } finally {
      setEnviando(false);
    }
  }
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={enviando}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Finalizar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Finalizar la asignación?</AlertDialogTitle>
          <AlertDialogDescription>
            {asignacion.estudiante.nombre} dejará de tener acceso a Control Escolar. Sus horas y registros se conservan en el historial.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => void confirmar()}>Finalizar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FichaEstudiante({
  estudianteId,
  onCerrar,
  onCambio,
}: {
  estudianteId: string;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const fichaFn = useServerFn(fichaEncargado);
  const crearFn = useServerFn(crearAsignacion);
  const [funcion, setFuncion] = useState<FuncionEncargado>("registro_control_escolar");
  const [guardando, setGuardando] = useState(false);

  const ficha = useQuery({
    queryKey: ["ficha-encargado", estudianteId],
    queryFn: () => fichaFn({ data: { estudiante_id: estudianteId } }),
  });

  const vigente = ficha.data?.asignaciones.find((a) => a.activa);

  async function guardar() {
    setGuardando(true);
    try {
      const res = await crearFn({ data: { estudiante_id: estudianteId, funcion } });
      if (!res.ok) toast.error(res.error);
      else toast.success("Asignación guardada. El estudiante ingresa con su código institucional.");
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="rounded-3xl border border-hs-borde bg-hs-azul p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-primary">
            <UserRound className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-hs-foreground/70">Ficha del estudiante</p>
            <h3 className="text-lg font-semibold text-hs-foreground">
              {ficha.data?.estudiante.nombre ?? "Cargando…"}
            </h3>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onCerrar} aria-label="Cerrar ficha">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {ficha.isLoading ? (
        <Loader2 className="mx-auto mt-4 h-5 w-5 animate-spin text-primary" />
      ) : !ficha.data ? (
        <p className="mt-4 text-sm text-hs-foreground">No se encontró el estudiante.</p>
      ) : (
        <div className="mt-4 space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            <Dato etiqueta="Código" valor={ficha.data.estudiante.codigo_sis} />
            <Dato etiqueta="Grado" valor={ficha.data.estudiante.grado} />
            <Dato
              etiqueta="Documento"
              valor={
                ficha.data.estudiante.identificacion
                  ? `${ficha.data.estudiante.tipo_id ?? ""} ${ficha.data.estudiante.identificacion}`.trim()
                  : "—"
              }
            />
            <Dato etiqueta="Horas sociales" valor={String(ficha.data.horas_total)} />
          </dl>

          {vigente ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-card p-4">
              <p className="text-sm text-card-foreground">
                Asignación vigente: <strong>{FUNCION_LABELS[vigente.funcion]}</strong> desde {fechaHora(vigente.created_at)}
              </p>
              <BotonFinalizar
                asignacion={{
                  ...vigente,
                  horas: 0,
                  estudiante: {
                    id: ficha.data.estudiante.id,
                    codigo_sis: ficha.data.estudiante.codigo_sis,
                    nombre: ficha.data.estudiante.nombre,
                    grado: ficha.data.estudiante.grado,
                  },
                }}
                onCambio={onCambio}
              />
            </div>
          ) : (
            <div className="grid gap-3 rounded-2xl bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <Label htmlFor="asig-funcion">Función</Label>
                <Select value={funcion} onValueChange={(v) => setFuncion(v as FuncionEncargado)}>
                  <SelectTrigger id="asig-funcion" className="mt-1 h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUNCIONES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {FUNCION_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="h-11" onClick={() => void guardar()} disabled={guardando || !ficha.data.estudiante.activo}>
                {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Guardar asignación
              </Button>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-card p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                <History className="h-4 w-4" /> Historial de asignaciones
              </h4>
              {ficha.data.asignaciones.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Sin asignaciones anteriores.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {ficha.data.asignaciones.map((a) => (
                    <li key={a.id} className="text-muted-foreground">
                      <span className="text-card-foreground">{FUNCION_LABELS[a.funcion]}</span> ·{" "}
                      {fechaHora(a.created_at)} → {a.activa ? "vigente" : fechaHora(a.finalizada_at)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-2xl bg-card p-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
                <CalendarCheck2 className="h-4 w-4" /> Últimas jornadas
              </h4>
              {ficha.data.jornadas.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Sin jornadas registradas.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm">
                  {ficha.data.jornadas.map((j) => (
                    <li key={j.id} className="text-muted-foreground">
                      <span className="capitalize text-card-foreground">{fechaLarga(j.fecha)}</span> ·{" "}
                      {j.acreditada ? "1 hora acreditada" : j.estado === "finalizada" ? "finalizada" : "en curso"}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-card p-3">
      <dt className="text-xs text-muted-foreground">{etiqueta}</dt>
      <dd className="font-medium text-card-foreground">{valor}</dd>
    </div>
  );
}
