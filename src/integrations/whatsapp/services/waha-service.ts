/**
 * WAHA SERVICE
 * 
 * Servicio para interactuar con WAHA (WhatsApp HTTP API)
 * Maneja sesiones, QR codes, envío de mensajes y gestión de conexiones
 */

interface WAHASession {
  name: string;
  status: 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'STOPPED';
  config?: {
    proxy?: string;
    webhooks?: Array<{
      url: string;
      events: string[];
    }>;
  };
}

interface WAHASessionInfo {
  name: string;
  status: string;
  me?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface WAHAMessageResponse {
  sent: boolean;
  messageId?: string;
  error?: string;
}

interface WAHAConnectionStatus {
  connected: boolean;
  phone?: string;
  name?: string;
  status?: string;
}

/**
 * Formatea un número de teléfono al formato de WhatsApp
 * Convierte: +52 1 449 123 4567 → 5214491234567@c.us
 */
export function formatPhoneNumber(phone: string): string {
  // Remover todos los caracteres no numéricos excepto el +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Si empieza con +, mantenerlo; si no, agregarlo
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  // Remover el + y convertir a formato WhatsApp
  const digits = cleaned.replace('+', '');
  
  // Formato: {countryCode}{number}@c.us
  return `${digits}@c.us`;
}

/**
 * Obtiene la URL base de WAHA desde variables de entorno
 */
function getWAHAUrl(): string {
  // Intentar obtener de diferentes fuentes
  const url = process.env.WAHA_API_URL || 
              process.env.NEXT_PUBLIC_WAHA_API_URL;
  
  if (!url) {
    const errorMsg = 'WAHA_API_URL no está configurada en las variables de entorno. ' +
      'Por favor, configura WAHA_API_URL en Vercel (Settings > Environment Variables) o en tu archivo .env.local';
    console.error('[WAHA Service] ❌', errorMsg);
    throw new Error(errorMsg);
  }
  return url.replace(/\/$/, ''); // Remover trailing slash
}

/**
 * Obtiene la API Key de WAHA desde variables de entorno
 */
function getWAHAKey(): string {
  // Intentar obtener de diferentes fuentes
  const key = process.env.WAHA_API_KEY || 
               process.env.NEXT_PUBLIC_WAHA_API_KEY;
  
  if (!key) {
    const errorMsg = 'WAHA_API_KEY no está configurada en las variables de entorno. ' +
      'Por favor, configura WAHA_API_KEY en Vercel (Settings > Environment Variables) o en tu archivo .env.local';
    console.error('[WAHA Service] ❌', errorMsg);
    throw new Error(errorMsg);
  }
  return key;
}

/**
 * Obtiene los headers para autenticación con WAHA
 */
function getWAHAHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': getWAHAKey()
  };
}

/**
 * Genera el nombre de sesión para una organización
 */
export function getSessionName(organizationId: string): string {
  return `org_${organizationId}`;
}

/**
 * 1. Crea una sesión de WAHA para una organización
 * Nombre de sesión: "org_{organizationId}"
 */
export async function createSession(organizationId: string): Promise<WAHASession> {
  try {
    const wahaUrl = getWAHAUrl();
    const sessionName = getSessionName(organizationId);
    
    console.log(`[WAHA] Creando sesión: ${sessionName}`);
    
    // Configurar webhook del ERP
    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const webhookUrl = `${appUrl}/api/webhooks/whatsapp/${organizationId}`;
    
    // Intentar crear la sesión primero (si WAHA soporta POST /api/sessions)
    // Si no existe ese endpoint, WAHA crea la sesión automáticamente al llamar /start
    try {
      const createResponse = await fetch(`${wahaUrl}/api/sessions`, {
        method: 'POST',
        headers: getWAHAHeaders(),
        body: JSON.stringify({
          name: sessionName,
          config: {
            proxy: null,
            webhooks: [
              {
                url: webhookUrl,
                events: ['message', 'message.any', 'status']
              }
            ]
          }
        })
      });

      if (createResponse.ok) {
        const session = await createResponse.json();
        console.log(`[WAHA] ✅ Sesión creada: ${sessionName}`);
        return session;
      }
    } catch (createError) {
      // Si el endpoint POST /api/sessions no existe, WAHA crea la sesión al iniciarla
      console.log(`[WAHA] Endpoint POST /api/sessions no disponible, usando /start para crear`);
    }
    
    // Si no se pudo crear directamente, usar /start que crea la sesión si no existe
    const startResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}/start`, {
      method: 'POST',
      headers: getWAHAHeaders(),
      body: JSON.stringify({
        config: {
          proxy: null,
          webhooks: [
            {
              url: webhookUrl,
              events: ['message', 'message.any', 'status']
            }
          ]
        }
      })
    });

    if (!startResponse.ok && startResponse.status !== 409) {
      // 409 = sesión ya existe, está bien
      const errorText = await startResponse.text();
      throw new Error(`Error creando/iniciando sesión: ${startResponse.status} - ${errorText}`);
    }

    // Obtener información de la sesión creada
    const sessionInfo = await getSession(sessionName);
    console.log(`[WAHA] ✅ Sesión creada/iniciada: ${sessionName}`, sessionInfo.status);
    
    return {
      name: sessionName,
      status: sessionInfo.status as any,
      config: {
        webhooks: [{
          url: webhookUrl,
          events: ['message', 'message.any', 'status']
        }]
      }
    };
  } catch (error) {
    console.error('[WAHA] ❌ Error creando sesión:', error);
    throw error;
  }
}

/**
 * 2. Obtiene información de una sesión
 */
export async function getSession(sessionName: string): Promise<WAHASessionInfo> {
  try {
    const wahaUrl = getWAHAUrl();
    
    console.log(`[WAHA] Obteniendo sesión: ${sessionName}`);
    
    const response = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      method: 'GET',
      headers: getWAHAHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Sesión ${sessionName} no encontrada`);
      }
      const errorText = await response.text();
      throw new Error(`Error obteniendo sesión: ${response.status} - ${errorText}`);
    }

    const session = await response.json();
    console.log(`[WAHA] ✅ Sesión obtenida: ${sessionName}`, session.status);
    
    return session;
  } catch (error) {
    console.error('[WAHA] ❌ Error obteniendo sesión:', error);
    throw error;
  }
}

/**
 * 3. Obtiene el código QR para vincular WhatsApp
 */
export async function getQRCode(organizationId: string): Promise<{
  qrCode: string;
  sessionName: string;
  expiresIn: number;
}> {
  try {
    const wahaUrl = getWAHAUrl();
    const sessionName = getSessionName(organizationId);
    
    console.log(`[WAHA] Obteniendo QR para: ${sessionName}`);
    
    // Primero verificar si la sesión existe, si no, crearla
    let sessionExists = false;
    try {
      await getSession(sessionName);
      sessionExists = true;
    } catch (error: any) {
      if (error.message?.includes('no encontrada')) {
        console.log(`[WAHA] Sesión no existe, creando...`);
        await createSession(organizationId);
        // Esperar un momento para que la sesión se inicialice
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
    
    // Iniciar sesión si no está iniciada
    try {
      await fetch(`${wahaUrl}/api/sessions/${sessionName}/start`, {
        method: 'POST',
        headers: getWAHAHeaders()
      });
      // Esperar un momento para que se inicialice
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error: any) {
      // Si ya está iniciada, está bien
      if (!error.message?.includes('already started')) {
        console.warn('[WAHA] Advertencia al iniciar sesión:', error.message);
      }
    }
    
    // Obtener QR code
    const qrResponse = await fetch(`${wahaUrl}/api/${sessionName}/auth/qr`, {
      method: 'GET',
      headers: getWAHAHeaders()
    });

    if (!qrResponse.ok) {
      // Verificar si la sesión ya está conectada
      const sessionInfo = await getSession(sessionName);
      if (sessionInfo.status === 'WORKING' || sessionInfo.status === 'connected') {
        throw new Error('Sesión ya conectada. No se necesita QR.');
      }
      
      const errorText = await qrResponse.text();
      throw new Error(`Error obteniendo QR: ${qrResponse.status} - ${errorText}`);
    }

    const qrData = await qrResponse.json();
    
    console.log(`[WAHA] 📦 Respuesta QR de WAHA:`, {
      hasQr: !!qrData.qr,
      hasQrcode: !!qrData.qrcode,
      hasQrCode: !!qrData.qrCode,
      keys: Object.keys(qrData),
      qrType: typeof qrData.qr,
      qrPreview: typeof qrData.qr === 'string' ? qrData.qr.substring(0, 50) : 'not a string'
    });
    
    // WAHA puede retornar el QR en diferentes formatos
    let qrCode = qrData.qr || qrData.qrcode || qrData.qrCode || qrData;
    
    // Si es un objeto, extraer el base64
    if (typeof qrCode === 'object') {
      if (qrCode.base64) {
        qrCode = qrCode.base64;
      } else if (qrCode.qr) {
        qrCode = qrCode.qr;
      } else {
        // Intentar convertir el objeto a string
        qrCode = JSON.stringify(qrCode);
      }
    }
    
    // Si el QR es una string pero no tiene el prefijo data:image, puede ser base64 puro
    // No agregamos el prefijo aquí porque el componente lo hará si es necesario
    // Pero sí validamos que sea base64 válido
    if (typeof qrCode === 'string') {
      // Remover espacios en blanco y saltos de línea
      qrCode = qrCode.trim().replace(/\s/g, '');
      
      // Si ya tiene el prefijo data:image, dejarlo así
      if (qrCode.startsWith('data:image')) {
        console.log(`[WAHA] ✅ QR ya tiene prefijo data:image`);
      } else if (qrCode.match(/^[A-Za-z0-9+/=]+$/)) {
        // Es base64 válido sin prefijo
        console.log(`[WAHA] ✅ QR es base64 válido (sin prefijo)`);
      } else {
        console.warn(`[WAHA] ⚠️ QR en formato desconocido:`, qrCode.substring(0, 50));
      }
    }
    
    console.log(`[WAHA] ✅ QR procesado para: ${sessionName}`, {
      qrLength: typeof qrCode === 'string' ? qrCode.length : 0,
      hasDataPrefix: typeof qrCode === 'string' && qrCode.startsWith('data:image')
    });
    
    return {
      qrCode: qrCode as string,
      sessionName,
      expiresIn: 60 // WAHA QR codes expiran en ~60 segundos
    };
  } catch (error) {
    console.error('[WAHA] ❌ Error obteniendo QR:', error);
    throw error;
  }
}

/**
 * 4. Verifica el estado de conexión de WhatsApp
 * Retorna phone y name si está conectado
 */
export async function checkConnectionStatus(organizationId: string): Promise<WAHAConnectionStatus> {
  try {
    const wahaUrl = getWAHAUrl();
    const sessionName = getSessionName(organizationId);
    
    // Primero verificar el estado de la sesión
    const sessionInfo = await getSession(sessionName);
    const isConnected = sessionInfo.status === 'WORKING' || sessionInfo.status === 'connected';
    
    if (!isConnected) {
      return {
        connected: false,
        status: sessionInfo.status
      };
    }
    
    // Si está conectada, obtener información de la cuenta
    try {
      const meResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}/me`, {
        method: 'GET',
        headers: getWAHAHeaders()
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        return {
          connected: true,
          phone: meData.phone || meData.id?.split('@')[0] || undefined,
          name: meData.name || meData.pushname || undefined,
          status: sessionInfo.status
        };
      }
    } catch (meError) {
      console.warn('[WAHA] No se pudo obtener info de cuenta, usando datos de sesión:', meError);
    }
    
    // Fallback: usar datos de sessionInfo si están disponibles
    if (sessionInfo.me) {
      return {
        connected: true,
        phone: sessionInfo.me.phone,
        name: sessionInfo.me.name,
        status: sessionInfo.status
      };
    }
    
    return {
      connected: true,
      status: sessionInfo.status
    };
  } catch (error: any) {
    if (error.message?.includes('no encontrada')) {
      return {
        connected: false,
        status: 'NOT_FOUND'
      };
    }
    console.error('[WAHA] ❌ Error verificando conexión:', error);
    throw error;
  }
}

/**
 * 5. Envía un mensaje de texto
 */
export async function sendTextMessage(
  organizationId: string,
  to: string,
  text: string
): Promise<WAHAMessageResponse> {
  try {
    const wahaUrl = getWAHAUrl();
    const sessionName = getSessionName(organizationId);
    const formattedPhone = formatPhoneNumber(to);
    
    console.log(`[WAHA] Enviando mensaje de texto desde ${sessionName} a ${formattedPhone}`);
    
    const response = await fetch(`${wahaUrl}/api/sendText`, {
      method: 'POST',
      headers: getWAHAHeaders(),
      body: JSON.stringify({
        session: sessionName,
        chatId: formattedPhone,
        text: text
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error enviando mensaje: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[WAHA] ✅ Mensaje enviado: ${result.messageId || 'OK'}`);
    
    return {
      sent: true,
      messageId: result.messageId || result.id
    };
  } catch (error) {
    console.error('[WAHA] ❌ Error enviando mensaje:', error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * 6. Envía una imagen
 */
export async function sendImage(
  organizationId: string,
  to: string,
  imageUrl: string,
  caption?: string
): Promise<WAHAMessageResponse> {
  try {
    const wahaUrl = getWAHAUrl();
    const sessionName = getSessionName(organizationId);
    const formattedPhone = formatPhoneNumber(to);
    
    console.log(`[WAHA] Enviando imagen desde ${sessionName} a ${formattedPhone}`);
    
    const response = await fetch(`${wahaUrl}/api/sendImage`, {
      method: 'POST',
      headers: getWAHAHeaders(),
      body: JSON.stringify({
        session: sessionName,
        chatId: formattedPhone,
        url: imageUrl,
        caption: caption || ''
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error enviando imagen: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[WAHA] ✅ Imagen enviada: ${result.messageId || 'OK'}`);
    
    return {
      sent: true,
      messageId: result.messageId || result.id
    };
  } catch (error) {
    console.error('[WAHA] ❌ Error enviando imagen:', error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * 7. Envía un archivo
 */
export async function sendFile(
  organizationId: string,
  to: string,
  fileUrl: string,
  filename: string,
  caption?: string
): Promise<WAHAMessageResponse> {
  try {
    const wahaUrl = getWAHAUrl();
    const sessionName = getSessionName(organizationId);
    const formattedPhone = formatPhoneNumber(to);
    
    console.log(`[WAHA] Enviando archivo desde ${sessionName} a ${formattedPhone}`);
    
    const response = await fetch(`${wahaUrl}/api/sendFile`, {
      method: 'POST',
      headers: getWAHAHeaders(),
      body: JSON.stringify({
        session: sessionName,
        chatId: formattedPhone,
        url: fileUrl,
        filename: filename,
        caption: caption || ''
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error enviando archivo: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`[WAHA] ✅ Archivo enviado: ${result.messageId || 'OK'}`);
    
    return {
      sent: true,
      messageId: result.messageId || result.id
    };
  } catch (error) {
    console.error('[WAHA] ❌ Error enviando archivo:', error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

/**
 * 8. Desconecta una sesión (detiene pero no elimina)
 */
export async function disconnectSession(organizationId: string): Promise<void> {
  try {
    const wahaUrl = getWAHAUrl();
    const sessionName = getSessionName(organizationId);
    
    console.log(`[WAHA] Desconectando sesión: ${sessionName}`);
    
    const response = await fetch(`${wahaUrl}/api/sessions/${sessionName}/stop`, {
      method: 'POST',
      headers: getWAHAHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[WAHA] Sesión ${sessionName} no encontrada para desconectar`);
        return; // No es un error si no existe
      }
      const errorText = await response.text();
      throw new Error(`Error desconectando sesión: ${response.status} - ${errorText}`);
    }

    console.log(`[WAHA] ✅ Sesión desconectada: ${sessionName}`);
  } catch (error) {
    console.error('[WAHA] ❌ Error desconectando sesión:', error);
    throw error;
  }
}

/**
 * 9. Elimina una sesión completamente
 */
export async function deleteSession(organizationId: string): Promise<void> {
  try {
    const wahaUrl = getWAHAUrl();
    const sessionName = getSessionName(organizationId);
    
    console.log(`[WAHA] Eliminando sesión: ${sessionName}`);
    
    // Primero desconectar si está conectada
    try {
      await disconnectSession(organizationId);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      // Ignorar errores al desconectar, puede que ya esté desconectada
      console.warn('[WAHA] Advertencia al desconectar antes de eliminar:', error);
    }
    
    const response = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      method: 'DELETE',
      headers: getWAHAHeaders()
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[WAHA] Sesión ${sessionName} no encontrada para eliminar`);
        return; // No es un error si no existe
      }
      const errorText = await response.text();
      throw new Error(`Error eliminando sesión: ${response.status} - ${errorText}`);
    }

    console.log(`[WAHA] ✅ Sesión eliminada: ${sessionName}`);
  } catch (error) {
    console.error('[WAHA] ❌ Error eliminando sesión:', error);
    throw error;
  }
}

