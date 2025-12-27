// 🔧 Script para Configurar Webhook de WhatsApp
// Copia y pega esto en la consola del navegador (F12)

(async function() {
  console.clear();
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
  console.log('%c🔧 CONFIGURANDO WEBHOOK DE WHATSAPP', 'font-size: 16px; font-weight: bold; color: blue;');
  console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'font-size: 16px; font-weight: bold;');
  
  try {
    console.log('\n📤 Enviando solicitud para actualizar webhook...');
    
    const response = await fetch('/api/whatsapp/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ 
        action: 'update_webhook' 
      })
    });
    
    console.log('📊 Status:', response.status);
    
    const data = await response.json();
    console.log('📥 Respuesta completa:', data);
    
    if (data.success) {
      console.log('%c✅ ✅ ✅ WEBHOOK CONFIGURADO CORRECTAMENTE', 'color: green; font-weight: bold; font-size: 14px;');
      console.log('\n📋 Próximos pasos:');
      console.log('1. Espera 10 segundos');
      console.log('2. Envía un mensaje de WhatsApp desde tu teléfono');
      console.log('3. Ve a Vercel → Logs');
      console.log('4. Deberías ver: [WAHA Webhook] 📨 Procesando mensaje...');
      
      alert('✅ Webhook configurado correctamente\n\nAhora:\n1. Espera 10 segundos\n2. Envía un mensaje de WhatsApp\n3. Revisa logs de Vercel\n\nDeberías ver: [WAHA Webhook] 📨 Procesando mensaje...');
      
      return data;
    } else {
      console.error('%c❌ ERROR AL CONFIGURAR WEBHOOK', 'color: red; font-weight: bold; font-size: 14px;');
      console.error('Error:', data.error);
      console.error('Detalles:', data.details);
      
      alert('❌ Error: ' + (data.error || 'Error desconocido') + '\n\nRevisa la consola para más detalles');
      
      return null;
    }
  } catch (error) {
    console.error('%c❌ ERROR EN LA PETICIÓN', 'color: red; font-weight: bold; font-size: 14px;');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    alert('❌ Error: ' + error.message + '\n\nRevisa la consola para más detalles');
    
    return null;
  }
})();

