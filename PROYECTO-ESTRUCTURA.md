# SCAI - Sistema de Control de Acceso Institucional

## Estructura del Proyecto

### Descripción General
Sistema web para el control de acceso y registro de faltas de estudiantes del Megacolegio El Progreso. Funciona con y sin conexión a internet.

### Tipos de Usuario

#### 1. **Coordinador** (Acceso completo)
- **Código:** COORD2024
- **Características:**
  - Gestión completa de estudiantes (crear, editar, archivar)
  - Registro de faltas (llegadas tarde y mal porte del uniforme)
  - Consulta de reportes y estadísticas
  - Cierre de año escolar
- **Ruta:** `/coordinador`
- **Autenticación:** Requiere inicio de sesión con Supabase

#### 2. **Encargado** (Registro rápido)
- **Código:** ENCARG2024
- **Características:**
  - Registro rápido de faltas en la entrada del colegio
  - Búsqueda de estudiantes por código
  - Interfaz optimizada para no congestionar el ingreso
  - Funciona sin conexión (sincroniza automáticamente)
- **Ruta:** `/encargado`
- **Sin autenticación:** Acceso directo mediante código

#### 3. **Estudiante** (Consulta personal)
- **Código:** Su código SIS personal
- **Características:**
  - Consulta de historial de llegadas tarde
  - Consulta de historial de mal porte del uniforme
  - Vista de resumen de faltas totales
  - Solo lectura (no puede registrar faltas)
- **Ruta:** `/estudiante?codigo=XXXXX`
- **Sin autenticación:** Acceso directo con código personal

### Estructura de Archivos

```
src/
├── routes/
│   ├── index.tsx              # Página de inicio unificada con acceso por código
│   ├── coordinador.tsx        # Panel completo del coordinador
│   ├── encargado.tsx          # Registro rápido para encargados
│   ├── estudiante.tsx         # Consulta de historial para estudiantes
│   └── __root.tsx             # Layout principal
│
├── components/
│   ├── scai/
│   │   ├── ConsultaEstudiante.tsx    # Componente de búsqueda y registro
│   │   ├── EstudiantesAdmin.tsx      # Gestión de estudiantes (CRUD)
│   │   ├── ReportPanel.tsx           # Panel de reportes y estadísticas
│   │   └── PendientesBanner.tsx      # Banner de registros pendientes
│   └── ui/                            # Componentes de interfaz (shadcn/ui)
│
├── lib/
│   ├── scai.functions.ts      # Funciones del servidor para operaciones SCAI
│   ├── scai-schemas.ts        # Esquemas y tipos de datos
│   ├── coordinador.functions.ts  # Funciones exclusivas del coordinador
│   ├── offline-queue.ts       # Cola de sincronización offline
│   └── utils.ts               # Utilidades generales
│
├── hooks/
│   └── useAuth.ts             # Hook de autenticación
│
└── integrations/
    └── supabase/              # Configuración de Supabase
        ├── client.ts
        ├── client.server.ts
        └── types.ts
```

### Base de Datos (Supabase)

#### Tablas principales:

1. **estudiantes**
   - `id` (uuid, PK)
   - `codigo_sis` (text, único)
   - `nombre` (text)
   - `grado` (text)
   - `genero` (text)
   - `identificacion` (text)
   - `tipo_id` (text)
   - `activo` (boolean)
   - `codigo_norm` (text, indexado para búsquedas)
   - `nombre_norm` (text, indexado para búsquedas)
   - `identificacion_norm` (text, indexado para búsquedas)

2. **faltas**
   - `id` (uuid, PK)
   - `estudiante_id` (uuid, FK)
   - `tipo` (enum: 'llegada_tarde' | 'mal_uniforme')
   - `fecha` (date)
   - `created_at` (timestamp)
   - Índice único: `(estudiante_id, tipo, fecha)` para evitar duplicados

### Características Técnicas

- **Frontend:** React 19, TanStack Router, TanStack Start (SSR)
- **Backend:** TanStack Start server functions, Supabase
- **Estilos:** Tailwind CSS 4, shadcn/ui components
- **PWA:** Funciona sin conexión (vite-plugin-pwa)
- **Sincronización:** Cola automática de registros offline
- **Validación:** Zod schemas
- **Base de datos:** Supabase (PostgreSQL)

### Flujo de Trabajo

1. **Ingreso al sistema:**
   - Usuario ingresa código en la página de inicio
   - Sistema determina el tipo de usuario y redirige

2. **Coordinador:**
   - Inicia sesión con credenciales
   - Accede a todas las funcionalidades

3. **Encargado:**
   - Búsqueda rápida por código
   - Selección de falta(s)
   - Registro instantáneo
   - Preparación automática para siguiente estudiante

4. **Estudiante:**
   - Ingresa código personal
   - Ve su historial completo
   - Información de solo lectura

### Comandos Principales

```bash
# Desarrollo
npm run dev

# Compilar
npm run build

# Vista previa de producción
npm run preview

# Linting
npm run lint

# Formatear código
npm run format
```

### Mejoras Implementadas

✅ **Página de inicio unificada** con acceso por código único
✅ **Rol de encargado** optimizado para registro rápido sin congestionar
✅ **Página de estudiante** simplificada (solo consulta, sin registro)
✅ **Interfaz más clara** y fácil de entender
✅ **Flujos optimizados** según tipo de usuario
✅ **Código de acceso único** para cada tipo de usuario

### Seguridad

- Códigos de acceso en variables (deben moverse a `.env` en producción)
- Autenticación Supabase para coordinadores
- Validación de datos con Zod
- Índices únicos en base de datos para prevenir duplicados
- RLS (Row Level Security) en Supabase

### Próximos Pasos Recomendados

1. Mover códigos de acceso a variables de entorno
2. Implementar sistema de códigos dinámicos en base de datos
3. Añadir logs de auditoría
4. Implementar límite de intentos de acceso fallidos
5. Añadir exportación de reportes en PDF/Excel
