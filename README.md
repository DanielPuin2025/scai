# SCAI

Sistema de Control de Acceso Institucional del Megacolegio El Progreso.

## Instalación local

Abre en Visual Studio Code la carpeta raíz que contiene `package.json`. Copia
`.env.example` como `.env`, configura las variables públicas del proyecto
Supabase existente y ejecuta:

```sh
npm install
npm run dev
```

Consulta `INSTALACION.md` para la guía completa de variables de entorno,
Supabase, PWA, uso offline y estructura del proyecto.

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
