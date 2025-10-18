#!/bin/bash

# ===================================================
# Script para ejecutar tests de Cotizaciones
# ===================================================

echo "🧪 ====================================="
echo "🧪 TESTS DE API DE COTIZACIONES"
echo "🧪 ====================================="
echo ""

# Verificar que el servidor esté corriendo
echo "📡 Verificando que el servidor esté activo..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ ERROR: El servidor no está corriendo en localhost:3000"
    echo "   Por favor, ejecuta 'npm run dev' en otra terminal"
    exit 1
fi

echo "✅ Servidor activo"
echo ""

# Ejecutar tests
echo "🧪 Ejecutando tests..."
echo ""

npm run test tests/api/quotations/quotations.test.ts

echo ""
echo "🧪 ====================================="
echo "🧪 TESTS COMPLETADOS"
echo "🧪 ====================================="


