# 🔍 Diagnóstico: WAHA no envía eventos al webhook

## ❌ Problema actual
- ✅ Configuración correcta en código
- ✅ Custom Headers configurados
- ✅ Estado WORKING
- ❌ **WAHA NO está enviando eventos al webhook**

## 🎯 Causa probable
Las **variables de entorno globales** en EasyPanel están sobrescribiendo la configuración por sesión:
```
WHATSAPP_HOOK_URL=https://erp-taller-saas.vercel.app/api/webhooks/whatsapp
WHATSAPP_HOOK_EVENTS=message,session.status
WHATSAPP_HOOK_HEADERS=[{"name":"X-Organization-ID","value":"bbca1229-2c4f-4838-b5f9-9e8a8ca79261"}]
```

## ✅ Solución: Verificar y actualizar configuración del webhook

### 1. Ejecutar script de verificación (en consola del navegador)

```javascript
(async function() {
  console.log('🔍 Verificando configuración de webhook en WAHA...');
  
  // 1. Obtener configuración
  const configRes = await fetch('/api/whatsapp/config', {credentials: 'include'});
  const config = await configRes.json();
  
  const wahaUrl = config.data?.policies?.waha_api_url;
  const wahaKey = config.data?.policies?.waha_api_key;
  const sessionName = config.data?.whatsapp_session_name;
  const orgId = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261';
  
  console.log('📋 Configuración:', {wahaUrl, sessionName, orgId});
  
  // 2. Obtener configuración actual de la sesión
  const sessionRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
    headers: { 'X-Api-Key': wahaKey }
  });
  
  const sessionData = await sessionRes.json();
  const webhook = sessionData.config?.webhooks?.[0];
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CONFIGURACIÓN ACTUAL DEL WEBHOOK:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('URL:', webhook?.url);
  console.log('Events:', webhook?.events);
  console.log('Custom Headers:', webhook?.customHeaders);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 3. Actualizar webhook con configuración correcta
  console.log('\n🔄 Actualizando webhook...');
  const updateRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
    method: 'PUT',
    headers: {
      'X-Api-Key': wahaKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      config: {
        webhooks: [{
          url: 'https://erp-taller-saas.vercel.app/api/webhooks/whatsapp',
          events: ['message', 'session.status'],
          downloadMedia: true,
          downloadMediaOnMessage: true,
          customHeaders: [{
            name: 'X-Organization-ID',
            value: orgId
          }]
        }]
      }
    })
  });
  
  const updateData = await updateRes.json();
  console.log('✅ Webhook actualizado:', updateRes.ok);
  console.log('📥 Response:', updateData);
  
  // 4. Verificar después de actualizar
  const verifyRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
    headers: { 'X-Api-Key': wahaKey }
  });
  const verifyData = await verifyRes.json();
  const newWebhook = verifyData.config?.webhooks?.[0];
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ CONFIGURACIÓN DESPUÉS DE ACTUALIZAR:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('URL:', newWebhook?.url);
  console.log('Events:', newWebhook?.events);
  console.log('Custom Headers:', newWebhook?.customHeaders);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (newWebhook?.customHeaders?.length > 0) {
    console.log('\n✅✅✅ Webhook configurado correctamente');
    console.log('\n💡 PRÓXIMOS PASOS:');
    console.log('1. Reinicia la sesión de WhatsApp en WAHA');
    console.log('2. Envía un mensaje de prueba');
    console.log('3. Revisa los logs de Vercel');
  } else {
    console.log('\n⚠️ Los Custom Headers no están configurados');
    console.log('⚠️ Esto puede ser porque las variables de entorno globales están sobrescribiendo');
  }
})();
```

### 2. Si el webhook está configurado pero aún no funciona

**Problema:** WAHA podría estar usando las variables de entorno globales en lugar de la configuración por sesión.

**Solución:** Remover o comentar las variables de entorno globales en EasyPanel:
- `WHATSAPP_HOOK_URL`
- `WHATSAPP_HOOK_EVENTS`
- `WHATSAPP_HOOK_HEADERS`

O usar un enfoque diferente: dejar las variables globales y remover la configuración por sesión (pero esto no permite multi-tenancy).

### 3. Reiniciar la sesión después de actualizar

Después de actualizar el webhook, reinicia la sesión para que los cambios surtan efecto:

```javascript
fetch('/api/whatsapp/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ action: 'reconnect' })
})
.then(r => r.json())
.then(data => {
  console.log('Reconnect:', data);
  alert('Sesión reiniciada. Espera 30 segundos y envía un mensaje.');
});
```

### 4. Probar el endpoint directamente

```javascript
fetch('https://erp-taller-saas.vercel.app/api/webhooks/whatsapp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Organization-ID': 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'
  },
  body: JSON.stringify({
    event: 'message',
    session: 'eagles_bbca12292c4f4838b5f9',
    payload: {
      id: 'test-' + Date.now(),
      from: '5211234567890@c.us',
      body: 'Test message',
      fromMe: false
    }
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Endpoint funciona:', data);
  alert('Endpoint funciona. Revisa logs de Vercel.');
});
```

## 🔍 Verificar logs de WAHA

Si tienes acceso a los logs de WAHA en EasyPanel:
1. Envía un mensaje de WhatsApp
2. Revisa los logs buscando:
   - `POST https://erp-taller-saas.vercel.app/api/webhooks/whatsapp`
   - Errores de conexión
   - Timeouts

## 📊 Checklist final

- [ ] Webhook configurado con Custom Headers en WAHA
- [ ] Variables de entorno globales removidas o no interfieren
- [ ] Sesión reiniciada después de actualizar webhook
- [ ] Endpoint accesible públicamente
- [ ] Enviado mensaje de prueba
- [ ] Revisados logs de Vercel para ver `[WAHA Webhook]`

