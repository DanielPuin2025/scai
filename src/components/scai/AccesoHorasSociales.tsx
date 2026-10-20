import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarSesionPanel } from "@/lib/panel.functions";
import { guardarSesion, hoyLocal, type SesionPanel } from "@/lib/panel-sesion";
import { fechaLarga, formatoHora12, type EncargadoAutorizado, type HorarioControl, type Jornada } from "@/lib/jornada-schemas";

export type SesionHorasSociales = {
  encargado: EncargadoAutorizado;
  jornada: Jornada;
  horario: HorarioControl;
};

/**
 * Ingreso con USUARIO + CONTRASEÑA a Control Escolar y Horas Sociales.
 * Los usuarios los crea y autoriza el coordinador. Si el ingreso falla,
 * la contraseña escrita NO se borra.
 */
export function AccesoPanel({ onAcceso }: { onAcceso: (s: SesionPanel) => void }) {
  const entrar = useServerFn(iniciarSesionPanel);
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (usuario.trim().length < 3 || password.length < 1) {
      setError("Escribe tu usuario y tu contraseña.");
      return;
    }
    if (!navigator.onLine) {
      setError("Sin conexión: el ingreso necesita internet para verificar tus datos.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const res = await entrar({ data: { usuario: usuario.trim(), password } });
      if (!res.ok) {
        // La contraseña se conserva para que el usuario solo corrija lo necesario.
        setError(res.error);
        return;
      }
      const sesion: SesionPanel = {
        token: res.token,
        panel: res.panel,
        nombre: res.nombre,
        usuario: res.usuario,
        encargado: res.encargado,
        fecha: hoyLocal(),
      };
      guardarSesion(sesion);
      onAcceso(sesion);
      toast.success(`Bienvenido(a), ${res.nombre}`);
    } catch {
      setError("No se pudo verificar tu acceso. Intenta de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-lg rounded-3xl border border-hs-borde bg-card p-7 shadow-card">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hs-aqua text-hs-foreground">
        <ShieldCheck className="h-6 w-6" />
      </span>
      <h2 className="mt-4 text-xl font-semibold text-card-foreground">Ingreso autorizado</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Escribe el usuario y la contraseña que te entregó el coordinador. El acceso a horas sociales es únicamente para
        estudiantes de grado 11° autorizados.
      </p>
      <p className="mt-3 rounded-2xl bg-hs-azul px-4 py-3 text-sm font-medium text-hs-foreground">
        {fechaLarga(hoyLocal())}
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="usuario-panel">Usuario</Label>
          <Input
            id="usuario-panel"
            autoComplete="username"
            autoFocus
            placeholder="Ej: maria.gomez"
            value={usuario}
            maxLength={60}
            onChange={(e) => {
              setUsuario(e.target.value);
              setError(null);
            }}
            className="mt-1 h-12 text-base"
          />
        </div>

        <div>
          <Label htmlFor="password-panel">Contraseña</Label>
          <div className="relative mt-1">
            <Input
              id="password-panel"
              type={verPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              maxLength={72}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              className="h-12 pr-12 text-base"
            />
            <button
              type="button"
              onClick={() => setVerPassword((v) => !v)}
              aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {verPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-2xl bg-hs-lavanda px-4 py-3 text-sm font-medium text-hs-foreground">{error}</p>
        )}

        <Button type="submit" size="lg" disabled={enviando} className="h-12 w-full cursor-pointer">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Ingresar
        </Button>
      </form>
    </section>
  );
}

export { formatoHora12 };
