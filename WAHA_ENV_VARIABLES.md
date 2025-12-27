# 🔧 Variables de Entorno WAHA - Configuración Correcta

## ✅ Variables correctas para EasyPanel

```bash
WAHA_APPS_ENABLED=false
WAHA_PUBLIC_URL=https://waha-erp-eagles-sistem.0rfifc.easypanel.host/
REDIS_URL=redis://default:Gabyyluis2025@%@redis_redis-erp:6379
WHATSAPP_DEFAULT_ENGINE=NOWEB
WAHA_API_KEY=mi_clave_segura_2025
WAHA_LOCAL_STORE_BASE_DIR=/app/.sessions
WHATSAPP_FILES_FOLDER=/app/.media
WAHA_DASHBOARD_ENABLED=true
WAHA_DASHBOARD_USERNAME=admin
WAHA_DASHBOARD_PASSWORD=Gabyyluis2025@%
WHATSAPP_RESTART_ALL_SESSIONS=true
TZ=America/Mexico_City
```

## ❌ Variables que DEBES REMOVER (están causando el problema)

```bash
# ❌ REMOVER ESTAS:
WHATSAPP_HOOK_URL=https://erp-taller-saas.vercel.app/api/webhooks/whatsapp
WHATSAPP_HOOK_EVENTS=message,session.status
WHATSAPP_HOOK_HEADERS=[{"name":"X-Organization-ID","value":"bbca1229-2c4f-4838-b5f9-9e8a8ca79261"}]
```

## 📋 Explicación

### ¿Por qué remover las variables del webhook?

1. **Problema de multi-tenancy:** `WHATSAPP_HOOK_HEADERS` está hardcoded con un `organizationId` específico, pero necesitas soporte multi-tenant.

2. **Sobrescritura:** Estas variables globales están sobrescribiendo la configuración por sesión que hace el código en `updateSessionWebhook()`.

3. **Configuración dinámica:** El código ya configura el webhook automáticamente para cada sesión con:
   - URL correcta
   - Events: `['message', 'session.status']`
   - Custom Headers con el `organizationId` correcto para cada organización

### ¿Cómo funciona sin estas variables?

El código en `src/lib/waha-sessions.ts` y `src/app/api/whatsapp/session/route.ts` configura automáticamente el webhook cuando:
- Se crea una nueva sesión (`createOrganizationSession`)
- Se reconecta una sesión (`reconnect` action)
- Se verifica el estado y está en `WORKING` (GET handler)

Cada sesión tendrá su propio webhook configurado con el `organizationId` correcto.

## 🔄 Pasos para aplicar

1. **En EasyPanel:**
   - Abre la configuración del contenedor WAHA
   - Remueve estas 3 variables:
     - `WHATSAPP_HOOK_URL`
     - `WHATSAPP_HOOK_EVENTS`
     - `WHATSAPP_HOOK_HEADERS`
   - Guarda los cambios

2. **Reiniciar el contenedor WAHA** (para que los cambios surtan efecto)

3. **Reiniciar la sesión de WhatsApp** desde la UI:
   - Ve a `/dashboard/whatsapp/train-agent`
   - Haz clic en "Desconectar" y luego "Vincular WhatsApp"
   - O ejecuta el script de reconnect desde la consola

4. **Verificar que el webhook se configuró correctamente:**
   - Ejecuta el script de verificación en la consola del navegador
   - Deberías ver Custom Headers con el `organizationId` correcto

## ✅ Resultado esperado

Después de remover las variables globales:
- ✅ Cada sesión configura su propio webhook automáticamente
- ✅ Cada webhook incluye el `organizationId` correcto en Custom Headers
- ✅ Soporte multi-tenant funcionando correctamente
- ✅ Los mensajes llegarán al endpoint `/api/webhooks/whatsapp`
- ✅ El endpoint podrá identificar la organización desde el header `X-Organization-ID`

## 🧪 Verificación

Después de aplicar los cambios, ejecuta este script en la consola del navegador:

```javascript
(async function() {
  const configRes = await fetch('/api/whatsapp/config', {credentials: 'include'});
  const config = await configRes.json();
  const wahaUrl = config.data?.policies?.waha_api_url;
  const wahaKey = config.data?.policies?.waha_api_key;
  const sessionName = config.data?.whatsapp_session_name;
  
  const sessionRes = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
    headers: { 'X-Api-Key': wahaKey }
  });
  const sessionData = await sessionRes.json();
  const webhook = sessionData.config?.webhooks?.[0];
  
  console.log('📊 Configuración del webhook:');
  console.log('URL:', webhook?.url);
  console.log('Events:', webhook?.events);
  console.log('Custom Headers:', webhook?.customHeaders);
  
  if (webhook?.customHeaders?.length > 0 && webhook.customHeaders[0].name === 'X-Organization-ID') {
    console.log('✅ Webhook configurado correctamente con Custom Headers');
  } else {
    console.log('⚠️ Webhook NO tiene Custom Headers - ejecuta reconnect');
  }
})();
```

