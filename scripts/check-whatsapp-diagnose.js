/**
 * Script para verificar el endpoint de diagnóstico de WhatsApp
 * Uso: node scripts/check-whatsapp-diagnose.js
 */

const https = require('https');

const url = 'https://erp-taller-saas.vercel.app/api/whatsapp/diagnose';

console.log('🔍 Llamando al endpoint de diagnóstico...');
console.log('📍 URL:', url);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// NOTA: Este script requiere autenticación
// Para usarlo, necesitas pasar las cookies de sesión
// Mejor usar el navegador o Postman

const options = {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    // Agregar aquí tus cookies de sesión si las tienes
    // 'Cookie': 'tu-cookie-de-sesion'
  }
};

const req = https.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('📊 Status Code:', res.statusCode);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    try {
      const json = JSON.parse(data);
      console.log('📋 Respuesta del diagnóstico:');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.success) {
        console.log('\n✅ Diagnóstico completado exitosamente');
      } else {
        console.log('\n❌ Se encontraron problemas en el diagnóstico');
        if (json.diagnostics?.errors) {
          console.log('\n🔴 Errores:');
          json.diagnostics.errors.forEach(err => console.log('  -', err));
        }
        if (json.diagnostics?.warnings) {
          console.log('\n⚠️ Advertencias:');
          json.diagnostics.warnings.forEach(warn => console.log('  -', warn));
        }
        if (json.diagnostics?.recommendations) {
          console.log('\n💡 Recomendaciones:');
          json.diagnostics.recommendations.forEach(rec => console.log('  -', rec));
        }
      }
    } catch (e) {
      console.log('❌ Error parseando respuesta:', e.message);
      console.log('📄 Respuesta raw:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error en la petición:', error.message);
});

req.end();

