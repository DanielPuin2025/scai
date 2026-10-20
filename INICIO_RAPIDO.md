# 🚀 Guía de Inicio Rápido - SCAI

## ¿Qué es SCAI?

**SCAI** (Sistema de Control de Acceso Institucional) es una aplicación web para gestionar el acceso de estudiantes al Megacolegio El Progreso, incluyendo registro de asistencia, control de horas sociales y administración de usuarios.

## ✅ Estado Actual

La aplicación está **completamente actualizada y lista para desplegar**:

- ✅ Código fuente actualizado
- ✅ Dependencias instaladas (720 paquetes)
- ✅ Build de producción completado
- ✅ Repositorio Git configurado
- ✅ Archivos Docker listos

## 🎯 Opciones de Despliegue

### Opción 1: Usar el Script Automatizado (Recomendado para Windows)

1. **Crear repositorio en GitHub**:
   - Ve a https://github.com/new
   - Nombre: `scai-megacolegio`
   - Tipo: Privado
   - NO inicialices con archivos

2. **Ejecutar el script**:
   ```cmd
   cd SCAI
   deploy-github.bat
   ```
   
3. **Seguir las instrucciones** del script

### Opción 2: Despliegue Manual

#### Paso 1: Subir a GitHub

```bash
cd SCAI
git remote add origin https://github.com/TU_USUARIO/scai-megacolegio.git
git push -u origin master
```

#### Paso 2: Configurar EasyPanel

1. Inicia sesión en EasyPanel
2. Crear nuevo proyecto: `scai-megacolegio`
3. Conectar con GitHub
4. Configurar variables de entorno (ver `.env`)
5. Deploy!

## 📚 Documentación Completa

- **[DESPLIEGUE.md](./DESPLIEGUE.md)** - Guía detallada de despliegue
- **[README.md](./README.md)** - Información del proyecto
- **[INSTALACION.md](./INSTALACION.md)** - Detalles técnicos

## 🔑 Configuración Requerida

### Variables de Entorno (EasyPanel)

```env
VITE_SUPABASE_URL=https://qfzkielofjtixolcbhub.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TuAn-5Q7SIEmTydbuoc1Sg_tfhDBctB
VITE_SUPABASE_PROJECT_ID=qfzkielofjtixolcbhub
NODE_ENV=production
```

### Base de Datos (Importante)

Antes de usar la aplicación, ejecuta en Supabase SQL Editor:
- `sql/0002_paneles_usuarios_y_rls.sql`

## 🎨 Tecnologías

- **Frontend**: React 19 + TypeScript
- **Framework**: TanStack Start
- **Base de Datos**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS + Radix UI
- **PWA**: Soporte offline completo

## 📱 Características

- ✅ Panel de Coordinador
- ✅ Panel de Control Escolar
- ✅ Panel de Estudiantes
- ✅ Control de asistencia
- ✅ Gestión de horas sociales
- ✅ Reportes y estadísticas
- ✅ Modo offline (PWA)

## 🆘 Ayuda

Si encuentras problemas:

1. **Revisa los logs** en EasyPanel
2. **Verifica las variables de entorno**
3. **Consulta DESPLIEGUE.md** para solución de problemas
4. **Revisa la conexión** con Supabase

## 📞 Soporte Técnico

- **Supabase Dashboard**: https://supabase.com/dashboard/project/qfzkielofjtixolcbhub
- **Documentación**: Ver archivos .md en el proyecto

## 🧹 Limpieza (Después de Verificar)

Una vez que el sistema esté funcionando en producción:

```bash
# Eliminar archivos antiguos
cd ..
rm -rf SCAI1 SCAI_backup_* Contraseña
rm *.zip
```

---

**¿Listo para comenzar?** Ejecuta `deploy-github.bat` o consulta `DESPLIEGUE.md`
