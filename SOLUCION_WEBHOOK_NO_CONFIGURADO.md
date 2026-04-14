# 🔧 Solución: Webhook NO Configurado (No hay logs en Vercel)

## ❌ Problema Identificado

**No hay logs en Vercel cuando envías mensajes** = El webhook NO está configurado en WAHA.

Los mensajes de WhatsApp NO están llegando a tu servidor porque WAHA no sabe dónde enviarlos.

---

## ✅ Solución: Configurar el Webhook

### Opción 1: Usar el endpoint de actualización (RECOMENDADO)

Ejecuta esto en la consola del navegador (F12):

```javascript
// Actualizar webhook
(async function() {
  console.log('🔧 Actualizando webhook...');
  
  try {
    const res = await fetch('/api/whatsapp/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'update_webhook' })
    });
    
    const data = await res.json();
    console.log('✅ Resultado:', data);
    
    if (data.success) {
      alert('✅ Webhook actualizado correctamente\n\nAhora:\n1. Espera 10 segundos\n2. Envía un mensaje de WhatsApp\n3. Revisa logs de Vercel - deberías ver [WAHA Webhook]');
    } else {
      alert('❌ Error: ' + (data.error || 'Error desconocido') + '\n\nRevisa la consola para más detalles');
      console.error('Error completo:', data);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
})();
```

---

### Opción 2: Configurar directamente en WAHA (Si la opción 1 no funciona)

Si el endpoint no funciona, configura el webhook directamente en WAHA:

**1. Obtén tu URL de WAHA y API Key:**
- De `ai_agent_config.policies.waha_api_url`
- De `ai_agent_config.policies.waha_api_key`

**2. Obtén tu URL de la aplicación:**
- Debe ser: `https://erp-taller-saas-correct.vercel.app` (o tu dominio de Vercel)
- O de la variable de entorno `NEXT_PUBLIC_APP_URL`

**3. Obtén el nombre de sesión:**
- De `ai_agent_config.whatsapp_session_name`
- Formato: `confiadrive_bbca12292c4f4838b5f9`

**4. Configurar webhook con curl:**

```bash
curl -X PUT "https://tu-waha-url.com/api/sessions/confiadrive_bbca12292c4f4838b5f9" \
  -H "X-Api-Key: tu-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "webhooks": [{
        "url": "https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp",
        "events": ["message", "session.status"],
        "downloadMedia": true,
        "downloadMediaOnMessage": true
      }]
    }
  }'
```

**5. O usar el script de JavaScript:**

```javascript
// Obtener configuración primero
(async function() {
  const configRes = await fetch('/api/whatsapp/config', {credentials: 'include'});
  const config = await configRes.json();
  
  const wahaUrl = config.data?.policies?.waha_api_url;
  const wahaKey = config.data?.policies?.waha_api_key;
  const sessionName = config.data?.whatsapp_session_name;
  const appUrl = 'https://erp-taller-saas-correct.vercel.app'; // O tu URL de Vercel
  
  console.log('Config:', {wahaUrl, sessionName, appUrl});
  
  if (!wahaUrl || !wahaKey || !sessionName) {
    alert('❌ Faltan datos de configuración');
    return;
  }
  
  // Configurar webhook
  const webhookUrl = `${appUrl}/api/webhooks/whatsapp`;
  
  try {
    const res = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      method: 'PUT',
      headers: {
        'X-Api-Key': wahaKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: {
          webhooks: [{
            url: webhookUrl,
            events: ['message', 'session.status'],
            downloadMedia: true,
            downloadMediaOnMessage: true
          }]
        }
      })
    });
    
    const data = await res.json();
    console.log('Resultado:', data);
    
    if (res.ok) {
      alert('✅ Webhook configurado correctamente\n\nURL: ' + webhookUrl);
    } else {
      alert('❌ Error: ' + JSON.stringify(data));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error: ' + error.message);
  }
})();
```

---

## 🔍 Verificar que el Webhook está Configurado

Después de configurar, verifica:

**1. Consultar configuración de WAHA:**

```javascript
(async function() {
  const configRes = await fetch('/api/whatsapp/config', {credentials: 'include'});
  const config = await configRes.json();
  
  const wahaUrl = config.data?.policies?.waha_api_url;
  const wahaKey = config.data?.policies?.waha_api_key;
  const sessionName = config.data?.whatsapp_session_name;
  
  if (!wahaUrl || !wahaKey || !sessionName) {
    alert('❌ Faltan datos de configuración');
    return;
  }
  
  try {
    const res = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      headers: { 'X-Api-Key': wahaKey }
    });
    
    const sessionData = await res.json();
    console.log('Configuración de sesión:', sessionData);
    
    const webhooks = sessionData.config?.webhooks || [];
    console.log('Webhooks configurados:', webhooks);
    
    if (webhooks.length > 0) {
      alert('✅ Webhook configurado:\n\n' + webhooks.map(w => w.url).join('\n'));
    } else {
      alert('❌ NO hay webhooks configurados');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error: ' + error.message);
  }
})();
```

**2. Enviar mensaje de prueba:**

Después de configurar:
1. Espera 10 segundos
2. Envía un mensaje de WhatsApp
3. Revisa logs de Vercel
4. Deberías ver: `[WAHA Webhook] 📨 Procesando mensaje...`

---

## 📋 Checklist

- [ ] Ejecutar script de actualización de webhook (Opción 1)
- [ ] Si falla, usar configuración directa (Opción 2)
- [ ] Verificar que el webhook está configurado
- [ ] Enviar mensaje de prueba
- [ ] Verificar logs de Vercel (deberías ver `[WAHA Webhook]`)

---

## 💡 Nota Importante

**El webhook debe estar configurado para que WAHA envíe los mensajes a tu servidor.**

Sin webhook configurado:
- ❌ Los mensajes NO llegan a tu servidor
- ❌ No hay logs en Vercel
- ❌ El bot NO puede responder

Con webhook configurado:
- ✅ Los mensajes llegan a `/api/webhooks/whatsapp`
- ✅ Aparecen logs en Vercel
- ✅ El bot puede procesar y responder

