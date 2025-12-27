# 🔄 Git Workflow - ERP Taller SaaS

## 📋 Branches

### Branches Principales

- **`main`** - Producción (protegido, requiere PR)
- **`staging`** - Pre-producción / Testing
- **`development`** - Desarrollo activo

### Flujo de Trabajo (Opción A - Completo)

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

**En GitHub:**
1. Ir a: https://github.com/Dhluis/erp-taller-saas/pulls
2. Click "New Pull Request"
3. Base: `staging` ← Compare: `development`
4. Revisar cambios
5. Crear PR
6. Review y Merge

**O desde terminal:**
```bash
# Asegurar que development está actualizado
git checkout development
git pull origin development

# Verificar cambios listos para staging
git log staging..development

# Crear PR desde GitHub (no se puede hacer merge directo por buenas prácticas)
```

### 2. Verificar en Staging

- Vercel debería hacer deploy automático de `staging`
- Testing en entorno de staging
- Verificar que todo funcione correctamente
- Si hay problemas, arreglar en `development` y repetir el proceso

---

## 🎯 Deploy a Producción (main)

Cuando `staging` esté validado y listo para producción:

### 1. Crear PR: `staging` → `main`

**En GitHub:**
1. Ir a: https://github.com/Dhluis/erp-taller-saas/pulls
2. Click "New Pull Request"
3. Base: `main` ← Compare: `staging`
4. Revisar cambios finales
5. Crear PR
6. **Requiere 1 aprobación** (protección de branch)
7. Esperar aprobación
8. Merge a `main`

**Importante:** No puedes hacer push directo a `main` - siempre usar PR

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

- Sin protección (pero usa PRs por buenas prácticas)

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

### Ver diferencias entre branches

```bash
# Ver qué commits tiene development que staging no tiene
git log staging..development

# Ver qué commits tiene staging que main no tiene
git log main..staging
```

### Limpiar branches locales merged

```bash
git branch --merged | grep -v "\*\|main\|staging\|development" | xargs -n 1 git branch -d
```

---

## ⚠️ Reglas Importantes

1. **NUNCA hacer push directo a `main`** - Siempre usar PR desde `staging`
2. **Siempre trabajar desde `development`** - Es tu branch principal de desarrollo
3. **Usar PRs para promover cambios** - `development` → `staging` → `main`
4. **Siempre actualizar antes de crear PR** - `git pull origin base-branch`
5. **Usar commits descriptivos** - `feat:`, `fix:`, `docs:`, `refactor:`, etc.
6. **Revisar PR antes de merge** - Incluso tus propios PRs
7. **Mantener `main` estable** - Solo código probado en staging

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
- **Preview Branches:** `staging` → Deploy automático a staging
- **Preview Branches:** `development`, `feature/*` → Deploys de preview

### Configuración

1. Ve a Vercel Dashboard
2. Settings → Git → Production Branch
3. Asegúrate de que `main` esté configurado como Production Branch
4. Vercel hará deploy automático de `staging` como preview también

---

## ✅ Checklist Antes de PR

### Antes de PR `development` → `staging`:

- [ ] Código funciona localmente
- [ ] Tests pasan (si aplica)
- [ ] Código sigue las convenciones del proyecto
- [ ] Commits descriptivos
- [ ] Branch `development` actualizado
- [ ] Sin conflictos con `staging`
- [ ] Documentación actualizada (si aplica)

### Antes de PR `staging` → `main`:

- [ ] Todo probado y validado en staging
- [ ] No hay bugs conocidos
- [ ] Código revisado
- [ ] Branch `staging` actualizado
- [ ] Sin conflictos con `main`
- [ ] Listo para producción

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
# Después del merge a main, también mergear a staging y development:
# - Crear PR: hotfix/descripcion-fix → staging
# - Crear PR: hotfix/descripcion-fix → development
```

### Opción 2: Cherry-pick

```bash
# Si ya hiciste el fix en development/staging
git checkout main
git cherry-pick <commit-hash>
git push origin main

# Luego sync a staging y development
```

---

## 📊 Diagrama de Flujo

```
┌─────────────┐
│ development │ ← Trabajo diario aquí
└──────┬──────┘
       │ PR
       ↓
┌─────────────┐
│   staging   │ ← Testing y validación
└──────┬──────┘
       │ PR (requiere aprobación)
       ↓
┌─────────────┐
│    main     │ ← Producción (protegido)
└─────────────┘
```

---

**Última actualización:** Enero 2025  
**Versión:** Opción A - Flujo Completo (development → staging → main)
