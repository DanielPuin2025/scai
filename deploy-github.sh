#!/bin/bash
# Script de ayuda para desplegar SCAI en GitHub

echo "=========================================="
echo "  SCAI - Script de Despliegue en GitHub"
echo "=========================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Este script debe ejecutarse desde el directorio SCAI/"
    exit 1
fi

echo "✅ Directorio correcto verificado"
echo ""

# Verificar estado de Git
echo "📊 Estado actual de Git:"
git status
echo ""

# Solicitar URL del repositorio
echo "Para continuar, necesitas:"
echo "1. Crear un repositorio en GitHub (https://github.com/new)"
echo "2. Copiar la URL del repositorio"
echo ""
read -p "Ingresa la URL del repositorio de GitHub (ej: https://github.com/usuario/scai-megacolegio.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ Error: Debes proporcionar una URL"
    exit 1
fi

# Verificar si ya existe un remote
if git remote | grep -q "origin"; then
    echo "⚠️  Ya existe un remote 'origin'. Reemplazándolo..."
    git remote remove origin
fi

# Agregar el remote
echo "🔗 Agregando repositorio remoto..."
git remote add origin "$REPO_URL"

if [ $? -eq 0 ]; then
    echo "✅ Repositorio remoto agregado correctamente"
else
    echo "❌ Error al agregar el repositorio remoto"
    exit 1
fi

# Mostrar remotes configurados
echo ""
echo "📋 Repositorios remotos configurados:"
git remote -v
echo ""

# Preguntar si desea hacer push
read -p "¿Deseas hacer push ahora? (s/n): " DO_PUSH

if [ "$DO_PUSH" = "s" ] || [ "$DO_PUSH" = "S" ]; then
    echo "🚀 Subiendo código a GitHub..."
    git push -u origin master

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ ¡Código subido exitosamente a GitHub!"
        echo ""
        echo "🎉 Próximos pasos:"
        echo "1. Ve a tu repositorio en GitHub"
        echo "2. Verifica que todos los archivos se subieron correctamente"
        echo "3. Consulta el archivo DESPLIEGUE.md para configurar EasyPanel"
    else
        echo ""
        echo "❌ Error al hacer push. Verifica:"
        echo "   - Que la URL del repositorio es correcta"
        echo "   - Que tienes permisos de escritura"
        echo "   - Que has configurado tus credenciales de Git"
        echo ""
        echo "Puedes intentar manualmente con:"
        echo "   git push -u origin master"
    fi
else
    echo ""
    echo "ℹ️  Push cancelado. Cuando estés listo, ejecuta:"
    echo "   git push -u origin master"
fi

echo ""
echo "=========================================="
