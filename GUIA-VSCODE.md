# SCAI — Guía para trabajar en Visual Studio Code

## 1. Descargar el código

Descarga el archivo `SCAI-codigo-fuente.zip` y descomprímelo en una carpeta,
por ejemplo `C:\SCAI`. Luego abre esa carpeta en **Visual Studio Code**
(`Archivo > Abrir carpeta...`).

> También puedes usar GitHub: en Lovable, botón **GitHub > Connect to GitHub**,
> y después `git clone` del repositorio en tu computador.

## 2. Requisitos

- [Node.js 20 o superior](https://nodejs.org) (incluye `npm`).
- Visual Studio Code.
- Extensiones recomendadas: *ESLint*, *Prettier*, *Tailwind CSS IntelliSense*.

## 3. Instalar y ejecutar

Abre la terminal de VS Code (`Ctrl + ñ`) y ejecuta:

```bash
npm install
npm run dev
```

Abre `http://localhost:8080` en el navegador.

## 4. Usarlo desde otros dispositivos (celulares, tablets, otros PC)

Levanta el servidor visible en la red local:

```bash
npm run dev -- --host
```

La terminal mostrará una dirección tipo `http://192.168.1.25:8080`.
Escribe esa dirección en el celular **conectado al mismo WiFi** del colegio.

Para uso real (varios equipos, sin depender de tu PC) lo mejor es la versión
publicada: <https://class-entry-flow.lovable.app>

## 5. Instalar como aplicación (PWA) y uso sin internet

1. Abre la app publicada (`https://class-entry-flow.lovable.app`) en Chrome o Safari.
2. Menú del navegador → **Instalar aplicación** / **Añadir a pantalla de inicio**.
3. Ábrela desde el icono SCAI: se ve como una app normal, a pantalla completa.

Sin internet:

- La app **abre igual** (pantallas, formularios y logo quedan guardados en el equipo).
- El estudiante puede registrar **asistencia** y **faltas** (llegada tarde / mal
  uniforme); los registros se guardan en el dispositivo y aparece el aviso
  *"Modo sin conexión"*.
- Al volver la conexión, los pendientes **se sincronizan solos** con la base de datos.
- Lo que sí requiere internet: iniciar sesión de coordinador, buscar un estudiante
  por primera vez y ver reportes/gráficas.

> La instalación offline solo funciona en la app **publicada**, no en la vista
> previa del editor ni en `localhost`.

## 6. Compilar la versión de producción

```bash
npm run build
```

El resultado queda en `.output/` listo para desplegar.

## 7. Estructura del proyecto

```
src/routes/index.tsx          Pantalla principal (Coordinador / Estudiante)
src/routes/estudiante.tsx     Flujo del estudiante (código, faltas, asistencia)
src/routes/coordinador.tsx    Login + panel (reportes y estudiantes)
src/components/scai/          Componentes: reportes, CRUD, banner offline
src/lib/scai.functions.ts     Funciones de servidor públicas
src/lib/coordinador.functions.ts Funciones protegidas del coordinador
src/lib/offline-queue.ts      Cola de registros sin conexión
src/lib/pwa.ts                Registro del service worker
src/styles.css                Colores y estilos institucionales
supabase/                     Configuración de la base de datos
```

## 8. Variables de entorno

El archivo `.env` incluido trae las claves públicas de conexión a la base de
datos; no lo borres o la app no podrá conectarse.
