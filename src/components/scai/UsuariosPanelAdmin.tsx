import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
   Trash2,
  UserCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { esGradoOnce, grupoOnce } from "@/lib/grados";

type Resp<T> = Promise<{
  data: T | null;
  error: { message: string } | null;
}>;

type Api = {
  from: (tabla: string) => {
    select: (columnas: string) => {
      order: (
        columna: string,
        opciones?: { ascending?: boolean },
      ) => Resp<Record<string, unknown>[]>;
    };
    delete: () => {
      eq: (columna: string, valor: string) => Resp<null>;
    };
  };
  rpc: (
    nombre: string,
    args: Record<string, unknown>,
  ) => Resp<{ ok: boolean; error?: string }>;
};

const api = supabase as unknown as Api;

/**
 * Trae TODOS los estudiantes paginando de 1000 en 1000 (la base de datos
 * corta cada consulta en 1000 filas; por eso faltaban estudiantes de 11°).
 */
async function cargarTodosLosEstudiantes(): Resp<Record<string, unknown>[]> {
  const sb = supabase as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        order: (c: string) => {
          range: (a: number, b: number) => Resp<Record<string, unknown>[]>;
        };
      };
    };
  };
  const todas: Record<string, unknown>[] = [];
  for (let page = 0; page < 100; page++) {
    const r = await sb
      .from("estudiantes")
      .select("id, nombre, grado, codigo_sis, activo")
      .order("id")
      .range(page * 1000, page * 1000 + 999);
    if (r.error) return { data: todas, error: r.error };
    const filas = r.data ?? [];
    todas.push(...filas);
    if (filas.length < 1000) break;
  }
  return { data: todas, error: null };
}

type UsuarioPanel = {
  id: string;
  nombre: string;
  usuario: string;
  panel: "control_escolar" | "horas_sociales";
  estudiante_id: string | null;
  activo: boolean;
  revocado_at: string | null;
};

type EstudianteOnce = {
  id: string;
  nombre: string;
  grado: string;
  codigo_sis: string;
};

const PANEL_LABEL: Record<UsuarioPanel["panel"], string> = {
  control_escolar: "Control escolar",
  horas_sociales: "Horas sociales (11°)",
};

const VACIO = {
  id: "",
  nombre: "",
  usuario: "",
  password: "",
  panel: "control_escolar" as UsuarioPanel["panel"],
  estudiante_id: "",
};

/**
 * Administración de usuarios autorizados para:
 * - Control escolar
 * - Horas sociales
 */
export function UsuariosPanelAdmin() {
  const [usuarios, setUsuarios] = useState<UsuarioPanel[]>([]);
  const [estudiantes, setEstudiantes] = useState<EstudianteOnce[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [verPassword, setVerPassword] = useState(false);
  const [editando, setEditando] = useState(false);

  const alumnosOnce = useMemo(
    () => estudiantes.filter((e) => esGradoOnce(e.grado)),
    [estudiantes],
  );

  // Estudiantes de 11° organizados por grupo (11°A, 11°B, ...).
  const gruposOnce = useMemo(() => {
    const mapa = new Map<string, EstudianteOnce[]>();
    for (const e of alumnosOnce) {
      const g = grupoOnce(e.grado);
      if (!mapa.has(g)) mapa.set(g, []);
      mapa.get(g)!.push(e);
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b, "es")))
      .map(([g, lista]) => ({
        grupo: g,
        titulo: g ? `11°${g}` : "11° (sin grupo)",
        lista: [...lista].sort((x, y) => x.nombre.localeCompare(y.nombre, "es")),
      }));
  }, [alumnosOnce]);

  async function cargar() {
    setCargando(true);

    const [u, e] = await Promise.all([
      api
        .from("usuarios_panel")
        .select(
          "id, nombre, usuario, panel, estudiante_id, activo, revocado_at",
        )
        .order("nombre"),

      cargarTodosLosEstudiantes(),
    ]);

    setCargando(false);

    if (u.error) {
      toast.error("No se pudieron cargar los usuarios autorizados.");
      return;
    }

    setUsuarios((u.data ?? []) as unknown as UsuarioPanel[]);

    const filas = (e.data ?? []) as unknown as (
      EstudianteOnce & { activo: boolean }
    )[];

    // Solo se excluyen los marcados explícitamente como inactivos.
    setEstudiantes(filas.filter((f) => f.activo !== false));
  }

  useEffect(() => {
    void cargar();
  }, []);

  function limpiar() {
    setForm(VACIO);
    setEditando(false);
    setVerPassword(false);
  }

  async function onGuardar(ev: React.FormEvent) {
    ev.preventDefault();

    if (form.nombre.trim().length < 3) {
      toast.error("Escribe el nombre completo de la persona.");
      return;
    }

    if (form.usuario.trim().length < 3) {
      toast.error("El usuario debe tener al menos 3 caracteres.");
      return;
    }

    /*
     * Para mantener la seguridad del sistema:
     * las contraseñas nuevas deben tener mínimo 6 caracteres.
     *
     * En edición, si no escribes nada, se conserva la contraseña actual.
     */
    if (
      (!editando && form.password.length < 6) ||
      (editando &&
        form.password.length > 0 &&
        form.password.length < 6)
    ) {
      toast.error("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (
      form.panel === "horas_sociales" &&
      !form.estudiante_id
    ) {
      toast.error(
        "Selecciona el estudiante de 11° que realizará las horas sociales.",
      );
      return;
    }

    setGuardando(true);

    const res = editando
      ? await api.rpc("admin_actualizar_usuario_panel", {
          p_id: form.id,
          p_nombre: form.nombre.trim(),
          p_usuario: form.usuario.trim(),
          p_panel: form.panel,
          p_estudiante_id: form.estudiante_id || null,
          p_activo: null,
        })
      : await api.rpc("admin_crear_usuario_panel", {
          p_nombre: form.nombre.trim(),
          p_usuario: form.usuario.trim(),
          p_password: form.password,
          p_panel: form.panel,
          p_estudiante_id: form.estudiante_id || null,
        });

    setGuardando(false);

    if (res.error) {
      toast.error(
        `No se pudo guardar: ${res.error.message}`,
      );
      return;
    }

    if (res.data && res.data.ok === false) {
      toast.error(
        res.data.error ?? "No se pudo guardar el usuario.",
      );
      return;
    }

    /*
     * Si estamos editando y se escribió una nueva contraseña,
     * la cambiamos después de actualizar los datos del usuario.
     */
    if (editando && form.password.length > 0) {
      const cambio = await api.rpc(
        "admin_cambiar_password_panel",
        {
          p_id: form.id,
          p_password: form.password,
        },
      );

      if (cambio.error) {
        toast.error(
          cambio.error.message ||
            "No se pudo cambiar la contraseña.",
        );
        return;
      }

      if (cambio.data && cambio.data.ok === false) {
        toast.error(
          cambio.data.error ??
            "No se pudo cambiar la contraseña.",
        );
        return;
      }
    }

    toast.success(
      editando
        ? "Usuario actualizado correctamente"
        : "Usuario autorizado creado correctamente",
    );

    limpiar();
    void cargar();
  }

  async function eliminar(u: UsuarioPanel) {
    const res = await api
      .from("usuarios_panel")
      .delete()
      .eq("id", u.id);

    if (res.error) {
      toast.error(`No se pudo eliminar el usuario: ${res.error.message}`);
      return;
    }

    toast.success("Usuario eliminado correctamente");
    void cargar();
  }

  function editar(u: UsuarioPanel) {
    setForm({
      id: u.id,
      nombre: u.nombre,
      usuario: u.usuario,
      /*
       * IMPORTANTE:
       * Nunca intentamos mostrar la contraseña actual.
       * La contraseña no debe recuperarse desde el sistema.
       * Para cambiarla, el coordinador debe escribir una nueva.
       */
      password: "",
      panel: u.panel,
      estudiante_id: u.estudiante_id ?? "",
    });

    setEditando(true);
    setVerPassword(false);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <UserCheck className="h-5 w-5 text-primary" />

          {editando
            ? "Editar usuario autorizado"
            : "Nuevo usuario autorizado"}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Las contraseñas se guardan cifradas. Ni el programa ni el
          coordinador pueden verlas después.
        </p>

        <form
          onSubmit={onGuardar}
          className="mt-5 grid gap-4 sm:grid-cols-2"
        >
          <div>
            <Label htmlFor="up-nombre">
              Nombre completo
            </Label>

            <Input
              id="up-nombre"
              value={form.nombre}
              maxLength={120}
              onChange={(e) =>
                setForm({
                  ...form,
                  nombre: e.target.value,
                })
              }
              className="mt-1 h-11"
            />
          </div>

          <div>
            <Label htmlFor="up-usuario">
              Usuario
            </Label>

            <Input
              id="up-usuario"
              autoComplete="off"
              placeholder="Ej: maria.gomez"
              value={form.usuario}
              maxLength={60}
              onChange={(e) =>
                setForm({
                  ...form,
                  usuario: e.target.value,
                })
              }
              className="mt-1 h-11"
            />
          </div>

          <div>
            <Label htmlFor="up-password">
              {editando
                ? "Nueva contraseña (opcional)"
                : "Contraseña"}
            </Label>

            <div className="relative mt-1">
              <Input
                id="up-password"
                type={
                  verPassword ? "text" : "password"
                }
                autoComplete="new-password"
                value={form.password}
                maxLength={72}
                onChange={(e) =>
                  setForm({
                    ...form,
                    password: e.target.value,
                  })
                }
                className="h-11 pr-12"
              />

              <button
                type="button"
                onClick={() =>
                  setVerPassword((v) => !v)
                }
                aria-label={
                  verPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
                className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {verPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Mínimo 6 caracteres. Si estás editando y no
              escribes nada, se conserva la contraseña actual.
            </p>
          </div>

          <div>
            <Label htmlFor="up-panel">
              Panel
            </Label>

            <Select
              value={form.panel}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  panel:
                    v as UsuarioPanel["panel"],
                })
              }
            >
              <SelectTrigger
                id="up-panel"
                className="mt-1 h-11 w-full cursor-pointer"
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem
                  value="control_escolar"
                  className="cursor-pointer"
                >
                  Control escolar
                </SelectItem>

                <SelectItem
                  value="horas_sociales"
                  className="cursor-pointer"
                >
                  Horas sociales (solo 11°)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.panel === "horas_sociales" && (
            <div className="sm:col-span-2">
              <Label htmlFor="up-est">
                Estudiante de grado 11°
              </Label>

              <Select
                value={form.estudiante_id}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    estudiante_id: v,
                  })
                }
              >
                <SelectTrigger
                  id="up-est"
                  className="mt-1 h-11 w-full cursor-pointer"
                >
                  <SelectValue placeholder="Selecciona un estudiante de 11°" />
                </SelectTrigger>

                <SelectContent>
                  {gruposOnce.map((g) => (
                    <SelectGroup key={g.grupo || "sin-grupo"}>
                      <SelectLabel>
                        {g.titulo} ({g.lista.length})
                      </SelectLabel>
                      {g.lista.map((e) => (
                        <SelectItem
                          key={e.id}
                          value={e.id}
                          className="cursor-pointer"
                        >
                          {e.nombre} · {e.grado} ·{" "}
                          {e.codigo_sis}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>

              {alumnosOnce.length === 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  No hay estudiantes de grado 11° activos
                  registrados.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 sm:col-span-2">
            <Button
              type="submit"
              size="lg"
              disabled={guardando}
              className="h-11 cursor-pointer"
            >
              {guardando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              {editando
                ? "Guardar cambios"
                : "Crear usuario"}
            </Button>

            {editando && (
              <Button
                type="button"
                variant="outline"
                className="h-11 cursor-pointer"
                onClick={limpiar}
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-card-foreground">
          <KeyRound className="h-5 w-5 text-primary" />
          Usuarios autorizados
        </h2>

        {cargando ? (
          <Loader2 className="mx-auto mt-6 h-6 w-6 animate-spin text-primary" />
        ) : usuarios.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            Todavía no hay usuarios autorizados.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border/60 rounded-2xl border border-border/60">
            {usuarios.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-card-foreground">
                    {u.nombre}{" "}
                    <span className="text-muted-foreground">
                      · {u.usuario}
                    </span>
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {PANEL_LABEL[u.panel]}
                    </Badge>

                    {u.activo ? (
                      <Badge variant="secondary">
                        Activo
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {u.revocado_at
                          ? "Revocado"
                          : "Inactivo"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => editar(u)}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>

                    <AlertDialogContent className="max-w-md rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ¿Eliminar al usuario {u.nombre}?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente al usuario y cerrará de inmediato cualquier sesión activa que tenga abierta.
                        </AlertDialogDescription>
                      </AlertDialogHeader>

                      <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">
                          Cancelar
                        </AlertDialogCancel>

                        <AlertDialogAction
                          className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => void eliminar(u)}
                        >
                          Eliminar definitivamente
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
