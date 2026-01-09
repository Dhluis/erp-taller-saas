@echo off
REM Script para Windows - Deployar a producción (main)

echo 🚀 Desplegando a PRODUCCION...
echo.
echo ⚠️  ATENCION: Esto desplegara a produccion (main^)
echo    Vercel desplegara automaticamente despues del push
echo.

REM Confirmar
set /p CONFIRM="¿Continuar? (s/n): "
if /i NOT "%CONFIRM%"=="s" (
  echo ❌ Cancelado
  pause
  exit /b 1
)

REM Cambiar a main
echo 🔄 Cambiando a main...
git checkout main

REM Pull latest
echo 📥 Actualizando main...
git pull origin main

REM Merge desde development
echo 🔀 Mergeando development → main...
git merge development --no-edit

REM Push
echo 📤 Pusheando a main...
git push origin main

echo.
echo ✅ Desplegado a produccion exitosamente!
echo.
echo 🌐 Vercel esta desplegando automaticamente...
echo    Revisa: https://vercel.com/dashboard
pause

