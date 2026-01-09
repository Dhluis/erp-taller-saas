# 🔍 Diagnóstico: WhatsApp No Responde

## 📋 Lo que necesitas verificar AHORA

### ⚠️ PASO CRÍTICO 1: Verificar si los mensajes llegan al webhook

**1. Ve a Vercel Dashboard:**
- Abre tu proyecto
- Click en "Logs" (o "Functions Logs")

**2. Envía un mensaje de WhatsApp desde tu teléfono**

**3. Busca inmediatamente en los logs:**

**Si VES estos logs:**
```
[WAHA Webhook] 📨 Procesando mensaje...
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
```
✅ **Los mensajes SÍ están llegando** → El problema está en el procesamiento

**Si NO VES ningún log relacionado con webhook:**
❌ **Los mensajes NO están llegando** → El webhook NO está configurado en WAHA

---

### 🔧 Si NO ves logs (webhook no configurado)

Ejecuta esto en la consola del navegador:

```javascript
// Actualizar webhook
fetch('/api/whatsapp/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ action: 'update_webhook' })
})
.then(r => r.json())
.then(data => {
  console.log('Resultado:', data);
  if (data.success) {
    alert('✅ Webhook actualizado. Ahora envía un mensaje y revisa los logs de Vercel.');
  } else {
    alert('❌ Error: ' + (data.error || 'Error desconocido'));
  }
});
```

---

### 🔧 Si SÍ ves logs pero dice "Bot inactivo"

Ejecuta esto en Supabase SQL Editor:

```sql
-- Activar bot en todas las conversaciones
UPDATE whatsapp_conversations
SET is_bot_active = true
WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261';

-- Verificar
SELECT 
  customer_phone,
  is_bot_active,
  status
FROM whatsapp_conversations
WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'
ORDER BY last_message_at DESC;
```

---

### 🔧 Si ves logs pero hay errores

Busca en los logs de Vercel:
- `[WAHA Webhook] ❌ No se encontró configuración AI`
- `[WAHA Webhook] ❌ Error enviando respuesta`
- `[WAHA Webhook] ❌ Error en handleMessageEvent`

Cada error indica un problema diferente.

---

## 🎯 Checklist Rápido

1. [ ] ¿Ves logs `[WAHA Webhook]` en Vercel cuando envías mensaje?
   - [ ] SÍ → El webhook funciona, problema en procesamiento
   - [ ] NO → El webhook NO está configurado

2. [ ] Si ves logs, ¿qué dice?
   - [ ] `Bot inactivo` → Activar con SQL arriba
   - [ ] `No se encontró configuración AI` → Verificar BD
   - [ ] `Error enviando respuesta` → Verificar sesión conectada
   - [ ] `Procesando con AI Agent` → Debería funcionar, revisa errores de OpenAI

3. [ ] Verificar configuración básica:
   ```javascript
   fetch('/api/whatsapp/config', {credentials: 'include'})
     .then(r => r.json())
     .then(d => console.log('Config:', {
       enabled: d.data?.enabled,
       whatsapp_connected: d.data?.whatsapp_connected
     }));
   ```

---

## 💡 Pregunta Clave

**¿Qué logs ves en Vercel cuando envías un mensaje de WhatsApp?**

Esta es la información MÁS IMPORTANTE para diagnosticar el problema.

