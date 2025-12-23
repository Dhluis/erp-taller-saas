# 🔄 Git Workflow - ERP Taller SaaS

## 📋 Branches

### Branches Principales

- **`main`** - Producción (protegido, requiere PR)
- **`staging`** - Pre-producción / Testing
- **`development`** - Desarrollo activo

### Flujo de Trabajo

```
development → staging → main
```

---

## 🚀 Desarrollo Normal

### 1. Crear Feature Branch desde `development`

```bash
git checkout development
git pull origin development
git checkout -b feature/nombre-feature
```

### 2. Trabajar y Hacer Commits

```bash
# Trabajar en tu feature...
git add .
git commit -m "feat: descripción del cambio"
```

### 3. Push Feature Branch

```bash
git push origin feature/nombre-feature
```

### 4. Crear Pull Request

1. Ve a GitHub: https://github.com/Dhluis/erp-taller-saas/pulls
2. Crea PR: `feature/nombre-feature` → `development`
3. Espera revisión y aprobación
4. Merge a `development`

---

## 📤 Promover a Staging

Cuando `development` tenga cambios listos para testing:

### 1. Crear PR: `development` → `staging`

```bash
# En GitHub:
# 1. Ir a Pull Requests
# 2. New Pull Request
# 3. Base: staging ← Compare: development
# 4. Crear PR
# 5. Review y Merge
```

### 2. Verificar en Staging

- Vercel debería hacer deploy automático de `staging`
- Testing en entorno de staging
- Verificar que todo funcione

---

## 🎯 Deploy a Producción

Cuando `staging` esté validado:

### 1. Crear PR: `staging` → `main`

```bash
# En GitHub:
# 1. Ir a Pull Requests
# 2. New Pull Request
# 3. Base: main ← Compare: staging
# 4. Crear PR
# 5. Esperar aprobación (requerida por protección)
# 6. Merge a main
```

### 2. Deploy Automático

- Vercel detecta cambios en `main`
- Hace deploy automático a producción
- Verificar que todo funcione en producción

---

## 🛡️ Protección de Branches

### `main` (Producción)

**Configuración en GitHub:**
- ✅ Requiere Pull Request antes de merge
- ✅ Requiere 1 aprobación
- ✅ Requiere que status checks pasen
- ✅ Requiere que branches estén actualizados
- ✅ No permite bypass de estas reglas

**No puedes hacer push directo a `main`** ❌

### `staging` y `development`

- No tienen protección (pero usa PRs por buenas prácticas)

---

## 🔧 Comandos Útiles

### Ver branches disponibles

```bash
git branch -a
```

### Cambiar de branch

```bash
git checkout main
git checkout staging
git checkout development
```

### Actualizar branch local

```bash
git checkout development
git pull origin development
```

### Sincronizar todos los branches

```bash
git checkout main && git pull origin main
git checkout staging && git pull origin staging
git checkout development && git pull origin development
```

### Limpiar branches locales merged

```bash
git branch --merged | grep -v "\*\|main\|staging\|development" | xargs -n 1 git branch -d
```

---

## ⚠️ Reglas Importantes

1. **NUNCA hacer push directo a `main`** - Siempre usar PR
2. **Siempre actualizar antes de crear PR** - `git pull origin base-branch`
3. **Usar commits descriptivos** - `feat:`, `fix:`, `docs:`, `refactor:`, etc.
4. **Revisar PR antes de merge** - Incluso tus propios PRs
5. **Mantener `main` estable** - Solo código probado en staging

---

## 🚨 Hotfixes (Producción)

Si necesitas arreglar algo urgente en producción:

### Opción 1: Desde `main` (Recomendado)

```bash
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-fix

# Hacer cambios...
git add .
git commit -m "fix: descripción del hotfix"
git push origin hotfix/descripcion-fix

# Crear PR: hotfix/descripcion-fix → main
# Después del merge a main, también mergear a staging y development
```

### Opción 2: Cherry-pick

```bash
# Si ya hiciste el fix en development/staging
git checkout main
git cherry-pick <commit-hash>
git push origin main
```

---

## 📝 Convenciones de Commits

Usa prefijos descriptivos:

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bug
- `docs:` - Documentación
- `style:` - Formato, estilo
- `refactor:` - Refactorización
- `test:` - Tests
- `chore:` - Tareas de mantenimiento
- `perf:` - Mejoras de performance
- `ci:` - Configuración CI/CD

Ejemplo:
```bash
git commit -m "feat: agregar integración con WhatsApp"
git commit -m "fix: corregir error de paginación en órdenes"
git commit -m "docs: actualizar README con instrucciones de setup"
```

---

## 🔄 Vercel Deployment

### Branches en Vercel

- **Production Branch:** `main` → Deploy automático a producción
- **Preview Branches:** `staging`, `development`, `feature/*` → Deploys de preview

### Configuración

1. Ve a Vercel Dashboard
2. Settings → Git → Production Branch
3. Asegúrate de que `main` esté configurado como Production Branch

---

## ✅ Checklist Antes de PR

Antes de crear un Pull Request:

- [ ] Código funciona localmente
- [ ] Tests pasan (si aplica)
- [ ] Código sigue las convenciones del proyecto
- [ ] Commits descriptivos
- [ ] Branch actualizado con base branch
- [ ] Sin conflictos
- [ ] Documentación actualizada (si aplica)

---

**Última actualización:** Enero 2025

