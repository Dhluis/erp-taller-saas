// 🔧 Script para Desconectar, Reconectar y Actualizar Webhook
// Copia y pega esto en la consola del navegador (F12) cuando estés en /dashboard/whatsapp

(async function() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 INICIANDO PROCESO DE RECONEXIÓN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 1. Desconectar
    console.log('📤 Paso 1/3: Desconectando WhatsApp...');
    const disconnectRes = await fetch('/api/whatsapp/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'logout' })
    });
    
    const disconnectData = await disconnectRes.json();
    console.log('✅ Desconectado:', disconnectData);
    
    if (!disconnectData.success) {
      console.warn('⚠️ Advertencia al desconectar:', disconnectData.error);
    }
    
    // 2. Esperar y reconectar
    console.log('\n⏳ Esperando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📤 Paso 2/3: Reconectando WhatsApp...');
    const reconnectRes = await fetch('/api/whatsapp/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'reconnect' })
    });
    
    const reconnectData = await reconnectRes.json();
    console.log('✅ Reconectando:', reconnectData);
    
    if (!reconnectData.success) {
      console.error('❌ Error al reconectar:', reconnectData.error);
      alert('Error al reconectar: ' + reconnectData.error);
      return;
    }
    
    // 3. Esperar y actualizar webhook
    console.log('\n⏳ Esperando 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('📤 Paso 3/3: Actualizando webhook...');
    const webhookRes = await fetch('/api/whatsapp/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'update_webhook' })
    });
    
    const webhookData = await webhookRes.json();
    console.log('✅ Webhook actualizado:', webhookData);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅✅✅ PROCESO COMPLETADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (webhookData.success) {
      alert('✅ ¡Listo! WhatsApp desconectado, reconectado y webhook actualizado.\n\nAhora envía un mensaje de WhatsApp para probar que funciona.');
    } else {
      alert('⚠️ Advertencia: El webhook podría no haberse actualizado correctamente.\n\nRevisa la consola para más detalles.');
    }
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    alert('❌ Error: ' + error.message);
  }
})();

