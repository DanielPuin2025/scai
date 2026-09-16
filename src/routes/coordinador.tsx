import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EstudiantesAdmin } from "@/components/scai/EstudiantesAdmin";
import { ConsultaEstudiante } from "@/components/scai/ConsultaEstudiante";
import { ReportPanel } from "@/components/scai/ReportPanel";
import logo from "@/assets/logo-scai.png";

export const Route = createFileRoute("/coordinador")({
  head: () => ({
    meta: [
      { title: "Panel del coordinador · SCAI" },
      {
        name: "description",
        content:
          "Panel de coordinacion para gestionar estudiantes, faltas y reportes institucionales.",
      },
      { property: "og:title", content: "Panel del coordinador · SCAI" },
      {
        property: "og:description",
        content: "Gestiona estudiantes y consulta reportes de faltas y asistencia.",
      },
    ],
  }),
  component: CoordinadorPage,
});

function CoordinadorPage() {
  return (
    <main className="min-h-screen bg-suave pb-16">
      <header className="bg-institucional px-5 py-6">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <Link to="/" aria-label="Volver al inicio">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <img
            src={logo}
            alt=""
            width={1200}
            height={1137}
            className="h-10 w-auto shrink-0 rounded-lg bg-primary-foreground/90 p-1"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-foreground/70">
              SCAI
            </p>
            <h1 className="text-xl font-semibold text-primary-foreground">
              Panel del coordinador
            </h1>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 w-full max-w-6xl px-5">
        <Tabs defaultValue="consulta" className="space-y-5">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="consulta" className="flex-1 sm:flex-none">
              Registro rapido
            </TabsTrigger>
            <TabsTrigger value="reportes" className="flex-1 sm:flex-none">
              Reportes
            </TabsTrigger>
            <TabsTrigger value="estudiantes" className="flex-1 sm:flex-none">
              Gestion estudiantes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="consulta">
            <ConsultaEstudiante />
          </TabsContent>
          <TabsContent value="reportes">
            <ReportPanel />
          </TabsContent>
          <TabsContent value="estudiantes">
            <EstudiantesAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
