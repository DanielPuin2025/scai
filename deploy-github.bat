@echo off
REM Script de ayuda para desplegar SCAI en GitHub (Windows)

echo ==========================================
echo   SCAI - Script de Despliegue en GitHub
echo ==========================================
echo.

REM Verificar que estamos en el directorio correcto
if not exist "package.json" (
    echo ERROR: Este script debe ejecutarse desde el directorio SCAI/
    pause
    exit /b 1
)

echo OK Directorio correcto verificado
echo.

REM Verificar estado de Git
echo Estado actual de Git:
git status
echo.

REM Solicitar URL del repositorio
echo Para continuar, necesitas:
echo 1. Crear un repositorio en GitHub (https://github.com/new)
echo 2. Copiar la URL del repositorio
echo.
set /p REPO_URL="Ingresa la URL del repositorio de GitHub: "

if "%REPO_URL%"=="" (
    echo ERROR: Debes proporcionar una URL
    pause
    exit /b 1
)

REM Verificar si ya existe un remote
git remote | findstr "origin" >nul
if %errorlevel%==0 (
    echo Advertencia: Ya existe un remote 'origin'. Reemplazandolo...
    git remote remove origin
)

REM Agregar el remote
echo Agregando repositorio remoto...
git remote add origin %REPO_URL%

if %errorlevel%==0 (
    echo OK Repositorio remoto agregado correctamente
) else (
    echo ERROR al agregar el repositorio remoto
    pause
    exit /b 1
)

REM Mostrar remotes configurados
echo.
echo Repositorios remotos configurados:
git remote -v
echo.

REM Preguntar si desea hacer push
set /p DO_PUSH="Deseas hacer push ahora? (s/n): "

if /i "%DO_PUSH%"=="s" (
    echo Subiendo codigo a GitHub...
    git push -u origin master

    if %errorlevel%==0 (
        echo.
        echo Codigo subido exitosamente a GitHub!
        echo.
        echo Proximos pasos:
        echo 1. Ve a tu repositorio en GitHub
        echo 2. Verifica que todos los archivos se subieron correctamente
        echo 3. Consulta el archivo DESPLIEGUE.md para configurar EasyPanel
    ) else (
        echo.
        echo ERROR al hacer push. Verifica:
        echo    - Que la URL del repositorio es correcta
        echo    - Que tienes permisos de escritura
        echo    - Que has configurado tus credenciales de Git
        echo.
        echo Puedes intentar manualmente con:
        echo    git push -u origin master
    )
) else (
    echo.
    echo Push cancelado. Cuando estes listo, ejecuta:
    echo    git push -u origin master
)

echo.
echo ==========================================
pause
