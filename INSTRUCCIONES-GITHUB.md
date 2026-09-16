# 🚀 Instrucciones para Subir a GitHub

## ✅ Estado del Proyecto: LISTO PARA DEPLOYMENT

Tu código está completamente preparado para GitHub y Render. Todos los cambios están guardados en Git.

---

## 📋 Cambios Realizados

✅ **DEPLOYMENT.md actualizado** - Cambió de Railway a Render  
✅ **Código actualizado** - Eliminadas 14 advertencias de deprecación  
✅ **Build verificado** - Compilación exitosa sin errores  
✅ **Commit realizado** - Todos los cambios guardados en Git  
✅ **Archivo .env protegido** - No está en el repositorio

---

## 🎯 Pasos para Subir a GitHub

### 1️⃣ Crear el Repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** (esquina superior derecha) → **"New repository"**
3. Configura:
   - **Repository name:** `scai-megacolegio`
   - **Description:** `Sistema de Control de Acceso Institucional - Megacolegio El Progreso`
   - **Visibility:** **Private** (recomendado)
   - ❌ **NO marques** "Initialize with README"
4. Haz clic en **"Create repository"**

### 2️⃣ Conectar y Subir el Código

Después de crear el repositorio, GitHub te mostrará una URL. Copia esa URL y ejecuta estos comandos en tu terminal:

```bash
# Navegar al proyecto
cd "c:\Users\Daniel_Puin\Desktop\PROYECTOS MEGA 2026\PROYECTOS 2026 MEGACOLEGIO-20260908T234406Z-1-001\PROYECTOS 2026 MEGACOLEGIO\5. SCAI(Sistema de Control de Acceso Institucional)\Códigos\SCAI-proyecto-completo"

# Agregar el remote de GitHub (reemplaza <URL-DEL-REPO> con tu URL)
git remote add origin <URL-DEL-REPO>

# Ejemplo:
# git remote add origin https://github.com/tu-usuario/scai-megacolegio.git

# Cambiar a rama main
git branch -M main

# Subir el código
git push -u origin main
```

✅ **¡Listo! Tu código está en GitHub.**

---

## 🎨 Pasos para Deploy en Render

### 1️⃣ Crear Cuenta y Proyecto

1. Ve a [render.com](https://render.com)
2. Inicia sesión con tu cuenta de GitHub
3. Haz clic en **"New +"** → **"Web Service"**
4. Selecciona tu repositorio `scai-megacolegio`

### 2️⃣ Configurar el Proyecto

Render detectará automáticamente el archivo `render.yaml`. Si no:

- **Name:** `scai-megacolegio`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `node .output/server/index.mjs`

### 3️⃣ Configurar Variables de Entorno

⚠️ **IMPORTANTE:** En Render, ve a **"Environment"** y agrega estas variables (copia los valores de tu archivo `.env` local):

```env
NODE_VERSION=20
SUPABASE_PROJECT_ID=tu_project_id_real
SUPABASE_PUBLISHABLE_KEY=tu_anon_key_real
SUPABASE_URL=https://tu_project_id.supabase.co
VITE_SUPABASE_PROJECT_ID=tu_project_id_real
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_key_real
VITE_SUPABASE_URL=https://tu_project_id.supabase.co
VITE_CODIGO_COORDINADOR=COORD2024
VITE_CODIGO_ENCARGADO=ENCARG2024
```

### 4️⃣ Hacer Deploy

1. Haz clic en **"Create Web Service"**
2. Render comenzará el deployment (tarda 5-10 minutos la primera vez)
3. Una vez completado, tendrás una URL tipo: `https://scai-megacolegio.onrender.com`

### 5️⃣ Configurar Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com/dashboard)
2. **Authentication** → **URL Configuration**
3. Agrega la URL de Render en:
   - **Site URL:** `https://scai-megacolegio.onrender.com`
   - **Redirect URLs:** `https://scai-megacolegio.onrender.com/*`

✅ **¡Tu app está en vivo!**

---

## 📝 Actualizaciones Futuras

Cuando hagas cambios en el código:

```bash
# 1. Agregar cambios
git add .

# 2. Hacer commit
git commit -m "Descripción de los cambios"

# 3. Subir a GitHub
git push

# Render detectará automáticamente y hará re-deploy
```

---

## 🆘 Solución de Problemas

### El build falla en Render
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs en la pestaña "Logs" de Render

### No se conecta a Supabase
- Verifica que las variables `VITE_SUPABASE_*` estén correctas
- Verifica que la URL de Render esté en Supabase Redirect URLs

### El servicio se duerme (Free tier)
- Render Free pone tu app en sleep después de 15 minutos sin uso
- El primer acceso puede tardar 30-60 segundos en despertar

---

## 📊 Resumen de Cambios Técnicos

- ✅ Actualizado `inputValidator()` → `validator()` en 14 funciones
- ✅ Build compila sin advertencias de deprecación
- ✅ Documentación actualizada para Render
- ✅ Archivo `render.yaml` configurado
- ✅ Git limpio y listo para push

---

**SCAI v2.0** - Megacolegio El Progreso  
Sistema preparado por Claude Code
