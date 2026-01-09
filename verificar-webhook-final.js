// 🔍 Verificación Final del Webhook
// Ejecuta esto después de actualizar el webhook

(async function() {
  console.log('🔍 Verificando configuración del webhook...');
  
  const configRes = await fetch('/api/whatsapp/config', {credentials: 'include'});
  const config = await configRes.json();
  
  const wahaUrl = config.data?.policies?.waha_api_url;
  const wahaKey = config.data?.policies?.waha_api_key;
  const sessionName = config.data?.whatsapp_session_name;
  
  if (!wahaUrl || !wahaKey || !sessionName) {
    alert('❌ Faltan datos');
    return;
  }
  
  const res = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
    headers: { 'X-Api-Key': wahaKey }
  });
  
  const data = await res.json();
  const webhooks = data.config?.webhooks || [];
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ESTADO DE LA SESIÓN:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Estado:', data.status);
  console.log('Teléfono:', data.me?.id || 'N/A');
  console.log('');
  console.log('📡 WEBHOOKS CONFIGURADOS:', webhooks.length);
  
  if (webhooks.length > 0) {
    const wh = webhooks[0];
    console.log('URL:', wh.url);
    console.log('Eventos:', wh.events);
    
    if (wh.customHeaders && wh.customHeaders.length > 0) {
      console.log('✅ Custom Headers:', wh.customHeaders);
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ WEBHOOK CONFIGURADO CORRECTAMENTE');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('📋 Próximos pasos:');
      console.log('1. Espera a que la sesión vuelva a WORKING (puede tardar 30-60 segundos)');
      console.log('2. Envía un mensaje de WhatsApp');
      console.log('3. Revisa logs de Vercel');
      console.log('4. Busca: [WAHA Webhook] 📨 Procesando mensaje...');
    } else {
      console.log('❌ NO hay Custom Headers');
      console.log('');
      console.log('⚠️ El webhook NO tiene customHeaders configurados');
    }
  } else {
    console.log('❌ NO hay webhooks configurados');
  }
  
  return { status: data.status, webhooks };
})();

