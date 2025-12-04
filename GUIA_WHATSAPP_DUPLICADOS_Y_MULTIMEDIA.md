# 🔍 GUÍA: Duplicados y Multimedia en WhatsApp

## 📋 PROBLEMAS IDENTIFICADOS

1. **Bot responde 2 veces** - A pesar de la deduplicación
2. **No detecta audios ni imágenes** - Los mensajes multimedia no se procesan

---

## 🔍 PASO 1: VERIFICAR LOGS DEL WEBHOOK

### 1.1 Ver los logs en tiempo real

**Opción A: Logs del servidor (desarrollo local)**
```bash
# En la terminal donde corre `npm run dev`
# Busca estos logs cuando llegue un mensaje:
```

**Opción B: Logs de Vercel (producción)**
1. Ve a Vercel Dashboard
2. Tu proyecto → Deployments → (último deploy)
3. Click en "View Function Logs"
4. Filtra por: `[Webhook]` o `[WAHA Webhook]`

### 1.2 Qué buscar en los logs

Cuando llegue un mensaje, deberías ver:

```
============================================================
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
[Webhook] 📋 Event Type: message
[Webhook] 🆔 Message ID: ABC123
[Webhook] 📦 Session: eagles_xxx
[Webhook] ⏰ Timestamp: 2025-12-04T...
[Webhook] 📊 Cache size: 5
[Webhook] 📝 Cache keys: [...]
============================================================
```

**Si ves el mismo `Message ID` 2 veces** → WAHA está enviando duplicados

**Si ves `⏭️ DUPLICADO DETECTADO Y BLOQUEADO`** → La deduplicación está funcionando

---

## 🛠️ PASO 2: CONFIGURACIÓN EN WAHA

### 2.1 Verificar configuración del webhook en WAHA

**Accede a tu instancia de WAHA:**
- URL: `http://tu-waha-url:3000` (o la URL que uses)
- Ve a: `/api/sessions/{tu-sesion}`

**Verifica que el webhook esté configurado con:**
```json
{
  "config": {
    "webhooks": [{
      "url": "https://tu-app.vercel.app/api/webhooks/whatsapp",
      "events": ["message", "session.status"]  // ✅ Solo estos 2 eventos
    }]
  }
}
```

### 2.2 Si el webhook tiene `message.any`:

**Opción A: Actualizar manualmente en WAHA**
```bash
# Hacer PUT request a WAHA
curl -X PUT "http://tu-waha-url:3000/api/sessions/{sesion}" \
  -H "X-Api-Key: tu-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "webhooks": [{
        "url": "https://tu-app.vercel.app/api/webhooks/whatsapp",
        "events": ["message", "session.status"]
      }]
    }
  }'
```

**Opción B: Recrear la sesión**
- Ve a tu app → Dashboard WhatsApp
- Click en "Desconectar"
- Click en "Vincular WhatsApp" de nuevo
- Esto recreará la sesión con la configuración correcta

---

## 📎 PASO 3: CONFIGURAR MULTIMEDIA EN WAHA

### 3.1 Verificar que WAHA esté configurado para multimedia

WAHA **debería** enviar multimedia automáticamente, pero verifica:

**En la configuración de WAHA (docker-compose.yml o variables de entorno):**
```yaml
# Asegúrate de que estos estén habilitados:
WAHA_PLUS_ENABLED=true
WAHA_PLUS_DOWNLOAD_MEDIA=true
WAHA_PLUS_STORE_MEDIA=true
```

### 3.2 Verificar el payload del webhook

**Agrega este log temporal en el webhook** (ya está agregado, solo verifica):

Cuando llegue un mensaje con imagen/audio, deberías ver:
```
[WAHA Webhook] 📎 Media detectado: {
  mediaType: 'image',
  mediaUrl: 'https://...',
  mimetype: 'image/jpeg',
  originalType: 'image'
}
```

**Si NO ves este log** → WAHA no está enviando el media en el webhook

### 3.3 Solución: Actualizar webhook para incluir media

**Si WAHA no envía media automáticamente, necesitas:**

1. **Verificar versión de WAHA:**
   ```bash
   # WAHA Plus debe ser versión 1.15.0 o superior
   # Verifica en: http://tu-waha-url:3000/api/info
   ```

2. **Actualizar configuración del webhook:**
   ```json
   {
     "config": {
       "webhooks": [{
         "url": "https://tu-app.vercel.app/api/webhooks/whatsapp",
         "events": ["message", "session.status"],
         "downloadMedia": true,  // ✅ Agregar esto
         "downloadMediaOnMessage": true  // ✅ Y esto
       }]
     }
   }
   ```

---

## 🧪 PASO 4: PRUEBAS

### 4.1 Probar duplicación

1. **Envía un mensaje de texto** desde WhatsApp
2. **Revisa los logs** del webhook
3. **Cuenta cuántas veces aparece:**
   - `[Webhook] 🔔 NUEVO EVENTO RECIBIDO` → Debe ser 1 vez
   - `[Webhook] 📤 ENVIANDO respuesta` → Debe ser 1 vez

**Si ves 2 veces:**
- Verifica que el webhook NO tenga `message.any`
- Verifica que la deduplicación esté funcionando (debe aparecer `⏭️ DUPLICADO DETECTADO`)

### 4.2 Probar multimedia

1. **Envía una imagen** desde WhatsApp
2. **Revisa los logs:**
   ```
   [WAHA Webhook] 📎 Media detectado: {
     mediaType: 'image',
     ...
   }
   ```
3. **Verifica en la BD:**
   ```sql
   SELECT * FROM whatsapp_messages 
   WHERE media_type IS NOT NULL 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

**Si NO aparece el log de media:**
- WAHA no está enviando el media en el webhook
- Necesitas configurar `downloadMedia: true` en el webhook

---

## 🔧 SOLUCIÓN RÁPIDA: ACTUALIZAR WEBHOOK EN WAHA

### Opción 1: Usar el endpoint API (RECOMENDADO) ✅

**Desde la consola del navegador (F12):**
```javascript
// Ejecuta esto en la consola del navegador cuando estés en tu app
fetch('/api/whatsapp/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'update_webhook' })
})
.then(r => r.json())
.then(data => console.log('✅ Webhook actualizado:', data))
.catch(err => console.error('❌ Error:', err));
```

**O desde terminal (curl):**
```bash
curl -X POST "https://tu-app.vercel.app/api/whatsapp/session" \
  -H "Content-Type: application/json" \
  -d '{"action": "update_webhook"}' \
  --cookie "tu-sesion-cookie"
```

### Opción 2: Actualizar directamente en WAHA

```bash
# Reemplaza estos valores:
WAHA_URL="http://tu-waha-url:3000"
WAHA_API_KEY="tu-api-key"
SESSION_NAME="eagles_xxx"  # Tu nombre de sesión
WEBHOOK_URL="https://tu-app.vercel.app/api/webhooks/whatsapp"

# Actualizar webhook
curl -X PUT "${WAHA_URL}/api/sessions/${SESSION_NAME}" \
  -H "X-Api-Key: ${WAHA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"config\": {
      \"webhooks\": [{
        \"url\": \"${WEBHOOK_URL}\",
        \"events\": [\"message\", \"session.status\"],
        \"downloadMedia\": true,
        \"downloadMediaOnMessage\": true
      }]
    }
  }"
```

### Opción 3: Recrear la sesión (si las anteriores no funcionan)

1. Ve a Dashboard WhatsApp
2. Click en "Desconectar"
3. Click en "Vincular WhatsApp" de nuevo
4. Esto recreará la sesión con la configuración correcta (incluye multimedia)

---

## 📊 VERIFICACIÓN FINAL

### Checklist:

- [ ] Webhook configurado con solo `["message", "session.status"]`
- [ ] Webhook tiene `downloadMedia: true`
- [ ] Logs muestran deduplicación funcionando
- [ ] Logs muestran detección de media cuando envías imagen/audio
- [ ] BD tiene registros con `media_type` cuando envías multimedia

---

## 🆘 SI SIGUE SIN FUNCIONAR

### Para duplicados:
1. **Comparte los logs completos** del webhook cuando llegue un mensaje
2. **Verifica** si el `Message ID` es el mismo en ambos eventos
3. **Revisa** si WAHA está enviando desde múltiples instancias

### Para multimedia:
1. **Verifica versión de WAHA:** `http://tu-waha-url:3000/api/info`
2. **Comparte el payload completo** del webhook cuando envías una imagen
3. **Verifica** si WAHA tiene acceso a descargar media (permisos de red/storage)

---

## 📝 NOTAS IMPORTANTES

- **WAHA Plus** es necesario para multimedia (no funciona con WAHA básico)
- **downloadMedia** debe estar habilitado en el webhook
- **La deduplicación** funciona por `Message ID`, si WAHA envía IDs diferentes, no funcionará
- **Los logs detallados** están activos, úsalos para diagnosticar

