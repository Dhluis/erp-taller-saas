// 🔍 Script de Diagnóstico Simple - Muestra resultados claros
// Copia y pega esto en la consola del navegador (F12)

(async function() {
  console.clear();
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
  console.log('%c🔍 DIAGNÓSTICO WHATSAPP', 'font-size: 16px; font-weight: bold; color: blue;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
  
  let results = '';
  
  try {
    // 1. Sesión
    console.log('%c\n1️⃣ Verificando sesión...', 'font-weight: bold; color: green;');
    const sessionRes = await fetch('/api/whatsapp/session', { credentials: 'include' });
    const sessionData = await sessionRes.json();
    console.log('Respuesta completa:', sessionData);
    
    const isConnected = sessionData.success && (sessionData.connected || sessionData.status === 'WORKING');
    const phone = sessionData.phone || sessionData.data?.phone || 'N/A';
    const status = sessionData.status || sessionData.data?.status || 'UNKNOWN';
    
    console.log('%c📊 Sesión:', 'font-weight: bold;', {
      Conectada: isConnected ? '✅ SÍ' : '❌ NO',
      Estado: status,
      Teléfono: phone
    });
    
    results += `Sesión: ${isConnected ? '✅ Conectada' : '❌ No conectada'} (${status})\n`;
    results += `Teléfono: ${phone}\n\n`;
    
    if (!isConnected) {
      console.error('%c❌ WhatsApp NO está conectado', 'color: red; font-weight: bold;');
    }
    
    // 2. Configuración
    console.log('%c\n2️⃣ Verificando configuración...', 'font-weight: bold; color: green;');
    const configRes = await fetch('/api/whatsapp/config', { credentials: 'include' });
    const configData = await configRes.json();
    console.log('Respuesta completa:', configData);
    
    const enabled = configData.data?.enabled || configData.success && configData.data?.enabled !== false;
    const whatsappConnected = configData.data?.whatsapp_connected || false;
    const provider = configData.data?.provider || 'N/A';
    const model = configData.data?.model || 'N/A';
    
    console.log('%c📊 Config:', 'font-weight: bold;', {
      Bot_Activado: enabled ? '✅ SÍ' : '❌ NO',
      WhatsApp_Conectado: whatsappConnected ? '✅ SÍ' : '❌ NO',
      Provider: provider,
      Model: model
    });
    
    results += `Bot activado: ${enabled ? '✅ SÍ' : '❌ NO'}\n`;
    results += `WhatsApp conectado (BD): ${whatsappConnected ? '✅ SÍ' : '❌ NO'}\n`;
    results += `Provider: ${provider}\n`;
    results += `Model: ${model}\n\n`;
    
    // 3. Resumen
    console.log('%c\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
    console.log('%c📋 RESUMEN', 'font-size: 16px; font-weight: bold; color: blue;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
    
    const issues = [];
    if (!isConnected) {
      issues.push('❌ WhatsApp NO está conectado');
      console.error('%c❌ PROBLEMA: WhatsApp NO está conectado', 'color: red; font-weight: bold;');
    }
    if (!enabled) {
      issues.push('❌ Bot NO está activado');
      console.error('%c❌ PROBLEMA: Bot NO está activado', 'color: red; font-weight: bold;');
    }
    if (!whatsappConnected && isConnected) {
      issues.push('⚠️ WhatsApp conectado pero no marcado en BD');
      console.warn('%c⚠️ ADVERTENCIA: WhatsApp conectado pero no marcado en BD', 'color: orange; font-weight: bold;');
    }
    
    if (issues.length === 0) {
      console.log('%c✅ Configuración correcta', 'color: green; font-weight: bold;');
      console.log('%c\n💡 Si aún no funciona:', 'font-weight: bold;');
      console.log('1. Revisa logs de Vercel cuando envíes un mensaje');
      console.log('2. Busca: [WAHA Webhook] en los logs');
      console.log('3. Verifica is_bot_active en BD con este SQL:');
      console.log('%c   SELECT is_bot_active FROM whatsapp_conversations WHERE organization_id = \'tu-org-id\';', 'background: #f0f0f0; padding: 5px;');
      
      alert('✅ Configuración correcta\n\n' + results + '\n💡 Si aún no funciona:\n1. Revisa logs de Vercel\n2. Verifica is_bot_active en BD');
    } else {
      console.error('%c\n❌ PROBLEMAS ENCONTRADOS:', 'color: red; font-weight: bold;');
      issues.forEach(issue => console.error('  ' + issue));
      
      alert('⚠️ Problemas encontrados:\n\n' + results + '\nProblemas:\n' + issues.join('\n'));
    }
    
    // 4. Instrucciones para verificar webhook
    console.log('%c\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
    console.log('%c📝 PRÓXIMOS PASOS', 'font-size: 16px; font-weight: bold; color: blue;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
    console.log('1. Ve a Vercel Dashboard → Logs');
    console.log('2. Envía un mensaje de WhatsApp desde tu teléfono');
    console.log('3. Busca estos logs:');
    console.log('   - [WAHA Webhook] 📨 Procesando mensaje...');
    console.log('   - [WAHA Webhook] ⏸️ Bot inactivo');
    console.log('   - [WAHA Webhook] ❌ Error...');
    
    return {
      session: { connected: isConnected, status, phone },
      config: { enabled, whatsappConnected, provider, model },
      issues
    };
    
  } catch (error) {
    console.error('%c\n❌ ERROR EN DIAGNÓSTICO', 'color: red; font-weight: bold;');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    alert('❌ Error: ' + error.message + '\n\nRevisa la consola para más detalles');
    return null;
  }
})();

