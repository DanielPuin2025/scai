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
```

El sistema estará disponible en `http://localhost:3000`

## 🛠️ Desarrollo

```bash
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
```

## 📦 Stack Tecnológico

- **Frontend:** React 19 + TypeScript
- **Routing:** TanStack Router (SSR)
- **Backend:** TanStack Start server functions
- **Base de datos:** Supabase (PostgreSQL)
- **Estilos:** Tailwind CSS 4
- **Componentes UI:** shadcn/ui
- **PWA:** vite-plugin-pwa
- **Validación:** Zod
- **Build:** Vite 8

## 📱 Funcionalidad Offline

El sistema cuenta con:
- Service Worker para funcionar sin conexión
- Cola de sincronización automática
- Almacenamiento local de registros pendientes
- Indicadores visuales de estado de conexión

## 🗂️ Estructura del Proyecto

```
src/
├── routes/              # Páginas de la aplicación
├── components/          # Componentes React
├── lib/                 # Lógica de negocio y funciones
├── hooks/               # React hooks personalizados
└── integrations/        # Integraciones (Supabase)
```

Ver [PROYECTO-ESTRUCTURA.md](./PROYECTO-ESTRUCTURA.md) para más detalles.

## 🔒 Seguridad

- Autenticación con Supabase Auth
- Row Level Security (RLS) en base de datos
- Validación de datos con Zod
- Índices únicos para prevenir duplicados
- Códigos de acceso (deben estar en variables de entorno en producción)

## 📝 Licencia

Proyecto desarrollado para el Megacolegio El Progreso.

## 🤝 Contribución

Para contribuir al proyecto:
1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## 📞 Soporte

Para soporte técnico o consultas, contacta al equipo de desarrollo del Megacolegio El Progreso.

---

**SCAI v2.0** - Sistema de Control de Acceso Institucional

