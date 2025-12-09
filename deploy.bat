@echo off
cd /d "c:\Users\exclu\erp-taller-saas"
echo === GIT STATUS ===
git status --short
echo.
echo === GIT ADD ===
git add -A
echo.
echo === GIT COMMIT ===
git commit -m "fix: v3.0.0 DEPLOYMENT MARKER + error #300 solution"
echo.
echo === GIT PUSH ===
git push origin main
echo.
echo === DONE ===
pause

