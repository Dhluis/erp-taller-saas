# Script para verificar y aplicar cambios de Tailwind
Write-Host "🔍 Verificando cambios de Tailwind..." -ForegroundColor Cyan

# 1. Verificar que tailwind.config.ts existe y tiene los colores
Write-Host "`n1️⃣ Verificando tailwind.config.ts..." -ForegroundColor Yellow
if (Test-Path "tailwind.config.ts") {
    $content = Get-Content "tailwind.config.ts" -Raw
    if ($content -match "bg-primary.*#0A0E1A") {
        Write-Host "   ✅ Colores de fondo configurados" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Colores de fondo NO encontrados" -ForegroundColor Red
    }
    if ($content -match "text-primary.*#FFFFFF") {
        Write-Host "   ✅ Colores de texto configurados" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Colores de texto NO encontrados" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ tailwind.config.ts NO existe" -ForegroundColor Red
}

# 2. Limpiar cache de Next.js
Write-Host "`n2️⃣ Limpiando cache de Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "   ✅ Cache eliminado" -ForegroundColor Green
} else {
    Write-Host "   ℹ️ No hay cache para eliminar" -ForegroundColor Gray
}

# 3. Verificar que el servidor esté corriendo
Write-Host "`n3️⃣ Verificando servidor..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "   ✅ Servidor Node.js corriendo ($($nodeProcesses.Count) procesos)" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Servidor Node.js NO está corriendo" -ForegroundColor Yellow
    Write-Host "   💡 Ejecuta: npm run dev" -ForegroundColor Cyan
}

# 4. Instrucciones finales
Write-Host "`n📋 INSTRUCCIONES:" -ForegroundColor Cyan
Write-Host "   1. Asegúrate de que el servidor esté corriendo: npm run dev" -ForegroundColor White
Write-Host "   2. Abre el navegador en: http://localhost:3000/dashboard" -ForegroundColor White
Write-Host "   3. Presiona Ctrl+Shift+R para hard refresh" -ForegroundColor White
Write-Host "   4. Abre DevTools (F12) y verifica la consola" -ForegroundColor White
Write-Host "`n✅ Verificación completada" -ForegroundColor Green

