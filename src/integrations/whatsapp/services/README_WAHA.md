# 📱 WAHA Service - Guía de Uso

Servicio completo para interactuar con WAHA (WhatsApp HTTP API).

## 🔧 Configuración

Asegúrate de tener estas variables en tu `.env.local`:

```env
WAHA_API_URL=https://waha-erp-eagles-sistem.0rfifc.easypanel.host
WAHA_API_KEY=mi_clave_segura_2025
NEXT_PUBLIC_APP_URL=https://erp-taller-saas-5dqka3oow.vercel.app
```

## 📚 Funciones Disponibles

### 1. `createSession(organizationId)`
Crea una sesión de WAHA para una organización.

```typescript
import { createSession } from '@/integrations/whatsapp/services/waha-service';

const session = await createSession('org-123');
// Nombre de sesión: "org_org-123"
```

### 2. `getSession(sessionName)`
Obtiene información de una sesión existente.

```typescript
import { getSession } from '@/integrations/whatsapp/services/waha-service';

const session = await getSession('org_org-123');
console.log(session.status); // 'WORKING', 'SCAN_QR_CODE', etc.
```

### 3. `getQRCode(organizationId)`
Obtiene el código QR para vincular WhatsApp.

```typescript
import { getQRCode } from '@/integrations/whatsapp/services/waha-service';

const { qrCode, sessionName, expiresIn } = await getQRCode('org-123');
// qrCode: string (base64 o URL)
// expiresIn: 60 segundos
```

### 4. `checkConnectionStatus(organizationId)`
Verifica si WhatsApp está conectado y obtiene información de la cuenta.

```typescript
import { checkConnectionStatus } from '@/integrations/whatsapp/services/waha-service';

const status = await checkConnectionStatus('org-123');
if (status.connected) {
  console.log('Conectado:', status.phone, status.name);
} else {
  console.log('No conectado:', status.status);
}
```

### 5. `sendTextMessage(organizationId, to, text)`
Envía un mensaje de texto.

```typescript
import { sendTextMessage } from '@/integrations/whatsapp/services/waha-service';

const result = await sendTextMessage(
  'org-123',
  '+52 1 449 123 4567',
  '¡Hola! Este es un mensaje de prueba'
);

if (result.sent) {
  console.log('Mensaje enviado:', result.messageId);
} else {
  console.error('Error:', result.error);
}
```

### 6. `sendImage(organizationId, to, imageUrl, caption?)`
Envía una imagen.

```typescript
import { sendImage } from '@/integrations/whatsapp/services/waha-service';

const result = await sendImage(
  'org-123',
  '+52 1 449 123 4567',
  'https://example.com/image.jpg',
  'Mira esta imagen'
);
```

### 7. `sendFile(organizationId, to, fileUrl, filename, caption?)`
Envía un archivo.

```typescript
import { sendFile } from '@/integrations/whatsapp/services/waha-service';

const result = await sendFile(
  'org-123',
  '+52 1 449 123 4567',
  'https://example.com/document.pdf',
  'documento.pdf',
  'Aquí está tu documento'
);
```

### 8. `disconnectSession(organizationId)`
Desconecta una sesión (detiene pero no elimina).

```typescript
import { disconnectSession } from '@/integrations/whatsapp/services/waha-service';

await disconnectSession('org-123');
```

### 9. `deleteSession(organizationId)`
Elimina una sesión completamente.

```typescript
import { deleteSession } from '@/integrations/whatsapp/services/waha-service';

await deleteSession('org-123');
```

## 🔧 Helper Functions

### `formatPhoneNumber(phone)`
Formatea un número de teléfono al formato de WhatsApp.

```typescript
import { formatPhoneNumber } from '@/integrations/whatsapp/services/waha-service';

const formatted = formatPhoneNumber('+52 1 449 123 4567');
// Resultado: "5214491234567@c.us"
```

## 📝 Ejemplo Completo

```typescript
import {
  createSession,
  getQRCode,
  checkConnectionStatus,
  sendTextMessage,
  formatPhoneNumber
} from '@/integrations/whatsapp/services/waha-service';

async function setupWhatsApp(organizationId: string) {
  try {
    // 1. Crear sesión
    await createSession(organizationId);
    
    // 2. Obtener QR
    const { qrCode } = await getQRCode(organizationId);
    console.log('QR Code:', qrCode);
    
    // 3. Verificar conexión (después de escanear QR)
    const status = await checkConnectionStatus(organizationId);
    if (status.connected) {
      console.log('✅ Conectado:', status.phone, status.name);
      
      // 4. Enviar mensaje de prueba
      const result = await sendTextMessage(
        organizationId,
        '+52 1 449 123 4567',
        '¡Hola! WhatsApp está conectado correctamente.'
      );
      
      if (result.sent) {
        console.log('✅ Mensaje enviado');
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## 🔐 Autenticación

El servicio usa automáticamente el header `X-Api-Key` con el valor de `WAHA_API_KEY` de las variables de entorno.

## 📋 Endpoints WAHA Utilizados

- `POST /api/sessions` - Crear sesión
- `GET /api/sessions/{name}` - Obtener sesión
- `POST /api/sessions/{name}/start` - Iniciar sesión
- `GET /api/{session}/auth/qr` - Obtener QR
- `GET /api/sessions/{name}/me` - Info de cuenta conectada
- `POST /api/sendText` - Enviar texto
- `POST /api/sendImage` - Enviar imagen
- `POST /api/sendFile` - Enviar archivo
- `POST /api/sessions/{name}/stop` - Detener sesión
- `DELETE /api/sessions/{name}` - Eliminar sesión

## ⚠️ Notas Importantes

1. **Formato de números**: Los números se formatean automáticamente a `{digits}@c.us`
2. **Sesiones**: Cada organización tiene una sesión única: `org_{organizationId}`
3. **Webhooks**: Al crear una sesión, se configura automáticamente el webhook del ERP
4. **QR Codes**: Expiran en ~60 segundos, necesitas regenerarlos si no se escanean
5. **Errores**: Todas las funciones incluyen manejo de errores y logging detallado











