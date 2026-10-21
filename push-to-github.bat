@echo off
REM Script para subir SCAI a GitHub cuando la conexion este disponible

echo ==========================================
echo   SCAI - Push a GitHub
echo ==========================================
echo.

REM Verificar conexion
echo Verificando conexion con GitHub...
ping -n 2 github.com >nul 2>&1
if errorlevel 1 (
    echo ERROR: No hay conexion con GitHub
    echo Por favor verifica tu conexion a internet e intenta nuevamente.
    pause
    exit /b 1
)

echo OK Conexion verificada
echo.

REM Mostrar estado
echo Estado actual del repositorio:
git status
echo.

REM Confirmar push
set /p CONFIRM="Deseas hacer push a https://github.com/DanielPuin2025/scai.git? (s/n): "

if /i not "%CONFIRM%"=="s" (
    echo Push cancelado.
    pause
    exit /b 0
)

REM Hacer push
echo.
echo Subiendo codigo a GitHub...
git push -u origin master --force

if errorlevel 0 (
    echo.
    echo OK Codigo subido exitosamente!
    echo.
    echo Repositorio: https://github.com/DanielPuin2025/scai
    echo.
    echo Proximo paso: Configurar EasyPanel
    echo Ver archivo: DESPLIEGUE.md
) else (
    echo.
    echo ERROR al hacer push
    echo Verifica tu conexion y credenciales de Git
)

echo.
echo ==========================================
pause
