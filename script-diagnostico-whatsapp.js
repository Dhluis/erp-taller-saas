// 🔍 Script de Diagnóstico Completo para WhatsApp
// Copia y pega esto en la consola del navegador (F12) cuando estés en /dashboard/whatsapp

(async function() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DIAGNÓSTICO COMPLETO DE WHATSAPP');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const results = {
    session: null,
    config: null,
    issues: []
  };
  
  try {
    // 1. Verificar estado de sesión
    console.log('\n1️⃣ Verificando estado de sesión...');
    const sessionRes = await fetch('/api/whatsapp/session', {
      credentials: 'include'
    });
    const sessionData = await sessionRes.json();
    results.session = sessionData;
    
    const isConnected = sessionData.connected || sessionData.data?.connected || sessionData.status === 'WORKING';
    const phone = sessionData.phone || sessionData.data?.phone || 'N/A';
    const status = sessionData.status || sessionData.data?.status || 'UNKNOWN';
    
    console.log('📊 Sesión:', {
      connected: isConnected,
      status: status,
      phone: phone
    });
    
    if (!isConnected && status !== 'WORKING') {
      results.issues.push('❌ WhatsApp NO está conectado (status: ' + status + ')');
    }
    
    // 2. Verificar configuración
    console.log('\n2️⃣ Verificando configuración del bot...');
    const configRes = await fetch('/api/whatsapp/config', {
      credentials: 'include'
    });
    const configData = await configRes.json();
    results.config = configData;
    
    const enabled = configData.data?.enabled || configData.enabled || false;
    const whatsappConnected = configData.data?.whatsapp_connected || configData.whatsapp_connected || false;
    const provider = configData.data?.provider || configData.provider || 'N/A';
    const model = configData.data?.model || configData.model || 'N/A';
    
    console.log('📊 Config:', {
      enabled: enabled,
      whatsapp_connected: whatsappConnected,
      provider: provider,
      model: model
    });
    
    if (!enabled) {
      results.issues.push('❌ Bot NO está activado (enabled = false)');
    }
    
    if (!whatsappConnected) {
      results.issues.push('⚠️ WhatsApp NO está marcado como conectado en BD');
    }
    
    // 3. Resumen
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DIAGNÓSTICO COMPLETADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n📋 Resultados completos:', results);
    
    if (results.issues.length === 0) {
      const message = '✅ Configuración correcta:\n\n' +
        'Sesión: ' + (isConnected ? '✅ Conectada' : '❌ No conectada') + ' (' + status + ')\n' +
        'Teléfono: ' + phone + '\n' +
        'Bot activado: ' + (enabled ? '✅ Sí' : '❌ No') + '\n' +
        'Provider: ' + provider + '\n' +
        'Model: ' + model + '\n\n' +
        'Si aún no funciona, revisa:\n' +
        '1. Logs de Vercel cuando envías un mensaje\n' +
        '2. Si is_bot_active = true en whatsapp_conversations (BD)\n' +
        '3. Si los mensajes están llegando al webhook';
      
      alert(message);
      console.log('💡 Siguiente paso: Revisa los logs de Vercel cuando envíes un mensaje de WhatsApp');
    } else {
      const message = '⚠️ Problemas encontrados:\n\n' + results.issues.join('\n') + '\n\n' +
        'Sesión: ' + status + ' (' + (isConnected ? 'Conectada' : 'No conectada') + ')\n' +
        'Bot activado: ' + (enabled ? 'Sí' : 'No') + '\n\n' +
        'Revisa la consola para más detalles.';
      
      alert(message);
    }
    
    // 4. Instrucciones adicionales
    console.log('\n💡 INSTRUCCIONES:');
    console.log('1. Ve a Vercel Dashboard → Logs');
    console.log('2. Envía un mensaje de WhatsApp');
    console.log('3. Busca estos logs:');
    console.log('   - [WAHA Webhook] 📨 Procesando mensaje... (mensaje llega)');
    console.log('   - [WAHA Webhook] ⏸️ Bot inactivo (bot desactivado)');
    console.log('   - [WAHA Webhook] ❌ No se encontró configuración AI (config faltante)');
    console.log('   - [WAHA Webhook] 🤖 Procesando con AI Agent... (está procesando)');
    console.log('   - [WAHA Webhook] ✅ AI generó respuesta (debería responder)');
    
    return results;
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error en diagnóstico: ' + error.message);
    console.log('Stack:', error.stack);
    return null;
  }
})();

