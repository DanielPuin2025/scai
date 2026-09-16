# SCAI - Sistema de Control de Acceso Institucional

Sistema web moderno para el control de acceso y registro de faltas de estudiantes del **Megacolegio El Progreso**.

## 🎯 Características Principales

- ✅ **Acceso por código único** para 3 tipos de usuarios
- ✅ **Funciona sin internet** (PWA con sincronización automática)
- ✅ **Registro rápido** optimizado para la entrada del colegio
- ✅ **Panel completo de gestión** para coordinadores
- ✅ **Consulta de historial** para estudiantes
- ✅ **Interfaz moderna y responsiva**

## 👥 Tipos de Usuario

### 🔐 Coordinador
**Código de acceso:** `COORD2024`

Acceso completo al sistema con autenticación:
- Gestión de estudiantes (crear, editar, archivar)
- Registro de faltas
- Reportes y estadísticas
- Cierre de año escolar

### 🚪 Encargado
**Código de acceso:** `ENCARG2024`

Registro rápido en la entrada:
- Búsqueda rápida por código de estudiante
- Registro instantáneo de llegadas tarde y uniforme
- Funciona sin conexión
- Interfaz optimizada para no congestionar el ingreso

### 🎓 Estudiante
**Código de acceso:** Su código SIS personal

Consulta de historial personal:
- Visualización de llegadas tarde
- Visualización de faltas de uniforme
- Resumen total de faltas
- Solo lectura (sin permisos de registro)

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+ y npm
- Cuenta de Supabase (para base de datos)

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd SCAI-proyecto

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# Iniciar en desarrollo
npm run dev


# Desarrollo con hot reload
npm run dev

# Compilar para producción
npm run build

# Vista previa de producción
npm run preview

# Linting
npm run lint

# Formatear código
npm run format
