// 🧪 Test del Endpoint del Webhook
// Ejecuta esto para verificar que el endpoint es accesible

(async function() {
  console.log('🧪 Probando endpoint del webhook...');
  
  const webhookUrl = 'https://erp-taller-saas.vercel.app/api/webhooks/whatsapp';
  
  try {
    // Test GET (debería retornar {status: 'ok'})
    console.log('1️⃣ Probando GET...');
    const getRes = await fetch(webhookUrl);
    const getData = await getRes.json();
    console.log('✅ GET funciona:', getData);
    
    // Test POST con un payload de prueba
    console.log('\n2️⃣ Probando POST con payload de prueba...');
    const testPayload = {
      event: 'message',
      session: 'eagles_bbca12292c4f4838b5f9',
      payload: {
        id: 'test-message-' + Date.now(),
        from: '5211234567890@c.us',
        body: 'Test message',
        fromMe: false
      }
    };
    
    const postRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Organization-ID': 'bbca1229-2c4f-4838-b5f9-9e8a8ca79261'
      },
      body: JSON.stringify(testPayload)
    });
    
    const postData = await postRes.json();
    console.log('✅ POST funciona:', postData);
    console.log('Status:', postRes.status);
    
    if (postRes.ok) {
      console.log('\n✅✅✅ ENDPOINT ACCESIBLE Y FUNCIONANDO');
      console.log('\n💡 Si el endpoint funciona pero no ves logs cuando envías mensajes reales:');
      console.log('   - WAHA podría no estar enviando los eventos');
      console.log('   - Revisa logs de WAHA/EasyPanel');
      console.log('   - Verifica que WAHA tenga acceso a internet para llamar a Vercel');
    } else {
      console.log('\n⚠️ Endpoint retornó error:', postRes.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error probando endpoint: ' + error.message);
  }
})();

