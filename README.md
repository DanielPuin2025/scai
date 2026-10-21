# SCAI - Sistema de Control de Acceso Institucional

Sistema de Control de Acceso Institucional del Megacolegio El Progreso.

## 🚀 Despliegue Rápido

### 1. Subir a GitHub

Ejecuta el script:
```bash
./push-to-github.bat
```

O manualmente:
```bash
git push -u origin master --force
```

### 2. Configurar EasyPanel

Ver guía completa en: [EASYPANEL_CONFIG.md](./EASYPANEL_CONFIG.md)

**Configuración rápida:**
- Build: `npm install && npm run build`
- Start: `node .output/server/index.mjs`
- Puerto: `3000`
- Variables: Ver `.env`

### 3. Base de Datos

Ejecuta en Supabase SQL Editor:
- `sql/0002_paneles_usuarios_y_rls.sql`

URL: https://supabase.com/dashboard/project/qfzkielofjtixolcbhub

## 📁 Estructura

```
SCAI/
├── README.md                  ← Este archivo
├── EASYPANEL_CONFIG.md       ← Guía de despliegue EasyPanel
├── INSTALACION.md            ← Guía técnica completa
├── GUIA-VSCODE.md            ← Configuración VSCode
├── push-to-github.bat        ← Script para subir a GitHub
├── Dockerfile                ← Para Docker/EasyPanel
├── .env                      ← Variables de entorno
├── package.json              ← Dependencias
├── .output/                  ← Build de producción
├── src/                      ← Código fuente
└── sql/                      ← Scripts de base de datos
```

## 🛠️ Tecnologías

- **Frontend**: React 19 + TypeScript
- **Framework**: TanStack Start
- **Base de Datos**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS + Radix UI
- **Build**: Vite
- **PWA**: Soporte offline completo

## 📱 Características

- Panel de Coordinador
- Panel de Control Escolar
- Panel de Estudiantes
- Control de asistencia
- Gestión de horas sociales
- Reportes y estadísticas
- Modo offline (PWA)

## 🔗 Enlaces

- **GitHub**: https://github.com/DanielPuin2025/scai
- **Supabase**: https://supabase.com/dashboard/project/qfzkielofjtixolcbhub

## 📖 Documentación

- [EASYPANEL_CONFIG.md](./EASYPANEL_CONFIG.md) - Despliegue en EasyPanel
- [INSTALACION.md](./INSTALACION.md) - Instalación y configuración local
- [GUIA-VSCODE.md](./GUIA-VSCODE.md) - Configuración del editor

## ⚙️ Desarrollo Local

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Producción
npm start
```

## 🔐 Variables de Entorno

Ver archivo `.env` para las variables necesarias.

## 📞 Soporte

Para problemas técnicos, consulta:
1. [EASYPANEL_CONFIG.md](./EASYPANEL_CONFIG.md) - Troubleshooting
2. [INSTALACION.md](./INSTALACION.md) - Configuración detallada

---

**Estado**: ✅ Listo para producción  
**Versión**: 2026.10.20  
**Licencia**: Privado - Megacolegio El Progreso
