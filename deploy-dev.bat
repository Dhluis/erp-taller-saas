@echo off
REM Script para Windows - Deployar a development

echo 🚀 Desplegando a development...
echo.

REM Obtener rama actual
for /f "tokens=2" %%b in ('git branch --show-current') do set CURRENT_BRANCH=%%b
echo 📍 Rama actual: %CURRENT_BRANCH%
echo.

REM Cambiar a development
echo 🔄 Cambiando a development...
git checkout development

REM Pull latest
echo 📥 Actualizando development...
git pull origin development

REM Si hay cambios en la rama actual, mergear
if NOT "%CURRENT_BRANCH%"=="development" (
  echo 🔀 Mergeando %CURRENT_BRANCH% → development...
  git merge %CURRENT_BRANCH% --no-edit
)

REM Push
echo 📤 Pusheando a development...
git push origin development

echo.
echo ✅ Desplegado a development exitosamente!
echo.
echo 💡 Próximo paso: Si todo funciona bien, ejecuta deploy-prod.bat
pause

