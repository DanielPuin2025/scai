import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Loader2, Pencil, Plus, Search } from "lucide-react";
import {
  cambiarEstadoEstudiante,
  cerrarAnioEscolar,
  guardarEstudiante,
  listarEstudiantes,
  listarGrados,
  type EstudianteRow,
} from "@/lib/coordinador.functions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const VACIO = {
  id: undefined as string | undefined,
  codigo_sis: "",
  nombre: "",
  grado: "",
  tipo_id: "TI",
  identificacion: "",
};

export function EstudiantesAdmin() {
  const qc = useQueryClient();
  const listar = useServerFn(listarEstudiantes);
  const grados = useServerFn(listarGrados);
  const guardar = useServerFn(guardarEstudiante);
  const archivar = useServerFn(cambiarEstadoEstudiante);

  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [grado, setGrado] = useState("todos");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<typeof VACIO | null>(null);
  const [aEliminar, setAEliminar] = useState<EstudianteRow | null>(null);
  const [cierre, setCierre] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const cerrarAnio = useServerFn(cerrarAnioEscolar);

  const cierreMut = useMutation({
    mutationFn: () =>
      cerrarAnio({
        data: {
          grado: grado === "todos" ? undefined : grado,
          confirmacion: "ARCHIVAR" as const,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${res.archivados} estudiantes archivados. El historial se conserva.`);
      setCierre(false);
      setConfirmacion("");
      void qc.invalidateQueries({ queryKey: ["estudiantes"] });
    },
    onError: () => toast.error("No se pudo cerrar el año escolar"),
  });


  const gradosQuery = useQuery({ queryKey: ["grados"], queryFn: () => grados({ data: undefined }) });
  const { data, isPending } = useQuery({
    queryKey: ["estudiantes", busqueda, grado, page],
    queryFn: () =>
      listar({ data: { q: busqueda || undefined, grado: grado === "todos" ? undefined : grado, page } }),
  });

  const guardarMut = useMutation({
    mutationFn: (values: typeof VACIO) =>
      guardar({
        data: {
          id: values.id,
          codigo_sis: values.codigo_sis,
          nombre: values.nombre,
          grado: values.grado,
          tipo_id: values.tipo_id,
          identificacion: values.identificacion,
        },
      }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Estudiante guardado");
      setForm(null);
      void qc.invalidateQueries({ queryKey: ["estudiantes"] });
    },
    onError: () => toast.error("Revisa los datos del formulario"),
  });

  const archivarMut = useMutation({
    mutationFn: (row: EstudianteRow) => archivar({ data: { id: row.id, activo: !row.activo } }),
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Estado del estudiante actualizado");
      setAEliminar(null);
      void qc.invalidateQueries({ queryKey: ["estudiantes"] });
    },
  });

  const totalPaginas = data ? Math.max(1, Math.ceil(data.count / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-pastel-lavender/50 p-5 shadow-card sm:flex-row sm:items-end">
        <form
          className="flex flex-1 flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setBusqueda(q.trim());
          }}
        >
          <div className="flex-1">
            <Label htmlFor="buscar">Buscar</Label>
            <Input
              id="buscar"
              value={q}
              maxLength={80}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre o código"
              className="mt-1"
            />
          </div>
          <div className="sm:w-48">
            <Label htmlFor="grado">Grado</Label>
            <Select
              value={grado}
              onValueChange={(v) => {
                setGrado(v);
                setPage(0);
              }}
            >
              <SelectTrigger id="grado" className="mt-1 w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(gradosQuery.data ?? []).map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="secondary" className="sm:mt-6">
            <Search className="h-4 w-4" /> Filtrar
          </Button>
        </form>
        <Button onClick={() => setForm({ ...VACIO })} className="sm:mt-6">
          <Plus className="h-4 w-4" /> Nuevo estudiante
        </Button>
        <Button variant="outline" onClick={() => setCierre(true)} className="sm:mt-6">
          <Archive className="h-4 w-4" /> Cerrar año escolar
        </Button>
      </div>


      <div className="rounded-3xl border border-border/60 bg-pastel-lavender/50 p-5 shadow-card">
        {isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Grado</TableHead>
                  <TableHead>Identificación</TableHead>
                  <TableHead className="text-center">Faltas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).map((r) => (
                  <TableRow key={r.id} className={r.activo ? undefined : "opacity-60"}>
                    <TableCell className="whitespace-nowrap font-mono text-xs">{r.codigo_sis}</TableCell>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell>{r.grado}</TableCell>
                    <TableCell>{r.identificacion ?? "—"}</TableCell>
                    <TableCell className="text-center">
                      <span title={`Llegada tarde: ${r.faltas.llegada_tarde} · Mal porte del uniforme: ${r.faltas.mal_uniforme}`}>
                        {r.faltas.total}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          r.activo ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.activo ? "Activo" : "Archivado"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Editar ${r.nombre}`}
                        onClick={() =>
                          setForm({
                            id: r.id,
                            codigo_sis: r.codigo_sis,
                            nombre: r.nombre,
                            grado: r.grado,
                            tipo_id: r.tipo_id ?? "TI",
                            identificacion: r.identificacion ?? "",
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${r.activo ? "Archivar" : "Reactivar"} ${r.nombre}`}
                        title={r.activo ? "Archivar (conserva el historial)" : "Reactivar"}
                        onClick={() => setAEliminar(r)}
                      >
                        {r.activo ? (
                          <Archive className="h-4 w-4 text-destructive" />
                        ) : (
                          <ArchiveRestore className="h-4 w-4 text-primary" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No se encontraron estudiantes.
                    </TableCell>
                  </TableRow>
                )}

              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data?.count ?? 0} estudiantes</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span>
              {page + 1} / {totalPaginas}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPaginas}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar estudiante" : "Nuevo estudiante"}</DialogTitle>
            <DialogDescription>Los campos marcados son obligatorios.</DialogDescription>
          </DialogHeader>
          {form && (
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                guardarMut.mutate(form);
              }}
            >
              <div className="sm:col-span-2">
                <Label htmlFor="f-nombre">Nombre completo *</Label>
                <Input
                  id="f-nombre"
                  value={form.nombre}
                  maxLength={120}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="f-codigo">Código *</Label>
                <Input
                  id="f-codigo"
                  value={form.codigo_sis}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, codigo_sis: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="f-grado">Grado *</Label>
                <Input
                  id="f-grado"
                  value={form.grado}
                  maxLength={20}
                  onChange={(e) => setForm({ ...form, grado: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="f-tipo">Tipo de documento</Label>
                <Input
                  id="f-tipo"
                  value={form.tipo_id}
                  maxLength={10}
                  onChange={(e) => setForm({ ...form, tipo_id: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="f-ident">Identificación</Label>
                <Input
                  id="f-ident"
                  value={form.identificacion}
                  maxLength={30}
                  onChange={(e) => setForm({ ...form, identificacion: e.target.value })}
                  className="mt-1"
                />
              </div>
              <DialogFooter className="sm:col-span-2">
                <Button type="button" variant="outline" onClick={() => setForm(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={guardarMut.isPending}>
                  {guardarMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={aEliminar !== null} onOpenChange={(o) => !o && setAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{aEliminar?.activo ? "Archivar estudiante" : "Reactivar estudiante"}</AlertDialogTitle>
            <AlertDialogDescription>
              {aEliminar?.activo
                ? `${aEliminar?.nombre} quedará archivado. Su historial de faltas se conserva íntegro.`
                : `${aEliminar?.nombre} volverá a estar activo.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => aEliminar && archivarMut.mutate(aEliminar)}>
              {aEliminar?.activo ? "Archivar" : "Reactivar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={cierre}
        onOpenChange={(o) => {
          setCierre(o);
          if (!o) setConfirmacion("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar año escolar</DialogTitle>
            <DialogDescription>
              {grado === "todos"
                ? "Se archivarán todos los estudiantes activos."
                : `Se archivarán los estudiantes activos del grado ${grado}.`}{" "}
              No se elimina ninguna falta ni observación: el historial queda intacto.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="conf">
              Escribe <span className="font-mono font-semibold">ARCHIVAR</span> para confirmar
            </Label>
            <Input
              id="conf"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value.toUpperCase())}
              className="mt-1"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCierre(false)}>
              Cancelar
            </Button>
            <Button
              disabled={confirmacion !== "ARCHIVAR" || cierreMut.isPending}
              onClick={() => cierreMut.mutate()}
            >
              {cierreMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Archivar año
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

  );
}
