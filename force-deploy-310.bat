@echo off
echo =========================================
echo FORCE DEPLOY - FIX ERROR 310
echo =========================================
echo.

cd /d "c:\Users\exclu\erp-taller-saas"

echo [1/5] Git status actual...
git status
echo.

echo [2/5] Agregando archivos...
git add .
echo.

echo [3/5] Git status después de add...
git status
echo.

echo [4/5] Haciendo commit...
git commit -m "fix: ERROR #310 DEFINITIVO - handleOrderCreated useCallback + force deploy"
echo.

echo [5/5] Haciendo push...
git push
echo.

echo =========================================
echo COMPLETADO - Verifica Vercel en 2-3 min
echo =========================================
pause

