# 🔍 Diagnóstico Completo: WhatsApp No Responde

## ✅ Lo que ya hiciste
- ✅ Restaurado código del commit que funcionaba
- ✅ Ejecutado script de actualización de webhook
- ❌ Enviado mensaje pero NO hay respuesta

---

## 🔍 Pasos de Diagnóstico

### 1. Verificar si los mensajes LLEGAN al webhook

**En Vercel Dashboard → Logs:**

Busca estos logs cuando envías un mensaje:
```
[WAHA Webhook] 📨 Procesando mensaje...
[Webhook] 🔔 NUEVO EVENTO RECIBIDO
```

**Si NO ves estos logs:**
- ❌ El webhook NO está configurado en WAHA
- ❌ Los mensajes NO están llegando a tu servidor

**Si SÍ ves estos logs:**
- ✅ El webhook funciona
- ❌ El problema está en el procesamiento

---

### 2. Verificar configuración del bot

**Ejecuta esto en la consola del navegador:**

```javascript
(async function() {
  console.log('🔍 Verificando configuración del bot...');
  
  try {
    // Verificar configuración
    const configRes = await fetch('/api/whatsapp/config', {
      credentials: 'include'
    });
    const configData = await configRes.json();
    
    console.log('📊 Configuración:', {
      enabled: configData.data?.enabled,
      whatsapp_connected: configData.data?.whatsapp_connected,
      has_policies: !!configData.data?.policies,
      provider: configData.data?.provider,
      model: configData.data?.model
    });
    
    if (!configData.data?.enabled) {
      alert('❌ El bot NO está activado. Actívalo en la configuración.');
      return;
    }
    
    if (!configData.data?.whatsapp_connected) {
      alert('⚠️ WhatsApp NO está conectado. Conéctalo primero.');
      return;
    }
    
    alert('✅ Configuración correcta:\n\n' +
          'Enabled: ' + configData.data.enabled + '\n' +
          'WhatsApp Connected: ' + configData.data.whatsapp_connected + '\n' +
          'Provider: ' + configData.data.provider);
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
})();
```

---

### 3. Verificar si el bot está activo en la conversación

**En Supabase SQL Editor, ejecuta:**

```sql
-- Ver conversaciones y estado del bot
SELECT 
  id,
  customer_phone,
  is_bot_active,
  status,
  last_message_at,
  messages_count
FROM whatsapp_conversations
WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'
ORDER BY last_message_at DESC
LIMIT 5;
```

**Si `is_bot_active = false`:**
```sql
-- Activar bot en todas las conversaciones
UPDATE whatsapp_conversations
SET is_bot_active = true
WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'
  AND is_bot_active = false;
```

---

### 4. Verificar logs de procesamiento (si los mensajes llegan)

**En Vercel Logs, busca estos logs cuando envías un mensaje:**

```
[WAHA Webhook] ✅ Mensaje es entrante, procesando...
[WAHA Webhook] 📍 Organization ID: ...
[WAHA Webhook] ✅ Conversación existente encontrada: ...
[WAHA Webhook] ⏸️ Bot inactivo para esta conversación  <-- Si ves esto, el bot está desactivado
[WAHA Webhook] 🤖 Procesando con AI Agent...            <-- Si ves esto, está procesando
[WAHA Webhook] ✅ AI generó respuesta, enviando...      <-- Si ves esto, debería enviar
```

---

### 5. Verificar si hay errores en el procesamiento

**En Vercel Logs, busca errores:**
```
[WAHA Webhook] ❌ Error en handleMessageEvent
[WAHA Webhook] ❌ No se encontró configuración AI
[WAHA Webhook] ❌ Error enviando respuesta
```

---

## 🚨 Problemas Comunes y Soluciones

### Problema 1: Bot desactivado en conversación

**Síntoma:** Ves logs `[WAHA Webhook] ⏸️ Bot inactivo para esta conversación`

**Solución:**
```sql
UPDATE whatsapp_conversations
SET is_bot_active = true
WHERE organization_id = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261';
```

---

### Problema 2: Configuración AI no encontrada

**Síntoma:** Logs muestran `❌ No se encontró configuración AI`

**Solución:**
- Verificar que existe registro en `ai_agent_config` con `organization_id`
- Verificar que `enabled = true`

---

### Problema 3: AI no genera respuesta

**Síntoma:** Ves `🤖 Procesando con AI Agent...` pero NO ves `✅ AI generó respuesta`

**Solución:**
- Verificar que OpenAI API key está configurada
- Verificar que el modelo está disponible
- Revisar logs de errores de OpenAI

---

### Problema 4: Error al enviar respuesta

**Síntoma:** Ves `✅ AI generó respuesta` pero también `❌ Error enviando respuesta`

**Solución:**
- Verificar que la sesión está conectada (`whatsapp_connected = true`)
- Verificar estado de la sesión en WAHA

---

## 🎯 Script de Diagnóstico Completo

Ejecuta esto en la consola del navegador:

```javascript
(async function() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DIAGNÓSTICO COMPLETO DE WHATSAPP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Verificar estado de sesión
    console.log('\n1️⃣ Verificando estado de sesión...');
    const sessionRes = await fetch('/api/whatsapp/session', {
      credentials: 'include'
    });
    const sessionData = await sessionRes.json();
    console.log('📊 Sesión:', {
      connected: sessionData.connected || sessionData.data?.connected,
      status: sessionData.status || sessionData.data?.status,
      phone: sessionData.phone || sessionData.data?.phone
    });
    
    // 2. Verificar configuración
    console.log('\n2️⃣ Verificando configuración...');
    const configRes = await fetch('/api/whatsapp/config', {
      credentials: 'include'
    });
    const configData = await configRes.json();
    console.log('📊 Config:', {
      enabled: configData.data?.enabled,
      whatsapp_connected: configData.data?.whatsapp_connected,
      provider: configData.data?.provider,
      model: configData.data?.model
    });
    
    // 3. Resumen
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const issues = [];
    
    if (!sessionData.connected && !sessionData.data?.connected) {
      issues.push('❌ WhatsApp NO está conectado');
    }
    
    if (!configData.data?.enabled) {
      issues.push('❌ Bot NO está activado');
    }
    
    if (!configData.data?.whatsapp_connected) {
      issues.push('⚠️ WhatsApp NO está marcado como conectado en BD');
    }
    
    if (issues.length === 0) {
      alert('✅ Todo parece estar correcto.\n\nSi aún no funciona, revisa los logs de Vercel cuando envíes un mensaje.');
    } else {
      alert('⚠️ Problemas encontrados:\n\n' + issues.join('\n'));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
})();
```

---

## 📋 Checklist Final

- [ ] ¿Ves logs `[WAHA Webhook] 📨 Procesando mensaje...` en Vercel cuando envías mensaje?
- [ ] ¿`enabled = true` en `ai_agent_config`?
- [ ] ¿`whatsapp_connected = true` en `ai_agent_config`?
- [ ] ¿`is_bot_active = true` en `whatsapp_conversations`?
- [ ] ¿Ves logs de procesamiento con AI?
- [ ] ¿Ves errores en los logs?

---

## 💡 Siguiente Paso

**Ejecuta el script de diagnóstico completo arriba y compárteme los resultados.**

Esto me ayudará a identificar exactamente dónde está el problema.

