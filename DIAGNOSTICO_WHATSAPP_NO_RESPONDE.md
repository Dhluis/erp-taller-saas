# 🔍 Diagnóstico: WhatsApp No Responde

## ✅ Estado Actual
- **Rama:** `fix/restore-working-whatsapp` (código restaurado del 10 dic)
- **Deployment:** Ya realizado
- **Problema:** WhatsApp no responde a mensajes

---

## 🔍 Checklist de Verificación

### 1. Verificar que el Webhook esté configurado en WAHA

**Opción A: Usar el endpoint de verificación**
```bash
# En el navegador, abre la consola y ejecuta:
fetch('/api/whatsapp/verify-webhook', {
  method: 'GET',
  credentials: 'include'
}).then(r => r.json()).then(console.log)
```

**Opción B: Verificar directamente en WAHA**
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
#         "events": ["message", "session.status"]
#       }
#     ]
#   }
# }
```

---

### 2. Verificar que el Bot esté Activo

**En la base de datos (Supabase):**
```sql
SELECT 
  id,
  organization_id,
  enabled,
  whatsapp_connected,
  whatsapp_session_name
FROM ai_agent_config
WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261';
```

**Debe tener:**
- `enabled = true` ✅
- `whatsapp_connected = true` ✅ (si WhatsApp está vinculado)

---

### 3. Verificar Logs de Vercel

**En Vercel Dashboard:**
1. Ve a tu proyecto
2. Click en "Logs"
3. Busca logs que contengan:
   - `[WAHA Webhook]`
   - `[Webhook]`
   - Errores relacionados con WhatsApp

**Qué buscar:**
- ✅ Si ves `[WAHA Webhook] 📨 Procesando mensaje...` = Los mensajes están llegando
- ❌ Si NO ves logs de webhook = El webhook NO está configurado o no llegan mensajes
- ❌ Si ves errores = Hay un problema en el procesamiento

---

### 4. Verificar que la Conversación tenga Bot Activo

**Verificar en la base de datos:**
```sql
SELECT 
  id,
  customer_phone,
  is_bot_active,
  status
FROM whatsapp_conversations
WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'
ORDER BY last_message_at DESC
LIMIT 5;
```

**Debe tener:**
- `is_bot_active = true` ✅ (para que responda automáticamente)
- `status = 'active'` ✅

---

### 5. Probar Manualmente el Webhook

**Simular un mensaje entrante:**
```bash
curl -X POST https://tu-app.vercel.app/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message",
    "session": "eagles_bbca12292c4f4838b5f9",
    "payload": {
      "id": "test123",
      "from": "5214491234567@c.us",
      "body": "Hola test",
      "fromMe": false,
      "timestamp": 1234567890
    }
  }'
```

**Qué esperar:**
- Respuesta: `{"success": true, "received": true}`
- Logs en Vercel mostrando procesamiento

---

## 🔧 Soluciones Rápidas

### Si el Webhook NO está configurado:

1. **Usar el botón de actualización:**
   - Ve a `/dashboard/whatsapp/train-agent`
   - Click en "🔧 Actualizar Webhook Ahora"

2. **O usar el endpoint directamente:**
   ```bash
   fetch('/api/whatsapp/force-webhook', {
     method: 'POST',
     credentials: 'include'
   }).then(r => r.json()).then(console.log)
   ```

### Si el Bot NO está activo:

1. **Activar en la configuración:**
   ```sql
   UPDATE ai_agent_config
   SET enabled = true
   WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261';
   ```

2. **Activar bot en conversación:**
   ```sql
   UPDATE whatsapp_conversations
   SET is_bot_active = true
   WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'
     AND customer_phone = '5214491234567';
   ```

---

## 🚨 Problemas Comunes

### 1. Webhook URL incorrecta
- **Síntoma:** Los mensajes no llegan al webhook
- **Solución:** Verificar que `NEXT_PUBLIC_APP_URL` esté configurada correctamente en Vercel

### 2. Bot desactivado en conversación
- **Síntoma:** Los mensajes llegan pero no hay respuesta
- **Solución:** Activar `is_bot_active = true` en la conversación

### 3. Configuración AI no encontrada
- **Síntoma:** Logs muestran "No se encontró configuración AI"
- **Solución:** Verificar que existe registro en `ai_agent_config` con `organization_id`

### 4. Sesión no conectada
- **Síntoma:** `whatsapp_connected = false`
- **Solución:** Reconectar WhatsApp desde la interfaz

---

## 📋 Pasos de Diagnóstico Recomendados

1. ✅ Verificar webhook (usar endpoint de verificación)
2. ✅ Verificar logs de Vercel (buscar `[WAHA Webhook]`)
3. ✅ Verificar bot activo (en BD)
4. ✅ Probar webhook manualmente
5. ✅ Verificar configuración AI (en BD)

---

## 💡 Información Útil

**Organization ID:** `bbca1229-2c4f-4838-b5f9-9e8a8ca79261`
**Session Name:** `eagles_bbca12292c4f4838b5f9`
**Webhook URL esperada:** `https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp`

