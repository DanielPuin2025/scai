#!/bin/bash
# Script para subir SCAI a GitHub cuando la conexión esté disponible

echo "=========================================="
echo "  SCAI - Push a GitHub"
echo "=========================================="
echo ""

# Verificar conexión
echo "Verificando conexión con GitHub..."
if ! ping -c 2 github.com &> /dev/null; then
    echo "❌ Error: No hay conexión con GitHub"
    echo "Por favor verifica tu conexión a internet e intenta nuevamente."
    exit 1
fi

echo "✅ Conexión verificada"
echo ""

# Mostrar estado
echo "Estado actual del repositorio:"
git status
echo ""

# Confirmar push
read -p "¿Deseas hacer push a https://github.com/DanielPuin2025/scai.git? (s/n): " CONFIRM

if [ "$CONFIRM" != "s" ] && [ "$CONFIRM" != "S" ]; then
    echo "Push cancelado."
    exit 0
fi

# Hacer push
echo ""
echo "Subiendo código a GitHub..."
git push -u origin master --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Código subido exitosamente!"
    echo ""
    echo "Repositorio: https://github.com/DanielPuin2025/scai"
    echo ""
    echo "Próximo paso: Configurar EasyPanel"
    echo "Ver archivo: DESPLIEGUE.md"
else
    echo ""
    echo "❌ Error al hacer push"
    echo "Verifica tu conexión y credenciales de Git"
fi

echo ""
echo "=========================================="
