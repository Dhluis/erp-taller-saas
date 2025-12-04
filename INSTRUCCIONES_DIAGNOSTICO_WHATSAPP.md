# 🚨 INSTRUCCIONES INMEDIATAS - Duplicados y Multimedia

## ✅ PASO 1: ACTUALIZAR WEBHOOK (HACER AHORA)

**Ejecuta esto en la consola del navegador (F12) cuando estés en tu app:**

```javascript
// 1. Verificar configuración actual
fetch('/api/whatsapp/webhook-config')
.then(r => r.json())
.then(data => {
  console.log('📋 Configuración:', data);
  if (data.needsUpdate) {
    console.log('⚠️ Necesita actualización!');
    
    // 2. Actualizar webhook
    return fetch('/api/whatsapp/webhook-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } else {
    console.log('✅ Webhook ya está configurado correctamente');
  }
})
.then(r => r ? r.json() : null)
.then(data => {
  if (data) {
    console.log('✅ Resultado:', data);
    alert('✅ Webhook actualizado! Ahora prueba enviando un mensaje.');
  }
})
.catch(err => console.error('❌ Error:', err));
```

---

## 🔍 PASO 2: ENVIAR MENSAJE DE PRUEBA Y REVISAR LOGS

### 2.1 Enviar mensaje de texto

1. **Envía un mensaje de texto** desde WhatsApp al bot
2. **Revisa los logs del servidor** (terminal donde corre `npm run dev` o Vercel Function Logs)

### 2.2 Buscar en los logs:

**Para duplicados, busca:**
```
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
```

**Si aparece 2 veces con el mismo Message ID:**
- ✅ La deduplicación debería bloquearlo
- Busca: `⏭️ DUPLICADO DETECTADO Y BLOQUEADO`
- Si NO aparece → El Message ID es diferente en cada evento

**Para ver si se envía respuesta 2 veces:**
```
[Webhook] 📤 ENVIANDO respuesta
```

**Si aparece 2 veces:**
- El problema está en que WAHA envía el evento 2 veces con diferentes IDs
- O la deduplicación no está funcionando

---

## 📎 PASO 3: ENVIAR IMAGEN Y REVISAR LOGS

1. **Envía una imagen** desde WhatsApp al bot
2. **Revisa los logs** y busca:

```
[WAHA Webhook] 🔍 DIAGNÓSTICO MULTIMEDIA: {
  messageType: 'image',
  hasMediaUrl: true,
  ...
}
[WAHA Webhook] 📎 Media detectado: {
  mediaType: 'image',
  mediaUrl: 'https://...',
  ...
}
```

**Si NO ves estos logs:**
- WAHA no está enviando el media en el webhook
- Necesitas verificar la configuración de WAHA

**Si ves los logs pero `hasMediaUrl: false`:**
- WAHA no está descargando el media
- El webhook necesita `downloadMedia: true`

---

## 🛠️ PASO 4: VERIFICAR CONFIGURACIÓN DE WAHA

### Opción A: Verificar desde la API

```javascript
// Ver configuración actual del webhook
fetch('/api/whatsapp/webhook-config')
.then(r => r.json())
.then(data => {
  console.log('📋 Webhook config:', data.webhookConfig);
  console.log('⚠️ Necesita actualización:', data.needsUpdate);
});
```

### Opción B: Verificar directamente en WAHA

1. Accede a tu instancia de WAHA
2. Ve a: `GET /api/sessions/{tu-sesion}`
3. Revisa `config.webhooks[0]`:
   - ✅ `events: ["message", "session.status"]` (NO debe tener `message.any`)
   - ✅ `downloadMedia: true`
   - ✅ `downloadMediaOnMessage: true`

---

## 📊 QUÉ COMPARTIR PARA DIAGNÓSTICO

Si el problema persiste, comparte:

1. **Logs completos del webhook** cuando llega un mensaje (las primeras 50 líneas)
2. **Logs cuando envías una imagen** (especialmente la parte de `DIAGNÓSTICO MULTIMEDIA`)
3. **Resultado de** `/api/whatsapp/webhook-config` (GET)
4. **Versión de WAHA** (si puedes obtenerla)

---

## 🎯 RESUMEN RÁPIDO

1. ✅ **Ejecuta el script de actualización del webhook** (Paso 1)
2. ✅ **Envía un mensaje de texto** y revisa logs
3. ✅ **Envía una imagen** y revisa logs
4. ✅ **Comparte los logs** si el problema persiste

