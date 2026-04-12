# 🔔 Verificación del Webhook de WAHA

Este documento explica cómo verificar que el webhook de WhatsApp esté correctamente configurado y funcionando.

---

## ✅ Estado Actual del Código

### 1. **Endpoint del Webhook Existe** ✅

**Ubicación:** `src/app/api/webhooks/whatsapp/route.ts`

**Funcionalidad:**
- ✅ Recibe eventos POST de WAHA
- ✅ Maneja eventos: `message`, `session.status`, `message.reaction`
- ✅ Procesa mensajes y llama al AI Agent
- ✅ Guarda mensajes en base de datos
- ✅ Actualiza estado de conexión

---

### 2. **Configuración del Webhook en WAHA** ✅

**Ubicación:** `src/lib/waha-sessions.ts`

**Cuando se crea una sesión nueva:**
```typescript
// Líneas 222-239 de waha-sessions.ts
const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
  : 'https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp';

const requestBody = {
  name: sessionName,
  start: true,
  config: {
    webhooks: [{
      url: webhookUrl,
      events: ['message', 'session.status'],
      downloadMedia: true,
      downloadMediaOnMessage: true
    }]
  }
};
```

**Eventos configurados:**
- ✅ `message` - Mensajes entrantes
- ✅ `session.status` - Cambios de estado de conexión

**Soporte multimedia:**
- ✅ `downloadMedia: true` - Descargar media automáticamente
- ✅ `downloadMediaOnMessage: true` - Descargar cuando llega mensaje

---

### 3. **Problema Potencial Identificado** ⚠️

**Si la sesión ya existe en WAHA:**
- El código NO actualiza el webhook automáticamente cuando la sesión ya existe (líneas 281-306)
- Si la sesión fue creada antes de configurar el webhook, podría no tener webhook configurado
- Si cambió la URL de la app, el webhook podría estar apuntando a la URL antigua

**Solución disponible:**
- Existe función `updateSessionWebhook()` que puede actualizar el webhook
- Endpoint `/api/whatsapp/session?action=update_webhook` puede ser llamado para actualizar

---

## 🔍 Checklist de Verificación

### ✅ 1. Verificar que el Endpoint Existe

```bash
# En producción
curl https://tu-app.vercel.app/api/webhooks/whatsapp

# Debería retornar:
# {"status":"ok"}
```

**Ubicación del código:**
- `src/app/api/webhooks/whatsapp/route.ts` (línea 31-33)

---

### ✅ 2. Verificar Variable de Entorno

**Variable requerida:**
```env
NEXT_PUBLIC_APP_URL=https://erp-taller-saas-correct.vercel.app
```

**Dónde se usa:**
- `src/lib/waha-sessions.ts` (línea 223-225)
- Si no existe, usa fallback: `https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp`

**Cómo verificar:**
1. Ve a Vercel Dashboard → Settings → Environment Variables
2. Busca `NEXT_PUBLIC_APP_URL`
3. Debe estar configurada con la URL de producción

---

### ✅ 3. Verificar Configuración en WAHA

**Cómo verificar directamente en WAHA:**

```bash
# Obtener configuración de la sesión
curl -X GET \
  "https://tu-waha-url.com/api/sessions/eagles_<organizationId>" \
  -H "X-Api-Key: tu-api-key"

# Buscar en la respuesta:
# {
#   "config": {
#     "webhooks": [
#       {
#         "url": "https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp",
#         "events": ["message", "session.status"],
#         "downloadMedia": true,
#         "downloadMediaOnMessage": true
#       }
#     ]
#   }
# }
```

---

### ✅ 4. Verificar Logs cuando Llega un Mensaje

**Logs esperados en la consola (Vercel Logs):**

```
============================================================
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
[Webhook] 📋 Event Type: message
[Webhook] 🆔 Message ID: <messageId>
[Webhook] ⏰ Timestamp: <timestamp>
============================================================
[WAHA Webhook] 📨 Procesando mensaje...
[WAHA Webhook] ✅ Mensaje es entrante, procesando...
[WAHA Webhook] 📍 Organization ID: <organizationId>
[WAHA Webhook] 📱 Chat ID: <chatId>
```

**Si NO ves estos logs:**
- ❌ El webhook NO está configurado en WAHA
- ❌ El webhook URL es incorrecto
- ❌ WAHA no puede alcanzar tu URL

---

### ✅ 5. Probar el Webhook Manualmente

```bash
# Simular evento de mensaje
curl -X POST https://tu-app.vercel.app/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message",
    "session": "eagles_<organizationId>",
    "payload": {
      "id": "test123",
      "from": "5214491234567@c.us",
      "body": "Test message",
      "fromMe": false,
      "timestamp": 1234567890
    }
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "received": true
}
```

---

## 🔧 Solución si el Webhook NO Está Configurado

### Opción 1: Actualizar Webhook de Sesión Existente

**Usar endpoint de actualización:**

```bash
# Desde el frontend o con curl
POST /api/whatsapp/session?action=update_webhook

# O usar directamente la función
```

**Código:**
```typescript
import { updateSessionWebhook } from '@/lib/waha-sessions';

await updateSessionWebhook(sessionName, organizationId);
```

---

### Opción 2: Recrear la Sesión

**Si el webhook no se puede actualizar, recrear la sesión:**

1. Eliminar sesión en WAHA:
```bash
DELETE /api/sessions/<sessionName>
```

2. Crear nueva sesión (se configurará el webhook automáticamente):
```bash
POST /api/whatsapp/session?action=start
```

---

## 🚨 Problemas Comunes

### Problema 1: "No llegan mensajes al webhook"

**Posibles causas:**
1. ❌ Webhook no está configurado en WAHA
2. ❌ URL del webhook es incorrecta
3. ❌ URL del webhook no es accesible públicamente (localhost no funciona)
4. ❌ WAHA no puede alcanzar tu URL (firewall, CORS, etc.)

**Solución:**
1. Verificar configuración en WAHA (ver sección 3 arriba)
2. Verificar que `NEXT_PUBLIC_APP_URL` esté configurada correctamente
3. Probar webhook manualmente (ver sección 5)
4. Revisar logs de WAHA para ver si hay errores al enviar webhook

---

### Problema 2: "Webhook configurado pero no procesa mensajes"

**Posibles causas:**
1. ❌ El endpoint retorna error 500
2. ❌ El código del webhook tiene un bug
3. ❌ El mensaje no pasa los filtros (fromMe, grupos, etc.)

**Solución:**
1. Revisar logs de Vercel para ver errores
2. Verificar que el código del webhook esté desplegado correctamente
3. Revisar filtros en `handleMessageEvent()` (líneas 160-218)

---

### Problema 3: "Mensajes duplicados"

**Causa:**
- WAHA puede enviar tanto `message` como `message.any`
- El código ya ignora `message.any` (líneas 73-83)

**Solución:**
- ✅ Ya está resuelto en el código actual
- Si aún hay duplicados, verificar que WAHA solo tenga configurado `message`, no `message.any`

---

## 📊 Flujo Completo del Webhook

```
1. Cliente envía mensaje en WhatsApp
   ↓
2. WAHA recibe el mensaje
   ↓
3. WAHA envía webhook POST a:
   https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp
   ↓
4. Endpoint recibe evento:
   - Extrae organizationId del nombre de sesión
   - Filtra mensajes propios y grupos
   - Guarda mensaje en BD
   ↓
5. Si bot está activo:
   - Llama a AI Agent
   - Genera respuesta
   - Envía respuesta vía WAHA
   - Guarda mensaje saliente en BD
```

---

## ✅ Resumen de Verificación

- [ ] ✅ Endpoint `/api/webhooks/whatsapp` existe
- [ ] ✅ Variable `NEXT_PUBLIC_APP_URL` configurada en Vercel
- [ ] ✅ Webhook configurado en WAHA con URL correcta
- [ ] ✅ Eventos configurados: `['message', 'session.status']`
- [ ] ✅ `downloadMedia: true` configurado
- [ ] ✅ Logs aparecen cuando llega un mensaje
- [ ] ✅ Mensajes se procesan correctamente
- [ ] ✅ Respuestas se envían correctamente

---

## 🔗 Referencias

- **Endpoint del webhook:** `src/app/api/webhooks/whatsapp/route.ts`
- **Configuración del webhook:** `src/lib/waha-sessions.ts` (líneas 222-239)
- **Actualización del webhook:** `src/lib/waha-sessions.ts` (líneas 335-370)
- **Documentación WAHA:** https://waha.devlike.pro/docs/

