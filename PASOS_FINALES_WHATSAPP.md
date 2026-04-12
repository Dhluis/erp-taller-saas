# ✅ Pasos Finales - Activar WhatsApp

## 1️⃣ Reiniciar Contenedor WAHA

En EasyPanel:
1. Haz clic en el botón de **"Stop"** (cuadrado) para detener el contenedor
2. Espera 5 segundos
3. Haz clic en **"Implementar"** (botón verde) para reiniciarlo
4. Espera a que el contenedor esté completamente iniciado (verás el estado "Running")

## 2️⃣ Reiniciar Sesión de WhatsApp

**Opción A: Desde la UI**
1. Ve a `/dashboard/whatsapp/train-agent`
2. Haz clic en **"Desconectar"** (si está conectado)
3. Luego haz clic en **"Vincular WhatsApp"**
4. Escanea el QR si aparece

**Opción B: Desde la consola del navegador**
```javascript
fetch('/api/whatsapp/session', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  credentials: 'include',
  body: JSON.stringify({action: 'reconnect'})
})
.then(r => r.json())
.then(data => {
  console.log('✅ Sesión reiniciada:', data);
  alert('Sesión reiniciada. Espera 30 segundos para que se configure el webhook.');
});
```

## 3️⃣ Verificar que el Webhook se Configuró Correctamente

Ejecuta este script en la consola del navegador:

```javascript
(async function() {
  console.log('🔍 Verificando configuración del webhook...');
  
  // 1. Obtener configuración
  const configRes = await fetch('/api/whatsapp/config', {credentials: 'include'});
  const config = await configRes.json();
  
  const wahaUrl = config.data?.policies?.waha_api_url;
  const wahaKey = config.data?.policies?.waha_api_key;
  const sessionName = config.data?.whatsapp_session_name;
  const orgId = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261';
  
  if (!wahaUrl || !wahaKey || !sessionName) {
    console.error('❌ Configuración incompleta');
    return;
  }
  
  console.log('📋 Configuración:', {wahaUrl, sessionName, orgId});
  
  // 2. Verificar configuración actual del webhook
  const sessionRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
    headers: {'X-Api-Key': wahaKey}
  });
  
  if (!sessionRes.ok) {
    console.error('❌ Error obteniendo sesión:', sessionRes.status);
    return;
  }
  
  const sessionData = await sessionRes.json();
  const webhook = sessionData.config?.webhooks?.[0];
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 CONFIGURACIÓN ACTUAL DEL WEBHOOK:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Estado de sesión:', sessionData.status);
  console.log('URL del webhook:', webhook?.url);
  console.log('Events:', webhook?.events);
  console.log('Custom Headers:', webhook?.customHeaders);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // 3. Si no hay webhook o no tiene Custom Headers, actualizarlo
  if (!webhook || !webhook.customHeaders || webhook.customHeaders.length === 0) {
    console.log('\n🔄 Webhook no configurado correctamente. Actualizando...');
    
    const updateRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      method: 'PUT',
      headers: {
        'X-Api-Key': wahaKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: {
          webhooks: [{
            url: 'https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp',
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
    
    if (updateRes.ok) {
      console.log('✅ Webhook actualizado exitosamente');
      
      // Verificar después de actualizar
      const verifyRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
        headers: {'X-Api-Key': wahaKey}
      });
      const verifyData = await verifyRes.json();
      const newWebhook = verifyData.config?.webhooks?.[0];
      
      console.log('\n✅✅✅ WEBHOOK CONFIGURADO:');
      console.log('URL:', newWebhook?.url);
      console.log('Custom Headers:', newWebhook?.customHeaders);
    } else {
      console.error('❌ Error actualizando webhook:', updateRes.status);
    }
  } else {
    console.log('\n✅✅✅ Webhook ya está configurado correctamente');
  }
})();
```

## 4️⃣ Probar el Endpoint Directamente

Para verificar que el endpoint funciona:

```javascript
fetch('https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp', {
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
      body: 'Mensaje de prueba',
      fromMe: false
    }
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Endpoint funciona:', data);
  alert('✅ Endpoint funciona correctamente\n\nRevisa los logs de Vercel - deberías ver [WAHA Webhook]');
})
.catch(err => {
  console.error('❌ Error:', err);
});
```

## 5️⃣ Enviar Mensaje Real desde WhatsApp

1. Abre WhatsApp en tu celular
2. Envía un mensaje al número conectado: **+52 1 449 219 5701**
3. Espera 5-10 segundos
4. Revisa los logs de Vercel (Functions → Logs)
5. Deberías ver logs que empiezan con: `[WAHA Webhook] 📨 Procesando mensaje...`

## ✅ Checklist Final

- [ ] Contenedor WAHA reiniciado
- [ ] Sesión de WhatsApp reiniciada
- [ ] Webhook configurado con Custom Headers (verificado con script)
- [ ] Endpoint probado directamente (debería retornar `{success: true}`)
- [ ] Mensaje enviado desde WhatsApp
- [ ] Logs en Vercel mostrando `[WAHA Webhook]`

## 🔍 Si aún no funciona

**Revisa logs de WAHA en EasyPanel:**
1. Ve a la sección de Logs del contenedor
2. Busca intentos de llamadas HTTP a `erp-taller-saas-correct.vercel.app`
3. Si no hay intentos, WAHA no está enviando eventos

**Verifica acceso a internet desde WAHA:**
```bash
# Desde el terminal de EasyPanel o SSH al contenedor
curl -I https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp
```

Si el curl falla, hay un problema de conectividad desde WAHA a Vercel.

