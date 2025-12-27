# 🚀 Quick Start - Git Workflow (Opción A)

## 📋 Flujo Rápido

```
development → staging → main
```

---

## ✅ Para Trabajar en el Proyecto

### 1. Siempre empieza desde `development`

```bash
git checkout development
git pull origin development
```

### 2. Hacer tus cambios

```bash
# Trabajar en tu código...
git add .
git commit -m "feat: descripción del cambio"
git push origin development
```

---

## 📤 Para Llevar Cambios a Staging (Testing)

1. **Asegurar que development está actualizado:**
   ```bash
   git checkout development
   git pull origin development
   ```

2. **Crear Pull Request en GitHub:**
   - Ve a: https://github.com/Dhluis/erp-taller-saas/pulls
   - Click "New Pull Request"
   - Base: `staging` ← Compare: `development`
   - Revisar cambios
   - Crear y Merge PR

3. **Verificar en Staging:**
   - Vercel hará deploy automático
   - Probar que todo funcione

---

## 🎯 Para Llevar Cambios a Producción (main)

1. **Asegurar que staging está probado y listo**

2. **Crear Pull Request en GitHub:**
   - Ve a: https://github.com/Dhluis/erp-taller-saas/pulls
   - Click "New Pull Request"
   - Base: `main` ← Compare: `staging`
   - Revisar cambios
   - Crear PR
   - **Esperar 1 aprobación** (requerida)
   - Merge PR

3. **Deploy automático:**
   - Vercel detecta cambios en `main`
   - Deploy automático a producción

---

## ⚠️ Importante

- ✅ **SIEMPRE trabajar desde `development`**
- ✅ **Usar PRs para mover código entre branches**
- ❌ **NUNCA hacer push directo a `main`** (está protegido)

---

## 🔗 Enlaces Útiles

- **Repositorio:** https://github.com/Dhluis/erp-taller-saas
- **Pull Requests:** https://github.com/Dhluis/erp-taller-saas/pulls
- **Branches:** https://github.com/Dhluis/erp-taller-saas/branches

---

**Ver documentación completa en:** `WORKFLOW.md`

