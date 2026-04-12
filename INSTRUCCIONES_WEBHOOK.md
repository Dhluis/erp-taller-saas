# 🔧 Instrucciones: Configurar Webhook con Custom Headers

## ✅ Situación Actual

- ✅ WhatsApp está conectado (`WORKING`)
- ✅ Webhook URL está configurada en WAHA
- ❌ **Faltan Custom Headers** en la configuración del webhook

Las variables de entorno en EasyPanel (`WHATSAPP_HOOK_HEADERS`) solo afectan sesiones nuevas. Para la sesión existente, necesitamos actualizarla manualmente.

---

## 🚀 Solución: Ejecutar Script

### Paso 1: Abre la Consola del Navegador

1. Ve a la página de WhatsApp (o cualquier página de tu app)
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña `Console`

### Paso 2: Ejecuta este Script

Copia y pega este script completo en la consola:

```javascript
// 🔧 Actualizar Webhook con Custom Headers
(async function() {
  console.log('🔧 Actualizando webhook...');
  
  // Obtener configuración
  const configRes = await fetch('/api/whatsapp/config', {credentials: 'include'});
  const config = await configRes.json();
  
  const wahaUrl = config.data?.policies?.waha_api_url;
  const wahaKey = config.data?.policies?.waha_api_key;
  const sessionName = config.data?.whatsapp_session_name;
  const organizationId = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261';
  
  if (!wahaUrl || !wahaKey || !sessionName) {
    alert('❌ Faltan datos de configuración');
    return;
  }
  
  // Actualizar webhook
  const res = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': wahaKey
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
            value: organizationId
          }]
        }]
      }
    })
  });
  
  const data = await res.json();
  console.log('Resultado:', data);
  
  if (res.ok) {
    alert('✅ Webhook actualizado correctamente\n\nAhora envía un mensaje y revisa logs de Vercel');
  } else {
    alert('❌ Error: ' + JSON.stringify(data));
  }
})();
```

### Paso 3: Verificar

Después de ejecutar, deberías ver:
- ✅ Mensaje de éxito en la alerta
- ✅ En la consola: información de la actualización

### Paso 4: Probar

1. Espera 10 segundos
2. Envía un mensaje de WhatsApp desde tu teléfono
3. Ve a Vercel Dashboard → Logs
4. Busca: `[WAHA Webhook] 📨 Procesando mensaje...`

---

## 🔍 Si Aún No Funciona

### Verificar configuración actual:

```javascript
// Verificar webhook actual
fetch('/api/whatsapp/config', {credentials: 'include'})
  .then(r => r.json())
  .then(config => {
    const wahaUrl = config.data?.policies?.waha_api_url;
    const wahaKey = config.data?.policies?.waha_api_key;
    const sessionName = config.data?.whatsapp_session_name;
    
    return fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      headers: { 'X-Api-Key': wahaKey }
    });
  })
  .then(r => r.json())
  .then(data => {
    console.log('Webhooks configurados:', data.config?.webhooks);
    const wh = data.config?.webhooks?.[0];
    if (wh?.customHeaders) {
      console.log('✅ Custom Headers:', wh.customHeaders);
    } else {
      console.log('❌ NO hay Custom Headers');
    }
  });
```

---

## 📋 Nota sobre Variables de Entorno

Las variables de entorno en EasyPanel (`WHATSAPP_HOOK_HEADERS`) solo afectan:
- ✅ Sesiones nuevas que se crean después de configurarlas
- ❌ Sesiones existentes (como la tuya)

Por eso necesitamos actualizar manualmente la sesión existente.

---

## 🎯 Después de Funcionar

Una vez que funcione, puedes:
1. Actualizar `updateSessionWebhook` en el código para incluir customHeaders automáticamente
2. Configurar multi-tenant para que use el `organizationId` dinámico
3. Eliminar el hardcodeo del `organizationId`

