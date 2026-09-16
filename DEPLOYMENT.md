# 🚀 Guía de Deployment - SCAI

Esta guía te ayudará a subir el proyecto a GitHub y deployarlo en Render.

---

## 📦 Parte 1: Subir a GitHub

### Paso 1: Crear repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** en la esquina superior derecha → **"New repository"**
3. Configura el repositorio:
   - **Repository name:** `scai-megacolegio` (o el nombre que prefieras)
   - **Description:** `Sistema de Control de Acceso Institucional - Megacolegio El Progreso`
   - **Visibility:** Elige **Private** (recomendado) o **Public**
   - ❌ **NO marques** "Initialize with README" (ya tenemos uno)
4. Haz clic en **"Create repository"**

### Paso 2: Conectar tu repositorio local con GitHub

Copia la URL de tu repositorio (aparecerá después de crearlo) y ejecuta:

```bash
# Agregar el remote de GitHub (reemplaza <TU-URL> con la URL de tu repo)
git remote add origin <TU-URL>

# Ejemplo:
# git remote add origin https://github.com/tu-usuario/scai-megacolegio.git

# Cambiar el nombre de la rama a main (si es necesario)
git branch -M main

# Subir el código a GitHub
git push -u origin main
```

✅ **Listo!** Tu código ahora está en GitHub.

---

## 🎨 Parte 2: Deploy en Render

### Paso 1: Crear cuenta en Render

1. Ve a [render.com](https://render.com)
2. Haz clic en **"Get Started"** o **"Sign In"**
3. Inicia sesión con tu cuenta de GitHub

### Paso 2: Crear nuevo proyecto

1. En el dashboard de Render, haz clic en **"New +"** → **"Web Service"**
2. Conecta tu repositorio de GitHub `scai-megacolegio`
3. Render detectará automáticamente el archivo `render.yaml` y lo usará para la configuración

**Alternativa sin render.yaml:**
- **Name:** `scai-megacolegio`
- **Runtime:** `Node`
- **Build Command:** `npm ci && npm run build`
- **Start Command:** `node .output/server/index.mjs`

### Paso 3: Configurar variables de entorno

⚠️ **MUY IMPORTANTE:** Debes configurar las variables de entorno en Render.

1. En tu proyecto de Render, ve a **"Environment"** en el menú lateral
2. Agrega las siguientes variables (copia los valores de tu archivo `.env` local):

```bash
# Node.js
NODE_VERSION=20

# Supabase Configuration
SUPABASE_PROJECT_ID=tu_project_id_real
SUPABASE_PUBLISHABLE_KEY=tu_anon_key_real
SUPABASE_URL=https://tu_project_id.supabase.co

# Variables para Vite (cliente)
VITE_SUPABASE_PROJECT_ID=tu_project_id_real
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_key_real
VITE_SUPABASE_URL=https://tu_project_id.supabase.co

# Códigos de acceso del sistema
VITE_CODIGO_COORDINADOR=COORD2024
VITE_CODIGO_ENCARGADO=ENCARG2024
```

3. Haz clic en **"Save Changes"**

### Paso 4: Deploy

1. Render iniciará el deployment automáticamente
2. Espera unos minutos mientras se construye (primera vez puede tardar 5-10 min)
3. Una vez completado, Render te dará una URL pública tipo: `https://scai-megacolegio.onrender.com`

✅ **Tu app está en vivo!**

---

## 🔒 Configuración de Supabase (Importante)

Después del deployment, debes configurar Supabase:

### 1. Agregar el dominio de Render a Supabase

1. Ve a tu proyecto en [supabase.com](https://supabase.com/dashboard)
2. Ve a **Authentication** → **URL Configuration**
3. En **Site URL**, agrega la URL que te dio Render (ej: `https://scai-megacolegio.onrender.com`)
4. En **Redirect URLs**, agrega:
   ```
   https://scai-megacolegio.onrender.com/*
   https://scai-megacolegio.onrender.com/~oauth/callback
   ```

### 2. Verificar políticas RLS

Asegúrate de que las políticas de seguridad (RLS) estén activas en Supabase para proteger tus datos.

---

## 📝 Comandos útiles de Git

```bash
# Ver estado del repositorio
git status

# Ver historial de commits
git log --oneline

# Hacer cambios y subirlos
git add .
git commit -m "Descripción del cambio"
git push

# Ver a qué repositorio remoto está conectado
git remote -v
```

---

## 🔄 Actualizaciones futuras

Cuando hagas cambios en el código:

```bash
# 1. Agregar cambios
git add .

# 2. Hacer commit
git commit -m "Descripción de los cambios"

# 3. Subir a GitHub
git push

# Render detectará automáticamente el push y hará re-deploy
```

---

## ⚠️ Checklist Final

Antes de considerar el deployment completo, verifica:

- [ ] ✅ Código subido a GitHub
- [ ] ✅ Variables de entorno configuradas en Render
- [ ] ✅ Deployment exitoso en Render
- [ ] ✅ URL de Render agregada en Supabase
- [ ] ✅ Probar acceso con código de coordinador
- [ ] ✅ Probar acceso con código de encargado
- [ ] ✅ Probar acceso con código de estudiante
- [ ] ✅ Verificar funcionalidad offline (PWA)

---

## 🆘 Solución de problemas

### Error: "Build failed"
- Verifica que todas las variables de entorno estén configuradas
- Revisa los logs de Render en la pestaña "Logs" para ver el error específico

### Error: "Cannot connect to Supabase"
- Verifica que las variables `VITE_SUPABASE_*` estén correctas
- Asegúrate de que la URL de Render esté en las Redirect URLs de Supabase

### La app se ve pero no funciona
- Verifica que las variables de entorno con prefijo `VITE_` estén configuradas
- En Render, ve a "Events" y verifica que el build se completó sin errores

### El servicio se duerme (Free tier)
- Render Free tier pone tu app en "sleep" después de 15 minutos de inactividad
- El primer acceso después del sleep puede tardar 30-60 segundos en despertar
- Considera usar un servicio de "ping" o actualizar a un plan pagado si necesitas disponibilidad 24/7

---

## 📞 Contacto

Para soporte adicional con el deployment, contacta al equipo técnico del Megacolegio El Progreso.

---

**SCAI v2.0** - Megacolegio El Progreso
