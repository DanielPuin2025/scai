import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, GraduationCap, UserCog } from "lucide-react";
import logo from "@/assets/logo-scai.png";
import { useApariencia, useTexto } from "@/lib/apariencia-context";
import { EquipoDesarrollo } from "@/components/scai/EquipoDesarrollo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "SCAI · Control de acceso — Megacolegio El Progreso" },
      {
        name: "description",
        content:
          "Sistema de Control de Acceso Institucional: registro de asistencia y faltas de los estudiantes, disponible con y sin internet.",
      },
      { property: "og:title", content: "SCAI · Control de acceso institucional" },
      {
        property: "og:description",
        content: "Registra asistencia y faltas de los estudiantes de forma segura, rápida y sin internet.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const apariencia = useApariencia();
  const nombreCompleto = useTexto("nombreCompleto", "Sistema de Control de Acceso Institucional");
  const lema = useTexto(
    "lemaInicio",
    "Registro y control de asistencia y faltas de los estudiantes del Megacolegio El Progreso.",
  );
  const textoCoordinador = useTexto(
    "textoCoordinador",
    "Inicia sesión para gestionar estudiantes, registrar faltas y consultar reportes.",
  );
  const textoControlEscolar = useTexto(
    "textoControlEscolar",
    "Ingreso autorizado para registrar estudiantes, llegadas tarde, uniforme e incidencias.",
  );
  const textoEstudiante = useTexto(
    "textoEstudiante",
    "Consulta tu propia información: asistencias, faltas, llegadas tarde y observaciones.",
  );
  const pie = useTexto("pieInicio", "Megacolegio El Progreso · SCAI");
  const alineacion =
    apariencia.logo.posicion === "izquierda"
      ? "items-start text-left"
      : apariencia.logo.posicion === "derecha"
        ? "items-end text-right"
        : "items-center text-center";

  return (
    <main data-modulo="inicio" className="relative flex min-h-screen flex-col overflow-hidden bg-suave">
      {apariencia.visibilidad.mostrarDecoracion ? (
        <>
          <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-pastel-mint/50 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-pastel-lavender/60 blur-3xl" />
        </>
      ) : null}

      <div className="relative mx-auto flex w-full flex-1 max-w-5xl flex-col items-center justify-center gap-10 px-5 py-12">
        <header className={`flex w-full flex-col ${alineacion}`}>
          {apariencia.logo.mostrar ? (
            <img
              src={apariencia.logo.url || logo}
              alt="Logo SCAI · Sistema de Control de Acceso Institucional"
              className={
                apariencia.logo.tamano > 0
                  ? "w-auto max-w-[85vw] object-contain drop-shadow-xl"
                  : "h-40 w-auto max-w-[85vw] object-contain drop-shadow-xl sm:h-56 lg:h-64"
              }
              style={
                apariencia.logo.tamano > 0 ? { height: `${apariencia.logo.tamano}px` } : undefined
              }
            />
          ) : null}
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {nombreCompleto}
          </h1>
          {apariencia.visibilidad.mostrarLema ? (
            <p className="mt-3 max-w-xl text-balance text-sm text-muted-foreground sm:text-base">
              {lema}
            </p>
          ) : null}
        </header>

        <nav className="grid w-full max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/coordinador"
            className="group flex flex-col items-center rounded-3xl border border-pastel-orange bg-pastel-orange px-6 py-10 text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-card/70 text-pastel-foreground shadow-card">
              <UserCog className="h-10 w-10" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-pastel-foreground sm:text-3xl">Coordinador</h2>
            <p className="mt-2 max-w-xs text-sm text-pastel-foreground/80">
              {textoCoordinador}
            </p>
          </Link>

          <Link
            to="/control-escolar"
            className="group flex flex-col items-center rounded-3xl border border-pastel-mint bg-pastel-mint px-6 py-10 text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-card/70 text-pastel-foreground shadow-card">
              <ClipboardList className="h-10 w-10" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-pastel-foreground sm:text-3xl">Control escolar</h2>
            <p className="mt-2 max-w-xs text-sm text-pastel-foreground/80">{textoControlEscolar}</p>
          </Link>

          <Link
            to="/estudiante"
            className="group flex flex-col items-center rounded-3xl border border-pastel-yellow bg-pastel-yellow px-6 py-10 text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-card/70 text-pastel-foreground shadow-card">
              <GraduationCap className="h-10 w-10" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-pastel-foreground sm:text-3xl">Estudiante</h2>
            <p className="mt-2 max-w-xs text-sm text-pastel-foreground/80">
              {textoEstudiante}
            </p>
          </Link>
        </nav>

        {apariencia.visibilidad.mostrarPie ? (
          <p className="text-xs text-muted-foreground">{pie}</p>
        ) : null}
      </div>
      <EquipoDesarrollo />
    </main>
  );
}
