// 🔍 Script para Verificar si el Webhook está Configurado
// Copia y pega esto en la consola del navegador (F12)

(async function() {
  console.clear();
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
  console.log('%c🔍 VERIFICANDO CONFIGURACIÓN DE WEBHOOK', 'font-size: 16px; font-weight: bold; color: blue;');
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
    
    console.log('📊 Configuración:', {
      sessionName,
      wahaUrl: wahaUrl ? '✅ Configurada' : '❌ No configurada',
      wahaKey: wahaKey ? '✅ Configurada' : '❌ No configurada'
    });
    
    if (!wahaUrl || !wahaKey || !sessionName) {
      console.error('❌ Faltan datos de configuración');
      alert('❌ Faltan datos de configuración (WAHA URL, Key o Session Name)');
      return;
    }
    
    // 2. Consultar sesión en WAHA
    console.log('\n2️⃣ Consultando sesión en WAHA...');
    console.log('URL:', `${wahaUrl}/api/sessions/${sessionName}`);
    
    const sessionRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': wahaKey
      }
    });
    
    console.log('Status:', sessionRes.status);
    
    if (!sessionRes.ok) {
      const errorText = await sessionRes.text();
      console.error('❌ Error consultando sesión:', errorText);
      alert('❌ Error consultando sesión: ' + sessionRes.status + '\n' + errorText);
      return;
    }
    
    const sessionData = await sessionRes.json();
    console.log('📥 Datos de sesión:', sessionData);
    
    // 3. Verificar webhooks
    console.log('\n3️⃣ Verificando webhooks configurados...');
    const webhooks = sessionData.config?.webhooks || [];
    
    console.log('📊 Webhooks encontrados:', webhooks.length);
    
    if (webhooks.length === 0) {
      console.error('%c❌ NO HAY WEBHOOKS CONFIGURADOS', 'color: red; font-weight: bold; font-size: 14px;');
      console.log('\n💡 Ejecuta el script "configurar-webhook.js" para configurarlo');
      alert('❌ NO HAY WEBHOOKS CONFIGURADOS\n\nEjecuta el script configurar-webhook.js');
      return null;
    }
    
    // Mostrar cada webhook
    webhooks.forEach((webhook, index) => {
      console.log(`\n📡 Webhook ${index + 1}:`);
      console.log('  URL:', webhook.url);
      console.log('  Eventos:', webhook.events?.join(', ') || 'N/A');
      console.log('  Download Media:', webhook.downloadMedia ? '✅ Sí' : '❌ No');
    });
    
    // Verificar que el webhook apunte a la URL correcta
    const expectedUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
      : 'https://erp-taller-saas.vercel.app/api/webhooks/whatsapp';
    
    const hasCorrectUrl = webhooks.some(w => w.url === expectedUrl || w.url.includes('/api/webhooks/whatsapp'));
    
    if (hasCorrectUrl) {
      console.log('%c✅ ✅ ✅ WEBHOOK CONFIGURADO CORRECTAMENTE', 'color: green; font-weight: bold; font-size: 14px;');
      console.log('\n📋 URL del webhook:', expectedUrl);
      console.log('\n💡 Prueba:');
      console.log('1. Envía un mensaje de WhatsApp');
      console.log('2. Revisa logs de Vercel');
      console.log('3. Deberías ver: [WAHA Webhook] 📨 Procesando mensaje...');
      
      alert('✅ Webhook configurado correctamente\n\nURL: ' + expectedUrl + '\n\nEnvía un mensaje y revisa logs de Vercel');
    } else {
      console.warn('%c⚠️ WEBHOOK CONFIGURADO PERO URL INCORRECTA', 'color: orange; font-weight: bold; font-size: 14px;');
      console.log('URL esperada:', expectedUrl);
      console.log('URL configurada:', webhooks[0]?.url);
      console.log('\n💡 Ejecuta el script "configurar-webhook.js" para corregirlo');
      
      alert('⚠️ Webhook configurado pero URL incorrecta\n\nEsperada: ' + expectedUrl + '\n\nEjecuta configurar-webhook.js para corregirlo');
    }
    
    return {
      webhooks,
      sessionData,
      hasCorrectUrl
    };
    
  } catch (error) {
    console.error('%c❌ ERROR EN LA VERIFICACIÓN', 'color: red; font-weight: bold; font-size: 14px;');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    alert('❌ Error: ' + error.message + '\n\nRevisa la consola para más detalles');
    
    return null;
  }
})();

