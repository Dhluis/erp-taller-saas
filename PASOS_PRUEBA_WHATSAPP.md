# ✅ PASOS DE PRUEBA - WhatsApp Bot

## 🎯 PRUEBA 1: Mensaje de Texto (Verificar Duplicados)

### 1.1 Enviar mensaje
- Abre WhatsApp en tu teléfono
- Envía un mensaje de texto al bot (ej: "Hola")

### 1.2 Revisar logs del servidor

**Si estás en desarrollo local:**
- Mira la terminal donde corre `npm run dev`
- Busca estos logs cuando llegue el mensaje:

```
============================================================
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
[Webhook] 📋 Event Type: message
[Webhook] 🆔 Message ID: ABC123
...
[Webhook] 📤 ENVIANDO respuesta
...
[Webhook] ✅✅✅ MENSAJE COMPLETAMENTE PROCESADO
```

**Si estás en producción (Vercel):**
1. Ve a Vercel Dashboard
2. Tu proyecto → Deployments → (último deploy)
3. Click en "View Function Logs"
4. Filtra por: `[Webhook]` o `[WAHA Webhook]`

### 1.3 Verificar duplicados

**✅ CORRECTO (sin duplicados):**
- `[Webhook] 🔔 NUEVO EVENTO RECIBIDO` aparece **1 vez**
- `[Webhook] 📤 ENVIANDO respuesta` aparece **1 vez**
- El bot responde **1 vez** en WhatsApp

**❌ PROBLEMA (con duplicados):**
- `[Webhook] 🔔 NUEVO EVENTO RECIBIDO` aparece **2 veces**
- Si aparece `⏭️ DUPLICADO DETECTADO Y BLOQUEADO` → La deduplicación funciona
- Si NO aparece → El Message ID es diferente en cada evento

---

## 📎 PRUEBA 2: Imagen (Verificar Multimedia)

### 2.1 Enviar imagen
- Envía una imagen desde WhatsApp al bot

### 2.2 Revisar logs

Busca estos logs específicos:

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

### 2.3 Verificar en la base de datos

Ejecuta en Supabase SQL Editor:

```sql
SELECT 
  id,
  body,
  media_type,
  media_url,
  created_at
FROM whatsapp_messages
WHERE media_type IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**✅ CORRECTO:**
- Debe aparecer un registro con `media_type = 'image'`
- `media_url` debe tener una URL

**❌ PROBLEMA:**
- No aparece el registro
- O `media_type` es NULL

---

## 🎯 PRUEBA 3: Audio (Opcional)

1. Envía un audio/nota de voz
2. Revisa los logs (debe aparecer `mediaType: 'audio'`)
3. Verifica en BD que se guardó con `media_type = 'audio'`

---

## 📊 QUÉ COMPARTIR SI HAY PROBLEMAS

Si después de las pruebas sigue habiendo problemas, comparte:

1. **Logs completos del webhook** cuando llega un mensaje de texto
2. **Logs completos** cuando envías una imagen (especialmente la parte de `DIAGNÓSTICO MULTIMEDIA`)
3. **Screenshot** de la respuesta del bot en WhatsApp (si responde 2 veces)
4. **Resultado de la query SQL** de multimedia

---

## ✅ CHECKLIST FINAL

- [ ] Webhook actualizado (ya hecho ✅)
- [ ] Mensaje de texto enviado y revisado logs
- [ ] Bot responde 1 vez (no duplicado)
- [ ] Imagen enviada y revisado logs
- [ ] Logs muestran `📎 Media detectado`
- [ ] BD tiene registro con `media_type = 'image'`

