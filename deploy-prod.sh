#!/bin/bash
# Script para deployar a producción (main)

echo "🚀 Desplegando a PRODUCCIÓN..."
echo ""
echo "⚠️  ATENCIÓN: Esto desplegará a producción (main)"
echo "   Vercel desplegará automáticamente después del push"
echo ""

# Confirmar
read -p "¿Continuar? (s/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  echo "❌ Cancelado"
  exit 1
fi

# Cambiar a main
echo "🔄 Cambiando a main..."
git checkout main

# Pull latest
echo "📥 Actualizando main..."
git pull origin main

# Merge desde development
echo "🔀 Mergeando development → main..."
git merge development --no-edit

# Push
echo "📤 Pusheando a main..."
git push origin main

echo ""
echo "✅ Desplegado a producción exitosamente!"
echo ""
echo "🌐 Vercel está desplegando automáticamente..."
echo "   Revisa: https://vercel.com/dashboard"

