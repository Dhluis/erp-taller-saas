// 🔧 Script para Actualizar Webhook en WAHA con Custom Headers
// Copia y pega esto en la consola del navegador (F12)

(async function() {
  console.clear();
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
  console.log('%c🔧 ACTUALIZANDO WEBHOOK CON CUSTOM HEADERS', 'font-size: 16px; font-weight: bold; color: blue;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
  
  try {
    // 1. Obtener configuración
    console.log('\n1️⃣ Obteniendo configuración...');
    const configRes = await fetch('/api/whatsapp/config', { credentials: 'include' });
    const configData = await configRes.json();
    
    if (!configData.success || !configData.data) {
      console.error('❌ No se pudo obtener configuración');
      alert('❌ No se pudo obtener configuración');
      return;
    }
    
    const config = configData.data;
    const wahaUrl = config.policies?.waha_api_url;
    const wahaKey = config.policies?.waha_api_key;
    const sessionName = config.whatsapp_session_name;
    const organizationId = 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'; // Por ahora hardcodeado
    
    console.log('📊 Configuración:', {
      sessionName,
      wahaUrl,
      organizationId
    });
    
    if (!wahaUrl || !wahaKey || !sessionName) {
      console.error('❌ Faltan datos de configuración');
      alert('❌ Faltan datos de configuración');
      return;
    }
    
    // 2. URL del webhook
    const webhookUrl = 'https://erp-taller-saas-correct.vercel.app/api/webhooks/whatsapp';
    
    console.log('\n2️⃣ Actualizando configuración del webhook...');
    console.log('URL:', `${wahaUrl}/api/sessions/${sessionName}`);
    console.log('Webhook URL:', webhookUrl);
    console.log('Custom Headers:', [{ name: 'X-Organization-ID', value: organizationId }]);
    
    // 3. Actualizar webhook con customHeaders
    const updateRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': wahaKey
      },
      body: JSON.stringify({
        config: {
          webhooks: [{
            url: webhookUrl,
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
    
    console.log('📊 Status:', updateRes.status);
    
    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error('❌ Error actualizando webhook:', errorText);
      alert('❌ Error: ' + updateRes.status + '\n' + errorText);
      return;
    }
    
    const updateData = await updateRes.json();
    console.log('✅ Respuesta:', updateData);
    
    // 4. Verificar que se actualizó correctamente
    console.log('\n3️⃣ Verificando configuración actualizada...');
    const verifyRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      headers: { 'X-Api-Key': wahaKey }
    });
    
    const verifyData = await verifyRes.json();
    const webhooks = verifyData.config?.webhooks || [];
    
    console.log('📊 Webhooks configurados:', webhooks.length);
    
    if (webhooks.length > 0) {
      const wh = webhooks[0];
      console.log('📡 Webhook:', {
        url: wh.url,
        events: wh.events,
        customHeaders: wh.customHeaders
      });
      
      if (wh.customHeaders && wh.customHeaders.length > 0) {
        console.log('%c✅ ✅ ✅ WEBHOOK ACTUALIZADO CORRECTAMENTE CON CUSTOM HEADERS', 'color: green; font-weight: bold; font-size: 14px;');
        console.log('\n📋 Headers configurados:');
        wh.customHeaders.forEach(h => {
          console.log(`  ${h.name}: ${h.value}`);
        });
        
        console.log('\n💡 Próximos pasos:');
        console.log('1. Espera 10 segundos');
        console.log('2. Envía un mensaje de WhatsApp desde tu teléfono');
        console.log('3. Ve a Vercel → Logs');
        console.log('4. Deberías ver: [WAHA Webhook] 📨 Procesando mensaje...');
        
        alert('✅ Webhook actualizado correctamente con Custom Headers\n\nHeaders:\n' + 
              wh.customHeaders.map(h => `  ${h.name}: ${h.value}`).join('\n') +
              '\n\nEnvía un mensaje y revisa logs de Vercel');
      } else {
        console.warn('%c⚠️ Webhook actualizado pero NO tiene customHeaders', 'color: orange; font-weight: bold;');
        alert('⚠️ Webhook actualizado pero no tiene customHeaders');
      }
    } else {
      console.error('❌ No se encontraron webhooks después de actualizar');
      alert('❌ No se encontraron webhooks después de actualizar');
    }
    
  } catch (error) {
    console.error('%c❌ ERROR', 'color: red; font-weight: bold; font-size: 14px;');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    alert('❌ Error: ' + error.message + '\n\nRevisa la consola para más detalles');
  }
})();

