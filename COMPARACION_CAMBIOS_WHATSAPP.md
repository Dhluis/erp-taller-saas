# 📊 Comparativa de Cambios - WhatsApp/WAHA

## 📅 Rango de Comparación
- **Commit Anterior (funcionaba bien):** `585c7e6c6d791f824dc6801b08faaef82eb8048a`
- **Commit Actual:** `HEAD`

---

## 📈 Estadísticas Generales

```
20 archivos modificados
+1549 líneas agregadas
-289 líneas eliminadas
Neto: +1260 líneas
```

---

## 🔴 Cambios Principales en `src/app/api/whatsapp/session/route.ts`

### 1. **Cambio en Autenticación** ⚠️ IMPORTANTE

**ANTES (usaba getTenantContext):**
```typescript
const { organizationId, userId } = await getTenantContext(request);
```

**AHORA (obtiene usuario directamente):**
```typescript
const { createClient } = await import('@/lib/supabase/server')
const supabase = await createClient()
const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

// Obtener organizationId del perfil del usuario usando Service Role
const supabaseAdmin = getSupabaseServiceClient()
const { data: userProfile } = await supabaseAdmin
  .from('users')
  .select('organization_id')
  .eq('auth_user_id', authUser.id)
  .single()

const organizationId = userProfile.organization_id
```

**Impacto:** Cambio de método de autenticación, podría afectar si hay problemas con `getTenantContext`

---

### 2. **Actualización Automática de Webhook** 🆕

**AGREGADO en GET handler cuando estado = WORKING:**
```typescript
// 🔥 NUEVO: Si la sesión está activa, actualizar webhook silenciosamente
if (status.status === 'WORKING') {
  console.log('[/api/whatsapp/session] 🔧 Sesión activa detectada, actualizando webhook...');
  try {
    await updateSessionWebhook(sessionName, organizationId);
    console.log('[/api/whatsapp/session] ✅ Webhook actualizado exitosamente');
  } catch (webhookError: any) {
    console.error('[/api/whatsapp/session] ⚠️ Error actualizando webhook (no crítico):', webhookError.message);
    // No lanzar error, continuar normalmente
  }
}
```

---

### 3. **Mejora en Manejo de Sesiones FAILED/STOPPED** 🔄

**ANTES:**
```typescript
if (['FAILED', 'STOPPED', 'ERROR'].includes(status.status) && status.exists) {
  // Solo reiniciaba si existía
  await startSession(sessionName, organizationId);
}
```

**AHORA:**
```typescript
if (['FAILED', 'STOPPED', 'ERROR'].includes(status.status)) {
  // Si la sesión no existe, crear nueva directamente
  if (!status.exists) {
    await createOrganizationSession(organizationId);
    // ... manejo de QR después de crear
  }
  
  // Si existe, verificar antes de reiniciar
  try {
    await startSession(sessionName, organizationId);
  } catch (startError: any) {
    if (startError.message?.includes('404')) {
      await createOrganizationSession(organizationId);
    }
  }
}
```

---

### 4. **Nueva Acción 'connect'** 🆕

**AGREGADO:**
```typescript
if (action === 'connect') {
  // Actualizar webhook antes de conectar
  await updateSessionWebhook(sessionName, organizationId);
  // ... resto de lógica de conexión
}
```

---

### 5. **Mejora en 'reconnect'** 🔄

**AGREGADO:**
```typescript
if (action === 'reconnect') {
  // 🔥 NUEVO: Siempre actualizar webhook antes de reconectar
  await updateSessionWebhook(sessionName, organizationId);
  // ... resto de lógica
}
```

---

## 🔵 Cambios en `src/lib/waha-sessions.ts`

### Función `updateSessionWebhook()` Mejorada

**ANTES:**
```typescript
export async function updateSessionWebhook(sessionName: string, organizationId?: string): Promise<void> {
  const orgId = organizationId || await getOrganizationFromSession(sessionName);
  const { url, key } = await getWahaConfig(orgId || undefined);
  // ... código simple
  console.log(`[WAHA Sessions] 🔄 Actualizando webhook de sesión: ${sessionName}`);
}
```

**AHORA:**
```typescript
export async function updateSessionWebhook(sessionName: string, organizationId?: string): Promise<void> {
  try {
    const orgId = organizationId || await getOrganizationFromSession(sessionName);
    if (!orgId) {
      throw new Error('No se pudo obtener organizationId para actualizar webhook');
    }
    
    const { url, key } = await getWahaConfig(orgId);
    
    console.log(`[WAHA Sessions] 🔧 Actualizando webhook para sesión: ${sessionName}`);
    console.log(`[WAHA Sessions] 📍 Webhook URL: ${webhookUrl}`);
    console.log(`[WAHA Sessions] 🏢 Organization ID: ${orgId}`);
    
    // ... más logging y manejo de errores
    
  } catch (error: any) {
    console.error(`[WAHA Sessions] ❌ Error en updateSessionWebhook:`, {
      message: error.message,
      stack: error.stack,
      sessionName,
      organizationId
    });
    throw error;
  }
}
```

**Mejoras:**
- ✅ Validación de `organizationId`
- ✅ Más logging detallado
- ✅ Mejor manejo de errores con try/catch

---

## 🆕 Archivos Nuevos Agregados

1. **`src/app/api/whatsapp/force-webhook/route.ts`**
   - Endpoint para forzar actualización de webhook
   - Con verificación después de actualizar

2. **`src/app/api/whatsapp/verify-webhook/route.ts`**
   - Endpoint para verificar estado del webhook
   - Útil para debugging

3. **`docs/WHATSAPP_WEBHOOK_VERIFICATION.md`**
   - Documentación sobre webhooks

---

## ⚠️ Cambios que Podrían Afectar Funcionamiento

### 1. **Cambio de Autenticación** 🔴 CRÍTICO
- **Antes:** `getTenantContext(request)`
- **Ahora:** Autenticación directa con Supabase
- **Riesgo:** Si `getTenantContext` tenía alguna lógica especial, podría haber regresiones

### 2. **Actualización Automática de Webhook** 🟡 MEDIO
- Se actualiza automáticamente cuando estado = WORKING
- Si falla, continúa sin error (no crítico)
- **Riesgo:** Podría causar más llamadas a WAHA si hay problemas de red

### 3. **Manejo de Sesiones FAILED** 🟢 BAJO
- Mejor manejo cuando sesión no existe
- **Riesgo:** Bajo, es una mejora

---

## 🎯 Resumen de Funcionalidades Nuevas

1. ✅ Actualización automática de webhook en GET (cuando WORKING)
2. ✅ Actualización automática en `connect`
3. ✅ Actualización automática en `reconnect`
4. ✅ Nuevo endpoint `/api/whatsapp/force-webhook`
5. ✅ Nuevo endpoint `/api/whatsapp/verify-webhook`
6. ✅ Mejor manejo de sesiones FAILED/STOPPED que no existen
7. ✅ Mejor logging en `updateSessionWebhook`

---

## 🔍 Puntos a Revisar

1. **¿Funcionaba bien con `getTenantContext`?** 
   - Si sí, el cambio a autenticación directa podría ser el problema

2. **¿El webhook se configuraba automáticamente antes?**
   - Si no, las actualizaciones automáticas nuevas podrían ser necesarias

3. **¿Había problemas con sesiones FAILED?**
   - Las mejoras en manejo de FAILED deberían ayudar

---

## 📝 Próximos Pasos Sugeridos

1. Revisar si `getTenantContext` tenía alguna lógica especial
2. Verificar logs de actualización de webhook (si hay muchos errores)
3. Probar con el commit anterior para confirmar qué funciona mejor

