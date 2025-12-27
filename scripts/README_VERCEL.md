# Scripts de Gestión de Vercel

Scripts para verificar tokens y limpiar deployments antiguos en Vercel.

## 🔑 Obtener Token de Vercel

Para usar estos scripts, necesitas un **token de API de Vercel con permisos completos**:

1. Ve a: https://vercel.com/account/tokens
2. Clic en "Create Token"
3. Nombre: `cleanup-deployments` (o el que prefieras)
4. Scope: **"Full Account"** (importante: no uses un token de proyecto específico)
5. Expiration: Elige la duración (recomendado: "No Expiration" o "90 days")
6. Clic en "Create Token"
7. **Copia el token inmediatamente** (solo se muestra una vez)

⚠️ **Importante**: Los tokens que empiezan con `prj_` son tokens de proyecto específico y **NO** tienen permisos para eliminar deployments. Necesitas un token de cuenta completa.

## 📋 Scripts Disponibles

### 1. Verificar Token

Verifica que tu token funcione y tenga los permisos necesarios:

```bash
# Windows PowerShell
$env:VERCEL_TOKEN="tu_token_aqui"; node scripts/vercel-check-token.js

# Windows CMD
set VERCEL_TOKEN=tu_token_aqui && node scripts/vercel-check-token.js

# Linux/Mac
VERCEL_TOKEN=tu_token_aqui node scripts/vercel-check-token.js
```

**Qué hace:**
- ✅ Verifica que el token sea válido
- ✅ Muestra información del usuario
- ✅ Lista proyectos disponibles
- ✅ Busca el proyecto "erp-taller-saas"
- ✅ Lista deployments recientes
- ✅ Verifica permisos

### 2. Limpiar Deployments (Dry Run)

**Por defecto, el script NO elimina nada** (modo dry-run). Solo muestra qué se eliminaría:

```bash
# Windows PowerShell
$env:VERCEL_TOKEN="tu_token_aqui"; node scripts/vercel-cleanup-deployments.js

# Windows CMD
set VERCEL_TOKEN=tu_token_aqui && node scripts/vercel-cleanup-deployments.js

# Linux/Mac
VERCEL_TOKEN=tu_token_aqui node scripts/vercel-cleanup-deployments.js
```

**Configuración por defecto:**
- Mantener últimos **5** deployments
- Eliminar deployments más antiguos que **30 días**
- Eliminar estados: `READY`, `ERROR`, `CANCELED`

### 3. Limpiar Deployments (Eliminación Real)

⚠️ **CUIDADO**: Esto eliminará deployments permanentemente.

```bash
# Windows PowerShell
$env:VERCEL_TOKEN="tu_token_aqui"; $env:DRY_RUN="false"; node scripts/vercel-cleanup-deployments.js

# Windows CMD
set VERCEL_TOKEN=tu_token_aqui && set DRY_RUN=false && node scripts/vercel-cleanup-deployments.js

# Linux/Mac
VERCEL_TOKEN=tu_token_aqui DRY_RUN=false node scripts/vercel-cleanup-deployments.js
```

### 4. Personalizar Configuración

Puedes personalizar los parámetros:

```bash
# Ejemplo: Mantener 10 últimos, eliminar más antiguos que 7 días
$env:VERCEL_TOKEN="tu_token_aqui"
$env:KEEP_LAST="10"
$env:DELETE_OLDER_THAN_DAYS="7"
$env:DELETE_STATES="READY,ERROR,CANCELED,QUEUED"
node scripts/vercel-cleanup-deployments.js
```

**Parámetros disponibles:**
- `VERCEL_TOKEN` (requerido): Tu token de API de Vercel
- `PROJECT_NAME` (opcional, default: `erp-taller-saas`): Nombre del proyecto
- `KEEP_LAST` (opcional, default: `5`): Número de deployments recientes a mantener
- `DELETE_OLDER_THAN_DAYS` (opcional, default: `30`): Eliminar deployments más antiguos que X días
- `DELETE_STATES` (opcional, default: `READY,ERROR,CANCELED`): Estados a eliminar (separados por comas)
- `DRY_RUN` (opcional, default: `true`): `true` para simular, `false` para eliminar realmente

## 🔒 Seguridad

- **NUNCA** commits estos scripts con tokens incluidos
- **NUNCA** compartas tu token públicamente
- Usa variables de entorno para los tokens
- Considera usar un gestor de secretos para producción

## 📝 Ejemplo de Uso Completo

```bash
# 1. Verificar token primero
$env:VERCEL_TOKEN="tu_token"; node scripts/vercel-check-token.js

# 2. Ver qué se eliminaría (dry-run)
$env:VERCEL_TOKEN="tu_token"; node scripts/vercel-cleanup-deployments.js

# 3. Eliminar realmente (si estás seguro)
$env:VERCEL_TOKEN="tu_token"; $env:DRY_RUN="false"; node scripts/vercel-cleanup-deployments.js
```

## ⚠️ Problemas Comunes

### "Not authorized" o "Forbidden"
- El token no tiene permisos suficientes
- Necesitas un token con scope "Full Account", no un token de proyecto
- El token puede estar expirado

### "Project not found"
- Verifica el nombre del proyecto con `vercel-check-token.js`
- Usa `PROJECT_NAME` para especificar el nombre correcto

### "Cannot delete deployments"
- El token debe tener permisos de escritura
- Algunos deployments pueden estar protegidos
- Verifica que el deployment no esté en estado `BUILDING` o `QUEUED`

