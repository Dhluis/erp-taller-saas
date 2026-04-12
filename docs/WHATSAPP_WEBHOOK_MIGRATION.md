# 🔄 Migración de Webhooks de WhatsApp a Sistema Multi-Tenant Dinámico

**Fecha:** 27 de diciembre de 2025  
**Estado:** ✅ Implementado

---

## 📋 Resumen

Se ha implementado un sistema de webhooks dinámicos multi-tenant para WhatsApp. Ahora cada organización tiene su propio webhook configurado con su Organization ID específico, en lugar de usar una configuración global hardcodeada.

---

## ⚠️ IMPORTANTE: Variables de Entorno a Remover

### Variables que DEBEN ser removidas de EasyPanel:

```env
# ❌ REMOVER ESTAS VARIABLES GLOBALES
WHATSAPP_HOOK_URL=https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp
WHATSAPP_HOOK_EVENTS=message,session.status
```

**Razón:** Estas variables globales aplican a TODAS las sesiones y sobrescriben las configuraciones por sesión que el código ahora hace dinámicamente.

### Variables que SE MANTIENEN en EasyPanel:

```env
# ✅ MANTENER ESTAS VARIABLES
WAHA_APPS_ENABLED=false
WAHA_PUBLIC_URL=https://waha-erp-eagles-sistem.0rfifc.easypanel.host/
WHATSAPP_DEFAULT_ENGINE=NOWEB
WAHA_API_KEY=mi_clave_segura_2025
WAHA_LOCAL_STORE_BASE_DIR=/app/.sessions
WHATSAPP_FILES_FOLDER=/app/.media
WAHA_DASHBOARD_ENABLED=true
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD=Gabyyluis2025@%
REDIS_URL=redis://default:Gabyyluis2025@%@redis_redis-erp:6379
WHATSAPP_RESTART_ALL_SESSIONS=true
TZ=America/Mexico_City
```

---

## 🔧 Cómo Funciona Ahora

### Antes (Sistema Hardcodeado):
- Una variable global `WHATSAPP_HOOK_HEADERS` con un Organization ID fijo
- TODAS las organizaciones usaban el mismo Organization ID en webhooks
- ❌ No era verdadero multi-tenant

### Ahora (Sistema Dinámico):
- Cada organización tiene su propio webhook configurado con su Organization ID
- El webhook se configura automáticamente cuando:
  - Se crea una nueva sesión (`createOrganizationSession`)
  - Se reconecta WhatsApp (`action: 'reconnect'`)
  - Se reinicia la sesión (`action: 'restart'`)
  - Se cambia el número (`action: 'change_number'`)
- ✅ Verdadero multi-tenant

---

## 📝 Formato del Webhook Configurado

Cada sesión ahora tiene su webhook configurado así:

```json
{
  "config": {
    "webhooks": [{
      "url": "https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp",
      "events": ["message", "session.status"],
      "downloadMedia": true,
      "downloadMediaOnMessage": true,
      "customHeaders": [{
        "name": "X-Organization-ID",
        "value": "<organization_id_dinamico_de_cada_org>"
      }]
    }]
  }
}
```

---

## 🚀 Pasos de Migración

### 1. Remover Variables Globales (EasyPanel)

1. Accede a EasyPanel
2. Ve a las variables de entorno del contenedor WAHA
3. **ELIMINA** estas variables:
   - `WHATSAPP_HOOK_URL`
   - `WHATSAPP_HOOK_EVENTS`
   - `WHATSAPP_HOOK_HEADERS` (si existe)

### 2. Ejecutar Migración (Opcional - para organizaciones existentes)

Si tienes organizaciones que ya tienen sesiones configuradas con el sistema antiguo:

```bash
# Como admin, ejecutar:
POST /api/admin/migrate-webhooks
```

Esto actualizará todos los webhooks existentes al sistema dinámico.

**O manualmente:**
- Para cada organización, ve a la página de WhatsApp
- Usa el botón "Verificar Webhook" en la sección de diagnóstico
- Si está incorrecto, usa "Actualizar Webhook"

### 3. Verificar Configuración

Para verificar que todo funciona:

1. Ve a `/dashboard/whatsapp` (solo en desarrollo o con `NEXT_PUBLIC_ENABLE_WEBHOOK_DEBUG=true`)
2. Usa la sección "Configuración Multi-Tenant"
3. Haz clic en "Verificar Webhook"
4. Debe mostrar:
   - ✅ **Webhook configurado correctamente** (verde)
   - Organization ID esperado = Organization ID actual

---

## 🛠️ API Endpoints Disponibles

### Verificar Webhook
```typescript
POST /api/whatsapp/session
{
  "action": "verify_webhook"
}

// Respuesta:
{
  "success": true,
  "webhook": {
    "url": "...",
    "events": ["message", "session.status"],
    "customHeaders": [{
      "name": "X-Organization-ID",
      "value": "<org_id>"
    }]
  },
  "isConfigured": true,
  "isCorrect": true,
  "expectedOrgId": "...",
  "actualOrgId": "..."
}
```

### Forzar Actualización de Webhook
```typescript
POST /api/whatsapp/session
{
  "action": "force_update_webhook"
}

// Respuesta:
{
  "success": true,
  "message": "Webhook actualizado exitosamente",
  "webhook": { ... },
  "isCorrect": true,
  "expectedOrgId": "...",
  "actualOrgId": "..."
}
```

### Migrar Todas las Organizaciones (Admin)
```typescript
POST /api/admin/migrate-webhooks

// Respuesta:
{
  "success": true,
  "message": "Migración completada",
  "summary": {
    "total": 10,
    "successful": 10,
    "failed": 0
  }
}
```

---

## 🐛 Troubleshooting

### Problema: Webhooks siguen usando el Organization ID antiguo

**Solución:**
1. Verifica que removiste las variables globales de EasyPanel
2. Reinicia el contenedor WAHA en EasyPanel
3. Ejecuta la migración: `POST /api/admin/migrate-webhooks`
4. O actualiza manualmente cada webhook desde la UI

### Problema: Webhook no se configura al crear sesión

**Solución:**
1. Verifica logs en Vercel: busca `[WAHA Sessions] 🔧 Configurando webhook para org:`
2. Verifica que `updateWebhookForOrganization` se está llamando
3. Verifica que `NEXT_PUBLIC_APP_URL` está configurada correctamente

### Problema: Migración falla para algunas organizaciones

**Solución:**
1. Revisa los logs del endpoint de migración
2. Verifica que cada organización tiene `whatsapp_session_name` válido
3. Verifica que `whatsapp_session_name` no es "default" o vacío
4. Ejecuta la verificación individual para organizaciones problemáticas

---

## 📚 Archivos Modificados

1. **`src/lib/waha-sessions.ts`**
   - Nueva función: `updateWebhookForOrganization()`
   - Nueva función: `verifyWebhookConfiguration()`
   - `updateSessionWebhook()` ahora es wrapper de `updateWebhookForOrganization()`

2. **`src/app/api/whatsapp/session/route.ts`**
   - Llamadas a `updateWebhookForOrganization()` en múltiples lugares
   - Nuevas acciones: `force_update_webhook`, `verify_webhook`, `restart`

3. **`src/app/dashboard/whatsapp/page.tsx`**
   - Nueva sección: "Configuración Multi-Tenant" (solo dev/admin)
   - Botones para verificar y actualizar webhooks

4. **`src/lib/scripts/migrate-webhooks.ts`** (NUEVO)
   - Script para migrar todas las organizaciones

5. **`src/app/api/admin/migrate-webhooks/route.ts`** (NUEVO)
   - Endpoint protegido para ejecutar migración masiva

---

## ✅ Checklist de Migración

- [ ] Remover `WHATSAPP_HOOK_URL` de EasyPanel
- [ ] Remover `WHATSAPP_HOOK_EVENTS` de EasyPanel
- [ ] Remover `WHATSAPP_HOOK_HEADERS` de EasyPanel (si existe)
- [ ] Reiniciar contenedor WAHA en EasyPanel
- [ ] Verificar que las nuevas sesiones se configuran correctamente
- [ ] (Opcional) Ejecutar migración para organizaciones existentes
- [ ] Verificar configuración desde la UI de diagnóstico
- [ ] Probar que los mensajes llegan correctamente con el Organization ID correcto

---

**Última actualización:** 27 de diciembre de 2025

