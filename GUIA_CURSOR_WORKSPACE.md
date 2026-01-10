# 🎯 Guía: Configurar Cursor para Trabajar en Main (No en Worktree)

## ⚠️ PROBLEMA ACTUAL

Tu workspace de Cursor está abierto en un **worktree** (`pfo`) en lugar del repositorio principal.
Esto causa que los cambios se hagan en el worktree en lugar de `main`.

**Ruta actual del workspace:** `C:\Users\exclu\.cursor\worktrees\erp-taller-saas\pfo` ❌  
**Ruta correcta:** `C:\Users\exclu\erp-taller-saas` ✅

---

## ✅ SOLUCIÓN PASO A PASO

### Paso 1: Cerrar el Workspace Actual

1. En Cursor, ve a **File → Close Workspace** (o presiona `Ctrl+K`, luego `Ctrl+W`)
2. O simplemente cierra todas las ventanas de Cursor

### Paso 2: Abrir el Repositorio Principal

1. Abre Cursor nuevamente
2. Ve a **File → Open Folder** (o presiona `Ctrl+K`, luego `Ctrl+O`)
3. Navega a: `C:\Users\exclu\erp-taller-saas`
4. Selecciona la carpeta y haz clic en **"Select Folder"**

### Paso 3: Verificar que Estás en Main

Abre la terminal integrada de Cursor (`Ctrl+`` `) y ejecuta:

```bash
# Verificar ruta actual
pwd
# Debe mostrar: C:\Users\exclu\erp-taller-saas

# Verificar rama actual
git branch --show-current
# Debe mostrar: main

# Verificar estado
git status
# Debe mostrar: "On branch main" y "working tree clean"
```

---

## 🔧 CONFIGURACIÓN ADICIONAL EN CURSOR

### Crear Configuración del Workspace

Ya creé el archivo `.vscode/settings.json` con la configuración correcta.

### Configuración del Terminal

Para asegurar que siempre trabajes en el directorio correcto:

1. Ve a **File → Preferences → Settings** (o `Ctrl+,`)
2. Busca: `terminal.integrated.cwd`
3. Configúralo como: `C:/Users/exclu/erp-taller-saas`

O agrega esto a `.vscode/settings.json`:

```json
{
  "terminal.integrated.cwd": "${workspaceFolder}",
  "terminal.integrated.defaultLocation": "view"
}
```

---

## 🛡️ REGLAS PARA CURSOR AI

Para evitar que Cursor AI haga cambios en el worktree, agregué reglas al archivo `.cursorrules`:

### Verificación Obligatoria Antes de Cambios

**ANTES de hacer cualquier cambio, Cursor AI DEBE:**

1. ✅ Ejecutar `pwd` y verificar que sea `C:\Users\exclu\erp-taller-saas`
2. ✅ Ejecutar `git branch --show-current` y verificar que sea `main`
3. ✅ Verificar que NO esté en un worktree (ruta no debe contener `.cursor/worktrees`)

### Si Detecta Worktree

Si Cursor AI detecta que está en un worktree, DEBE:
- ❌ NO hacer cambios
- ✅ Informar al usuario que necesita cambiar el workspace
- ✅ Proporcionar instrucciones para cambiar al repositorio principal

---

## 📋 VERIFICACIÓN RÁPIDA

Después de cambiar el workspace, ejecuta estos comandos para verificar:

```bash
# 1. Verificar ruta
pwd
# ✅ Debe mostrar: C:\Users\exclu\erp-taller-saas

# 2. Verificar rama
git branch --show-current
# ✅ Debe mostrar: main

# 3. Verificar remoto
git remote -v
# ✅ Debe mostrar: origin https://github.com/Dhluis/erp-taller-saas.git

# 4. Verificar estado
git status
# ✅ Debe mostrar: "On branch main" y "Your branch is up to date with 'origin/main'"
```

---

## 🧹 LIMPIEZA DE WORKTREES (OPCIONAL)

Si ya no necesitas el worktree `pfo`, puedes eliminarlo:

```bash
# Desde el repositorio principal
cd C:/Users/exclu/erp-taller-saas

# Eliminar el worktree
git worktree remove C:/Users/exclu/.cursor/worktrees/erp-taller-saas/pfo --force

# Verificar que se eliminó
git worktree list
# Ya no debe aparecer el worktree pfo
```

**⚠️ ADVERTENCIA:** Solo elimina worktrees si estás seguro de que no los necesitas.

---

## 🎯 CONFIGURACIÓN RECOMENDADA

### Configuración de Git en Cursor

1. **File → Preferences → Settings**
2. Busca: `git.enabled`
3. Asegúrate de que esté habilitado
4. Busca: `git.autoRepositoryDetection`
5. Asegúrate de que esté habilitado

### Atajos de Teclado Útiles

- `Ctrl+Shift+P` → `Git: Show Git Output` - Ver logs de git
- `Ctrl+Shift+G` - Abrir panel de control de Git
- `Ctrl+`` ` - Abrir/Cerrar terminal integrada

---

## ✅ CHECKLIST FINAL

Después de configurar, verifica:

- [ ] Workspace abierto en: `C:\Users\exclu\erp-taller-saas`
- [ ] Rama actual es: `main`
- [ ] `pwd` muestra la ruta correcta
- [ ] `git status` muestra "On branch main"
- [ ] Archivo `.vscode/settings.json` existe
- [ ] Archivo `.cursorrules` tiene las reglas de workspace

---

## 🆘 SI SIGUE PASANDO

Si después de todo esto, Cursor AI sigue haciendo cambios en el worktree:

1. **Verifica la ruta del workspace:**
   - Ve a **File → Preferences → Settings**
   - Busca: `workspaceFolder`
   - Debe ser: `C:/Users/exclu/erp-taller-saas`

2. **Cierra y vuelve a abrir Cursor:**
   - Cierra completamente Cursor
   - Abre nuevamente
   - Abre la carpeta `C:\Users\exclu\erp-taller-saas`

3. **Verifica que no hay múltiples instancias:**
   - Asegúrate de que solo hay una ventana de Cursor abierta
   - Cierra todas las ventanas relacionadas con worktrees

---

## 📞 NOTA IMPORTANTE

**SIEMPRE menciona en tus prompts:** "Asegúrate de trabajar en el repositorio principal en la rama main, no en ningún worktree"

Esto ayudará a Cursor AI a verificar el directorio antes de hacer cambios.
