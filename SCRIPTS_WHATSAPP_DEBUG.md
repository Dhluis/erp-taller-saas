# 🔧 Scripts de Debugging para WhatsApp

## 📋 Script 1: Desconectar, Reconectar y Actualizar Webhook

Copia y pega este script en la consola del navegador (F12) cuando estés en `/dashboard/whatsapp`:

```javascript
// Script para desconectar, reconectar y actualizar webhook
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
```

---

## 📋 Script 2: Solo Actualizar Webhook (Más Rápido)

Si solo quieres actualizar el webhook sin desconectar:

```javascript
(async function() {
  console.log('📤 Actualizando webhook...');
  
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
      alert('✅ Webhook actualizado correctamente');
    } else {
      alert('❌ Error: ' + (data.error || 'Error desconocido'));
    }
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
})();
```

---

## 📋 Script 3: Verificar Estado del Webhook

Para verificar si el webhook está configurado correctamente:

```javascript
(async function() {
  console.log('🔍 Verificando webhook...');
  
  try {
    // Si existe el endpoint de verificación (en la rama nueva)
    const res = await fetch('/api/whatsapp/verify-webhook', {
      method: 'GET',
      credentials: 'include'
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('📊 Estado del webhook:', data);
      
      if (data.webhookConfigured) {
        alert('✅ Webhook está correctamente configurado\n\nURL: ' + data.expectedWebhookUrl);
      } else {
        alert('⚠️ Webhook NO está configurado\n\nURL esperada: ' + data.expectedWebhookUrl);
      }
    } else {
      console.warn('⚠️ Endpoint de verificación no disponible en esta rama');
      alert('⚠️ Endpoint de verificación no disponible. Usa el script de actualización.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
})();
```

---

## 📋 Script 4: Verificar Estado de la Sesión

Para ver el estado actual de la sesión de WhatsApp:

```javascript
(async function() {
  console.log('🔍 Verificando estado de sesión...');
  
  try {
    const res = await fetch('/api/whatsapp/session', {
      method: 'GET',
      credentials: 'include'
    });
    
    const data = await res.json();
    console.log('📊 Estado de sesión:', data);
    
    const status = data.status || data.data?.status || 'UNKNOWN';
    const connected = data.connected || data.data?.connected || false;
    const phone = data.phone || data.data?.phone || 'N/A';
    
    alert(`Estado: ${status}\nConectado: ${connected ? 'Sí' : 'No'}\nTeléfono: ${phone}`);
  } catch (error) {
    console.error('❌ Error:', error);
    alert('❌ Error: ' + error.message);
  }
})();
```

---

## 📋 Script 5: Forzar Actualización Completa (Si existe force-webhook)

```javascript
(async function() {
  console.log('🔧 Forzando actualización de webhook...');
  
  try {
    const res = await fetch('/api/whatsapp/force-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    const data = await res.json();
    console.log('✅ Resultado:', data);
    
    if (data.success) {
      alert('✅ Webhook actualizado y verificado correctamente\n\nWebhooks activos: ' + data.webhooksConfigured);
    } else {
      alert('❌ Error: ' + (data.error || 'Error desconocido'));
    }
  } catch (error) {
    console.error('❌ Error:', error);
    // Si el endpoint no existe, usar el método alternativo
    console.log('⚠️ Endpoint force-webhook no existe, usando update_webhook...');
    
    const res2 = await fetch('/api/whatsapp/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'update_webhook' })
    });
    
    const data2 = await res2.json();
    console.log('✅ Resultado (update_webhook):', data2);
    alert('✅ Webhook actualizado (método alternativo)');
  }
})();
```

---

## ⚠️ Nota Importante

**Si estás en la rama `fix/restore-working-whatsapp`:**

- ✅ `action: 'update_webhook'` - Debería funcionar si existe en esa versión
- ❌ `/api/whatsapp/verify-webhook` - Probablemente NO existe en esa rama
- ❌ `/api/whatsapp/force-webhook` - Probablemente NO existe en esa rama

**Si necesitas estas funcionalidades, vuelve a la rama `development` o `main`.**

---

## 🎯 Recomendación

1. **Primero:** Usa el Script 1 (Desconectar, Reconectar y Actualizar Webhook)
2. **Luego:** Verifica con Script 4 (Estado de sesión)
3. **Finalmente:** Envía un mensaje de prueba desde WhatsApp

