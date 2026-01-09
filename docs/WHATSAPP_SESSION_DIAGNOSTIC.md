# 🔍 DIAGNÓSTICO CRÍTICO: Sesiones de WhatsApp en WAHA

**Fecha:** 2025-01-10  
**Problema:** Se crean múltiples sesiones en lugar de reutilizar la misma

---

## 📋 RESUMEN EJECUTIVO

### Comportamiento Esperado ✅
- **Una sesión por organización** con nombre fijo: `eagles_{organizationId_first_20_chars}`
- Al desconectar/reconectar, usar la **MISMA sesión**
- Todos los usuarios de la organización ven el **mismo número conectado**

### Comportamiento Actual ❌
- Cada vez que desconecta/reconecta se crea una **NUEVA sesión** en WAHA
- Hay **múltiples sesiones** para la misma organización

---

## 🔍 ANÁLISIS DEL CÓDIGO

### 1. ✅ `generateSessionName()` - **CORRECTO**

**Ubicación:** `src/lib/waha-sessions.ts` líneas 23-43

```typescript
export function generateSessionName(organizationId: string): string {
  // Remover guiones y tomar primeros 20 caracteres
  const cleanId = organizationId.replace(/-/g, '').substring(0, 20);
  const sessionName = `eagles_${cleanId}`;
  return sessionName;
}
```

**Estado:** ✅ **CORRECTO** - Genera nombre fijo basado en `organizationId`

---

### 2. ✅ `getOrganizationSession()` - **CORRECTO**

**Ubicación:** `src/lib/waha-sessions.ts` líneas 551-623

**Flujo:**
1. Busca `whatsapp_session_name` en BD para la organización
2. Si existe, verifica que exista en WAHA
3. Si no existe en WAHA, crea nueva
4. Si no existe en BD, crea nueva

**Estado:** ✅ **CORRECTO** - Reutiliza sesión existente si está en BD

---

### 3. ✅ `createOrganizationSession()` - **CORRECTO**

**Ubicación:** `src/lib/waha-sessions.ts` líneas 202-362

**Flujo:**
1. Genera nombre con `generateSessionName()` ✅
2. Intenta crear sesión en WAHA
3. Si sesión ya existe (409/422), **NO la elimina**, solo la reinicia si está FAILED ✅
4. Guarda el nombre en BD ✅

**Estado:** ✅ **CORRECTO** - Maneja sesiones existentes correctamente

---

### 4. ✅ `logoutSession()` - **CORRECTO**

**Ubicación:** `src/lib/waha-sessions.ts` líneas 762-786

**Flujo:**
- Solo hace logout (desconecta el número)
- **NO elimina la sesión** ✅

**Estado:** ✅ **CORRECTO** - Solo desconecta, no elimina

---

### 5. ❌ **PROBLEMA CRÍTICO:** `/api/whatsapp/session` - **INCORRECTO**

**Ubicación:** `src/app/api/whatsapp/session/route.ts` líneas 574-715

**Flujo ACTUAL (INCORRECTO):**
```typescript
// LOGOUT o CHANGE_NUMBER
if (action === 'logout' || action === 'change_number') {
  // 1. Logout ✅
  await logoutSession(sessionName, organizationId);
  
  // 2. Stop sesión ✅
  await fetch(`${url}/api/sessions/${sessionName}/stop`, ...);
  
  // 3. ❌ ELIMINAR SESIÓN (PROBLEMA)
  await fetch(`${url}/api/sessions/${sessionName}`, {
    method: 'DELETE'  // ❌ ESTO ELIMINA LA SESIÓN
  });
  
  // 4. ❌ CREAR NUEVA SESIÓN (PROBLEMA)
  await createOrganizationSession(organizationId);  // ❌ CREA NUEVA
}
```

**Problema identificado:**
- **Línea 627-654:** Elimina la sesión con `DELETE /api/sessions/${sessionName}` ❌
- **Línea 660:** Crea nueva sesión con `createOrganizationSession()` ❌
- Esto causa que se cree una nueva sesión cada vez, aunque el nombre sea el mismo

**Flujo CORRECTO (debería ser):**
```typescript
// LOGOUT o CHANGE_NUMBER
if (action === 'logout' || action === 'change_number') {
  // 1. Logout (desconectar número) ✅
  await logoutSession(sessionName, organizationId);
  
  // 2. NO eliminar la sesión ✅
  // 3. Reiniciar la sesión existente ✅
  await startSession(sessionName, organizationId);
  
  // 4. Obtener QR para reconectar
  const qr = await getSessionQR(sessionName, organizationId);
}
```

**Estado:** ❌ **INCORRECTO** - Elimina y recrea sesión en lugar de reutilizar

---

## 🚨 PROBLEMA RAÍZ

El código en `/api/whatsapp/session/route.ts` está **eliminando la sesión** cuando debería **solo desconectar el número** y **reutilizar la misma sesión**.

### Por qué esto causa múltiples sesiones:

1. Usuario hace logout → Elimina sesión `eagles_xxx` ❌
2. Crea nueva sesión → `createOrganizationSession()` genera `eagles_xxx` (mismo nombre)
3. Pero si hay un error o timing issue, puede crear otra sesión con nombre diferente
4. O si la sesión anterior no se eliminó completamente, quedan múltiples sesiones

---

## ✅ SOLUCIÓN

### Cambios necesarios en `src/app/api/whatsapp/session/route.ts`:

**Eliminar:**
- ❌ Líneas 627-654: Eliminación de sesión con DELETE
- ❌ Línea 660: Creación de nueva sesión

**Reemplazar con:**
- ✅ Reiniciar sesión existente con `startSession()`
- ✅ Reutilizar el `sessionName` que ya está en BD

---

## 📊 COMPARACIÓN: Código Actual vs Esperado

| Acción | Código Actual ❌ | Código Esperado ✅ |
|--------|------------------|-------------------|
| Logout | `logoutSession()` → `stopSession()` → `DELETE session` → `createOrganizationSession()` | `logoutSession()` → `startSession()` (reutilizar) |
| Resultado | Nueva sesión creada | Misma sesión reutilizada |
| Sesiones en WAHA | Múltiples (una por logout) | Una por organización |

---

## 🔧 PLAN DE ACCIÓN

### 🔴 CRÍTICO - Corregir flujo de logout/reconnect

**Archivo:** `src/app/api/whatsapp/session/route.ts`  
**Líneas:** 574-715

**Cambios:**
1. Eliminar código que borra la sesión (líneas 627-654)
2. Eliminar creación de nueva sesión (línea 660)
3. Reemplazar con reinicio de sesión existente usando `startSession()`
4. Asegurar que se use el `sessionName` de BD (ya obtenido en línea 568)

**Prioridad:** 🔴 **CRÍTICA**  
**Esfuerzo:** 30 minutos

---

## 📝 CÓDIGO ACTUAL PROBLEMÁTICO

```typescript
// ❌ PROBLEMA: Líneas 627-660 en src/app/api/whatsapp/session/route.ts

// 5. Eliminar la sesión ❌
const deleteResponse = await fetchWithTimeout(
  `${url}/api/sessions/${sessionName}`,  // ❌ ELIMINA LA SESIÓN
  {
    method: 'DELETE',
    headers: { 'X-Api-Key': key }
  },
  10000
);

// 6. Crear nueva sesión ❌
await createOrganizationSession(organizationId);  // ❌ CREA NUEVA
```

---

## ✅ CÓDIGO CORRECTO (Propuesto)

```typescript
// ✅ SOLUCIÓN: Reutilizar sesión existente

// 1. Logout (desconectar número) ✅
await logoutSession(sessionName, organizationId);

// 2. Reiniciar sesión existente (NO eliminar, NO crear nueva) ✅
await startSession(sessionName, organizationId);

// 3. Actualizar webhook ✅
await updateWebhookForOrganization(sessionName, organizationId);

// 4. Obtener QR para reconectar ✅
const qr = await getCachedQR(sessionName, organizationId);
```

---

## 🎯 CONCLUSIÓN

**Problema identificado:** ✅  
**Ubicación:** `src/app/api/whatsapp/session/route.ts` líneas 627-660  
**Causa:** Eliminación de sesión + creación de nueva en lugar de reutilizar  
**Solución:** Eliminar código de DELETE y createOrganizationSession, usar startSession() en su lugar

**Estado:** 🔴 **CRÍTICO - Requiere corrección inmediata**

---

**Generado:** 2025-01-10  
**Última revisión:** Análisis completo del flujo de sesiones

