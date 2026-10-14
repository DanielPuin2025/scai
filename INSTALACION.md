# Instalación de SCAI (fuera de Lovable)

SCAI funciona fuera de Lovable sin cambios de código. Solo necesita Node.js y las
variables de conexión a Supabase.

## Requisitos previos

- Node.js 20 o posterior (<https://nodejs.org>), con npm incluido.
- Visual Studio Code (opcional).
- Acceso al proyecto Supabase indicado por las variables de entorno.

## Abrir el proyecto

1. Descomprime el ZIP.
2. En Visual Studio Code: **Archivo > Abrir carpeta** y elige la carpeta que contiene `package.json`.
3. Abre la terminal integrada. Todos los comandos se ejecutan desde esa carpeta.

## Variables de entorno

1. Copia `.env.example` como `.env`.
2. Complétalo con los valores del proyecto Supabase (Supabase > Project Settings > API):

| Variable | Dónde se usa | Valor |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Navegador | URL del proyecto, `https://<project_id>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Navegador | Clave pública (publishable / anon) |
| `VITE_SUPABASE_PROJECT_ID` | Navegador | `project_id` |
| `SUPABASE_URL` | Servidor | Igual que `VITE_SUPABASE_URL` |
| `SUPABASE_PUBLISHABLE_KEY` | Servidor | Igual que `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_PROJECT_ID` | Servidor | `project_id` |
| `SUPABASE_SERVICE_ROLE_KEY` | Servidor (opcional) | Clave de servicio. **No es necesaria**: sin ella SCAI usa la clave pública y las funciones RPC seguras. Si la usas, nunca la compartas ni la subas a git. |
| `DATABASE_URL` | Solo `drizzle-kit` (opcional) | Cadena de conexión Postgres, solo si usas drizzle para inspeccionar la base |

Las variables `VITE_*` se incorporan al compilar: si las cambias, vuelve a compilar.
El archivo `.env` no se debe subir al repositorio; `.env.example` contiene solo nombres y valores vacíos.

## Ejecutar en modo desarrollo

```bash
npm install
npm run dev
```

Abre la dirección que muestre la terminal (normalmente `http://localhost:8080`).

## Versión de producción (servidor Node.js independiente)

```bash
npm run build:node
npm start
```

`build:node` genera `.output/server/index.mjs`, un servidor Node.js completo
(páginas + funciones del servidor). `npm start` lo ejecuta en el puerto 3000
(cámbialo con la variable `PORT`). Las variables del servidor deben estar
definidas en el entorno donde corre `npm start` (por ejemplo, cargando `.env`
o configurándolas en el hosting). Para un VPS con Docker Compose y HTTPS
automático, sigue la sección **Despliegue en VPS** del `README.md`.

Otros destinos: `npm run build` genera la versión para Cloudflare Workers.
También puedes definir `NITRO_PRESET` (por ejemplo `vercel` o `netlify`) antes de `npm run build`.

## Base de datos y migraciones

Todas las migraciones están juntas y en orden en `supabase/migrations/`:

- Tablas: `estudiantes`, `faltas` (tipos `llegada_tarde` y `mal_uniforme`), `asistencias`,
  `observaciones`, `profiles`, `user_roles`, `horario_control`, `jornadas`,
  `usuarios_panel`, `sesiones_panel`, `apariencia`.
- Funciones RPC: `panel_login`, `panel_logout`, `panel_abrir_jornada`, `panel_jornada`,
  `panel_finalizar_jornada`, `panel_registrar_faltas`, `panel_registros_jornada`,
  `panel_buscar_estudiantes`, `panel_directorio`, `panel_estudiante`, `panel_grados`,
  `estudiante_login`, `estudiante_mis_datos`, `admin_*_usuario_panel`, entre otras.
- `20261001000000_sincronizar_horario_jornada.sql`: al abrir o reanudar una jornada de
  Horas Sociales se aplica siempre el horario vigente del coordinador, por lo que el
  estudiante ve el horario actualizado automáticamente.

**Proyecto Supabase existente:** antes de ejecutar migraciones, verifica el historial
de migraciones de ese proyecto. No marques migraciones como aplicadas sin confirmar
que sus cambios ya existen en la base de datos.

```bash
npx supabase link --project-ref <project_ref>
npx supabase migration list
```

**Proyecto Supabase nuevo (vacío):**

```bash
npx supabase link --project-ref <nuevo_project_id>
npx supabase db push
```

Luego actualiza el `.env` con la URL y la clave del nuevo proyecto. (Los estudiantes y
usuarios del panel deben cargarse de nuevo, ya que los datos no viajan en las migraciones.)

> Las carpetas `drizzle/migrations/` y `sql/` se conservan solo como referencia histórica;
> su contenido ya está incluido en `supabase/migrations/`.

## Uso desde otro dispositivo

```bash
npm run dev -- --host
```

Abre en el otro dispositivo la dirección de red que muestre la terminal. Para uso diario
y para instalar la PWA usa una versión publicada con HTTPS.

## Instalar como PWA

1. Abre la versión publicada de SCAI en Chrome, Edge o Safari.
2. Usa **Instalar aplicación** o **Añadir a pantalla de inicio**.

El service worker solo se registra en producción. La cola de registros pendientes se
conserva en el dispositivo y se sincroniza al volver la conexión.

## Referencias a Lovable en el código

Ninguna es indispensable:

- `@lovable.dev/vite-tanstack-config` es un paquete público de npm que agrupa la configuración de Vite; funciona en cualquier computador.
- `previewAuthStorage.ts`, `lovable-error-reporting.ts` y las comprobaciones de `pwa.ts` solo se activan dentro del editor de Lovable; fuera de él usan `localStorage` normal o no hacen nada.

## Estructura básica

- `src/routes/`: páginas de inicio, estudiante, coordinador y control escolar.
- `src/components/scai/`: módulos de SCAI.
- `src/lib/`: acceso a datos (`*.functions.ts`, `db.server.ts`), horarios, reportes, cola offline y apariencia.
- `src/integrations/supabase/`: clientes de Supabase.
- `supabase/migrations/`: estructura completa de la base de datos.
- `scripts/build-node.mjs`: compilación como servidor Node.js.
- `public/`: manifiesto, iconos y archivos públicos.

## Editor de apariencia

Está en **Panel del coordinador > Editor**. Su tabla (`apariencia`) se crea con la
migración `20260917002000_apariencia_editor.sql`.
