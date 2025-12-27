#!/bin/bash
# Script para deployar a development

echo "🚀 Desplegando a development..."
echo ""

# Obtener rama actual
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Rama actual: $CURRENT_BRANCH"
echo ""

# Cambiar a development
echo "🔄 Cambiando a development..."
git checkout development

# Pull latest
echo "📥 Actualizando development..."
git pull origin development

# Si hay cambios en la rama actual y no estamos en development, mergear
if [ "$CURRENT_BRANCH" != "development" ]; then
  echo "🔀 Mergeando $CURRENT_BRANCH → development..."
  git merge $CURRENT_BRANCH --no-edit
fi

# Push
echo "📤 Pusheando a development..."
git push origin development

echo ""
echo "✅ Desplegado a development exitosamente!"
echo ""
echo "💡 Próximo paso: Si todo funciona bien, ejecuta ./deploy-prod.sh"

