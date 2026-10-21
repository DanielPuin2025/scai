# Configuración para EasyPanel - SCAI

## 🚀 Despliegue en EasyPanel

### 1. Conectar Repositorio GitHub

1. Ve a tu panel de EasyPanel
2. Click en **Create Project** o **New Service**
3. Selecciona **Git**
4. Conecta tu repositorio: `https://github.com/DanielPuin2025/scai`
5. Branch: `master`

### 2. Configuración del Servicio

**Build Settings:**
```
Build Command: npm install && npm run build
Start Command: node .output/server/index.mjs
Port: 3000
```

**Runtime:**
```
Node.js 20+
```

### 3. Variables de Entorno

Agrega estas variables en la configuración de EasyPanel:

```env
VITE_SUPABASE_URL=https://qfzkielofjtixolcbhub.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TuAn-5Q7SIEmTydbuoc1Sg_tfhDBctB
VITE_SUPABASE_PROJECT_ID=qfzkielofjtixolcbhub
SUPABASE_URL=https://qfzkielofjtixolcbhub.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_TuAn-5Q7SIEmTydbuoc1Sg_tfhDBctB
SUPABASE_PROJECT_ID=qfzkielofjtixolcbhub
NODE_ENV=production
PORT=3000
```

### 4. Recursos Recomendados

```
CPU: 0.5 - 1 vCPU
RAM: 512MB - 1GB
Storage: 2GB
```

### 5. Health Check (Opcional)

```
Path: /
Interval: 30s
Timeout: 5s
```

### 6. Deploy

1. Click en **Deploy** o **Create**
2. Espera a que el build se complete (~2-5 minutos)
3. EasyPanel te dará una URL pública

### 7. Verificación Post-Despliegue

Una vez desplegado, verifica:
- [ ] La URL pública carga correctamente
- [ ] El login funciona
- [ ] Los paneles son accesibles
- [ ] La conexión con Supabase funciona

### 8. Base de Datos (Importante)

Antes de usar la aplicación, ejecuta en Supabase SQL Editor:
```
https://supabase.com/dashboard/project/qfzkielofjtixolcbhub
```

Ejecuta el archivo: `sql/0002_paneles_usuarios_y_rls.sql`

### 9. Actualizar el Dominio (Opcional)

En EasyPanel:
1. Ve a **Settings** > **Domains**
2. Agrega tu dominio personalizado
3. Configura DNS según instrucciones

## 🔧 Troubleshooting

### Build falla
- Verifica que Node.js 20+ esté seleccionado
- Revisa los logs de build en EasyPanel
- Asegúrate que todas las variables de entorno estén configuradas

### Aplicación no inicia
- Verifica el Start Command: `node .output/server/index.mjs`
- Revisa logs de la aplicación
- Confirma que el PORT está en 3000

### Error de conexión a Supabase
- Verifica las variables VITE_SUPABASE_*
- Confirma que las credenciales son correctas
- Verifica que Supabase esté accesible

### Aplicación carga pero login falla
- Ejecuta el script SQL en Supabase
- Verifica que el script se ejecutó sin errores
- Revisa los logs de Supabase

## 📊 Monitoreo

EasyPanel proporciona:
- Logs en tiempo real
- Uso de recursos (CPU, RAM)
- Requests por segundo
- Uptime

## 🔄 Actualizaciones

Para actualizar la aplicación:
1. Haz cambios en tu código local
2. Commit y push a GitHub
3. EasyPanel detectará cambios y redesplegará automáticamente

O manualmente:
1. Ve a tu servicio en EasyPanel
2. Click en **Redeploy**

## 🔗 URLs Importantes

- **GitHub Repo**: https://github.com/DanielPuin2025/scai
- **Supabase Dashboard**: https://supabase.com/dashboard/project/qfzkielofjtixolcbhub
- **EasyPanel**: (tu URL de EasyPanel)
- **App URL**: (se genera después del despliegue)

---

**Estado**: ✅ Listo para desplegar
**Última actualización**: 20 de Octubre 2026
