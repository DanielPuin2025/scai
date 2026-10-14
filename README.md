# SCAI - Sistema de Control de Acceso Institucional

Sistema de Control de Acceso Institucional del Megacolegio El Progreso.

## Desarrollo local

Abre en Visual Studio Code la carpeta raíz que contiene `package.json`. Copia
`.env.example` como `.env`, configura las variables públicas del proyecto
Supabase y ejecuta:

```sh
npm install
npm run dev
```

Consulta [INSTALACION.md](./INSTALACION.md) para la guía de variables de entorno,
Supabase, PWA, uso offline y estructura.

## Despliegue en VPS

La configuración de producción usa Docker Compose, Caddy y HTTPS automático
para `scai.programamega.com`. Supabase sigue siendo el servicio de base de datos;
no se instala ni se publica una base de datos dentro del VPS.

1. Configura un registro DNS `A` para `scai.programamega.com` con la IPv4 pública
   del VPS. Si existe un registro `AAAA`, debe apuntar a una IPv6 funcional del VPS.
2. Instala Docker Engine y el plugin Docker Compose en el VPS. Asegúrate de que
   los puertos TCP `80` y `443` estén permitidos en el firewall y disponibles para Caddy.
3. Clona el repositorio en el VPS, entra en la carpeta que contiene `compose.yaml`
   y crea `.env` desde la plantilla:

   ```sh
   cp .env.example .env
   ```

4. Completa en `.env` las seis variables `VITE_SUPABASE_*` y `SUPABASE_*` con
   los datos del mismo proyecto Supabase. No configures una clave secreta en
   variables `VITE_*`. `SUPABASE_SERVICE_ROLE_KEY` solo se define si se necesita
   una operación de servidor que omita RLS; nunca se expone al navegador.
5. Inicia el servicio:

   ```sh
   docker compose up -d --build
   docker compose logs -f app caddy
   ```

Caddy solicita y renueva el certificado TLS automáticamente cuando el DNS ya
resuelve al VPS y los puertos 80/443 son accesibles. Para publicar una versión
nueva, actualiza el checkout y vuelve a ejecutar `docker compose up -d --build`.
No subas `.env` al repositorio.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Actualización de la base de datos (una sola vez)

Los tres paneles (Coordinador, Control Escolar y Estudiante) necesitan las
tablas y funciones de seguridad del archivo `sql/0002_paneles_usuarios_y_rls.sql`.

1. Entra a tu proyecto de Supabase → **SQL Editor**.
2. Pega el contenido completo de ese archivo y pulsa **Run**.

Ese archivo crea los usuarios autorizados (`usuarios_panel`), las sesiones
(`sesiones_panel`), las funciones de ingreso y consulta, y cierra el acceso
público directo a los datos de los estudiantes. No borra datos existentes.

Después, el coordinador crea los usuarios de Control Escolar y de Horas
Sociales desde la pestaña **Usuarios** de su panel.
