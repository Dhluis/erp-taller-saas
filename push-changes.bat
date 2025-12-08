@echo off
echo ========================================
echo Subiendo cambios a GitHub...
echo ========================================

cd /d c:\Users\exclu\erp-taller-saas

echo.
echo [1/4] Agregando archivos...
git add -A

echo.
echo [2/4] Estado actual:
git status --short

echo.
echo [3/4] Creando commit...
git commit -m "fix: datos reales usuario, signOut error 300, redirect login"

echo.
echo [4/4] Subiendo a GitHub...
git push

echo.
echo ========================================
echo LISTO! Ahora haz redeploy en Vercel
echo ========================================
pause

