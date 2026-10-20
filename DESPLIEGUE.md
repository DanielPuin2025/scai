# Guía de Despliegue SCAI

## Estado Actual
✅ Proyecto actualizado y construido exitosamente
✅ Repositorio Git inicializado con commit inicial
✅ Build de producción completado en `.output/`

## Pasos para Desplegar en GitHub

### 1. Crear Repositorio en GitHub
1. Ve a https://github.com/new
2. Nombre del repositorio: `scai-megacolegio` (o el que prefieras)
3. Descripción: `Sistema de Control de Acceso Institucional - Megacolegio El Progreso`
4. Selecciona **Privado** (recomendado para datos institucionales)
5. NO inicialices con README, .gitignore o licencia (ya los tenemos)
6. Click en **Create repository**

### 2. Conectar y Subir el Código
Ejecuta estos comandos en la terminal desde el directorio SCAI:

```bash
# Agregar el repositorio remoto (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/scai-megacolegio.git

# Verificar que se agregó correctamente
git remote -v

# Subir el código a GitHub
git push -u origin master
```

## Despliegue en EasyPanel

### 1. Crear Nuevo Proyecto en EasyPanel
1. Inicia sesión en tu panel de EasyPanel
2. Click en **Create Project**
3. Nombre: `scai-megacolegio`

### 2. Configurar el Servicio
1. Selecciona **GitHub** como fuente
2. Conecta tu repositorio `scai-megacolegio`
3. Rama: `master`
4. Build Command: `npm install && npm run build`
5. Start Command: `npm start`
6. Puerto: `3000` (o el que use tu aplicación)

### 3. Variables de Entorno
Configura estas variables en EasyPanel:

```
VITE_SUPABASE_URL=https://qfzkielofjtixolcbhub.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TuAn-5Q7SIEmTydbuoc1Sg_tfhDBctB
VITE_SUPABASE_PROJECT_ID=qfzkielofjtixolcbhub
SUPABASE_URL=https://qfzkielofjtixolcbhub.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_TuAn-5Q7SIEmTydbuoc1Sg_tfhDBctB
SUPABASE_PROJECT_ID=qfzkielofjtixolcbhub
NODE_ENV=production
```

### 4. Desplegar
1. Click en **Deploy**
2. Espera a que el build y despliegue se completen
3. EasyPanel te dará una URL pública para acceder a la aplicación

## Verificación Post-Despliegue

### Verificar que la aplicación funciona:
1. Abre la URL proporcionada por EasyPanel
2. Verifica que carga la página principal
3. Prueba el login con las credenciales de coordinador
4. Verifica que los paneles cargan correctamente

### Base de Datos (Importante)
El archivo `sql/0002_paneles_usuarios_y_rls.sql` contiene las tablas necesarias para los paneles.
Si no lo has ejecutado ya:

1. Ve a tu proyecto de Supabase: https://supabase.com/dashboard/project/qfzkielofjtixolcbhub
2. Click en **SQL Editor**
3. Pega el contenido de `sql/0002_paneles_usuarios_y_rls.sql`
4. Click en **Run**

## Siguiente Actualización

Para futuras actualizaciones:

```bash
# Hacer cambios en el código
git add .
git commit -m "Descripción de los cambios"
git push

# EasyPanel detectará automáticamente los cambios y redesplegará
```

## URLs Importantes

- **Supabase Dashboard**: https://supabase.com/dashboard/project/qfzkielofjtixolcbhub
- **Repositorio GitHub**: (agregar después de crear)
- **URL Producción EasyPanel**: (agregar después de desplegar)

## Contacto de Soporte

Si tienes problemas con el despliegue, revisa:
- Los logs en EasyPanel (pestaña Logs)
- Las variables de entorno están correctamente configuradas
- Supabase está respondiendo correctamente
