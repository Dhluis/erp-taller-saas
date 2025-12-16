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
 * Obtiene la configuración de WAHA desde variables de entorno O desde la base de datos
 * SOLUCIÓN DEFINITIVA: Si las variables de entorno no están disponibles, lee de la BD
 */
async function getWAHAConfig(organizationId?: string): Promise<{ url: string; key: string }> {
  // 1. PRIMERO: Intentar desde variables de entorno (más rápido)
  // NOTA: NO usar NEXT_PUBLIC_* para claves secretas, solo para URLs públicas si es necesario
  const envUrl = process.env.WAHA_API_URL;
  const envKey = process.env.WAHA_API_KEY;
  
  // Log detallado para diagnóstico
  console.log('[WAHA Service] 🔍 Verificando variables de entorno:', {
    hasWAHA_API_URL: !!envUrl,
    hasWAHA_API_KEY: !!envKey,
    urlLength: envUrl?.length || 0,
    keyLength: envKey?.length || 0,
    urlPreview: envUrl ? `${envUrl.substring(0, 30)}...` : 'NO URL',
    keyPreview: envKey ? `${envKey.substring(0, 5)}...` : 'NO KEY',
    allEnvKeys: Object.keys(process.env).filter(k => k.includes('WAHA')).join(', ')
  });
  
  if (envUrl && envKey) {
    console.log('[WAHA Service] ✅ Usando configuración de variables de entorno');
    console.log('[WAHA Service] ✅ URL:', envUrl.replace(/\/$/, ''));
    console.log('[WAHA Service] ✅ Key:', envKey.substring(0, 10) + '...');
    return {
      url: envUrl.replace(/\/$/, ''),
      key: envKey
    };
  }
  
  // 2. SEGUNDO: Si no hay variables de entorno, leer de la base de datos
  if (organizationId) {
    try {
      console.log('[WAHA Service] ⚠️ Variables de entorno no disponibles, intentando leer de BD...');
      console.log('[WAHA Service] 🔍 Organization ID:', organizationId);
      const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
      const supabase = getSupabaseServiceClient();
      
      const { data: config, error } = await supabase
        .from('ai_agent_config')
        .select('policies, whatsapp_session_name')
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        console.error('[WAHA Service] ❌ Error leyendo de BD:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
      } else if (config) {
        console.log('[WAHA Service] 📋 Configuración encontrada en BD');
        // Intentar leer de policies (JSONB)
        const policies = (config as any)?.policies;
        console.log('[WAHA Service] 🔍 Policies keys:', policies ? Object.keys(policies) : 'null');
        
        // Buscar en ambos formatos (minúsculas y mayúsculas) para compatibilidad
        const dbUrl = policies?.waha_api_url || policies?.WAHA_API_URL;
        const dbKey = policies?.waha_api_key || policies?.WAHA_API_KEY;
        
        console.log('[WAHA Service] 🔍 Valores encontrados:', {
          hasUrl: !!dbUrl,
          hasKey: !!dbKey,
          urlPreview: dbUrl ? `${dbUrl.substring(0, 30)}...` : 'NO URL',
          keyPreview: dbKey ? `${dbKey.substring(0, 10)}...` : 'NO KEY',
          foundKeys: {
            waha_api_url: !!policies?.waha_api_url,
            WAHA_API_URL: !!policies?.WAHA_API_URL,
            waha_api_key: !!policies?.waha_api_key,
            WAHA_API_KEY: !!policies?.WAHA_API_KEY
          }
        });
        
        if (dbUrl && dbKey) {
          console.log('[WAHA Service] ✅ Usando configuración de base de datos');
          console.log('[WAHA Service] ✅ URL encontrada:', dbUrl.substring(0, 50) + '...');
          console.log('[WAHA Service] ✅ Key encontrada:', dbKey.substring(0, 10) + '...');
          return {
            url: dbUrl.replace(/\/$/, ''),
            key: dbKey
          };
        } else {
          console.warn('[WAHA Service] ⚠️ Configuración encontrada pero faltan waha_api_url o waha_api_key');
          console.warn('[WAHA Service] ⚠️ Policies completo:', JSON.stringify(policies, null, 2));
          console.warn('[WAHA Service] ⚠️ Keys en policies:', policies ? Object.keys(policies) : 'null');
          console.warn('[WAHA Service] ⚠️ Valores específicos:', {
            'policies.waha_api_url': policies?.waha_api_url ? 'EXISTE' : 'NO EXISTE',
            'policies.WAHA_API_URL': policies?.WAHA_API_URL ? 'EXISTE' : 'NO EXISTE',
            'policies.waha_api_key': policies?.waha_api_key ? 'EXISTE' : 'NO EXISTE',
            'policies.WAHA_API_KEY': policies?.WAHA_API_KEY ? 'EXISTE' : 'NO EXISTE'
          });
        }
      } else {
        console.warn('[WAHA Service] ⚠️ No se encontró configuración en BD para organization_id:', organizationId);
        console.warn('[WAHA Service] ⚠️ Esto puede significar que:');
        console.warn('[WAHA Service]   1. No se ha guardado configuración en ai_agent_config');
        console.warn('[WAHA Service]   2. El organization_id no coincide');
        console.warn('[WAHA Service]   3. Hay un problema de permisos RLS');
      }
    } catch (dbError: any) {
      console.error('[WAHA Service] ❌ Error leyendo configuración de BD:', {
        message: dbError?.message,
        stack: dbError?.stack,
        name: dbError?.name
      });
    }
  } else {
    console.warn('[WAHA Service] ⚠️ No se proporcionó organizationId, no se puede leer de BD');
  }
  
  // 3. Si nada funciona, lanzar error amigable (sin mencionar WAHA)
  const errorMsg = 'Configuración del servidor de WhatsApp no encontrada';
  console.error('[WAHA Service] ❌ Configuración faltante - detalles técnicos:', {
    hasEnvVars: !!(process.env.WAHA_API_URL && process.env.WAHA_API_KEY),
    organizationId: organizationId || 'no proporcionado',
    hint: 'La configuración debe estar en variables de entorno o en la base de datos (policies.waha_api_url y policies.waha_api_key)'
  });
  throw new Error(errorMsg);
}

/**
 * Obtiene la URL base de WAHA desde variables de entorno O base de datos
 */
async function getWAHAUrl(organizationId?: string): Promise<string> {
  const config = await getWAHAConfig(organizationId);
  return config.url;
}

/**
 * Obtiene la API Key de WAHA desde variables de entorno O base de datos
 */
async function getWAHAKey(organizationId?: string): Promise<string> {
  const config = await getWAHAConfig(organizationId);
  return config.key;
}

/**
 * Obtiene los headers para autenticación con WAHA
 */
async function getWAHAHeaders(organizationId?: string): Promise<HeadersInit> {
  const key = await getWAHAKey(organizationId);
  return {
    'Content-Type': 'application/json',
    'X-Api-Key': key
  };
}

/**
 * Genera el nombre de sesión para una organización
 * 
 * NOTA: WAHA Core solo soporta la sesión "default"
 * Para multi-tenant con WAHA Plus, usar: return `org_${organizationId}`;
 */
export function getSessionName(organizationId: string): string {
  // WAHA Core solo soporta la sesión "default"
  // Para multi-tenant con WAHA Plus, usar: return `org_${organizationId}`;
  return 'default';
}

/**
 * 1. Crea una sesión de WAHA para una organización
 * Nombre de sesión: "org_{organizationId}"
 */
export async function createSession(organizationId: string): Promise<WAHASession> {
  try {
    const wahaUrl = await getWAHAUrl(organizationId);
    const sessionName = getSessionName(organizationId);
    
    console.log(`[WAHA] Creando sesión: ${sessionName}`);
    
    // Configurar webhook del ERP
    const { getAppUrl } = await import('@/lib/config/env')
    const appUrl = getAppUrl()
    const webhookUrl = `${appUrl}/api/webhooks/whatsapp/${organizationId}`;
    
    // Intentar crear la sesión primero (si WAHA soporta POST /api/sessions)
    // Si no existe ese endpoint, WAHA crea la sesión automáticamente al llamar /start
    try {
      const createResponse = await fetch(`${wahaUrl}/api/sessions`, {
        method: 'POST',
        headers: await getWAHAHeaders(organizationId),
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
      headers: await getWAHAHeaders(organizationId),
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
    const sessionInfo = await getSession(sessionName, organizationId);
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
export async function getSession(sessionName: string, organizationId?: string): Promise<WAHASessionInfo> {
  try {
    const wahaUrl = await getWAHAUrl(organizationId);
    
    console.log(`[WAHA] Obteniendo sesión: ${sessionName}`);
    
    const response = await fetch(`${wahaUrl}/api/sessions/${sessionName}`, {
      method: 'GET',
      headers: await getWAHAHeaders(organizationId)
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
 * 2.1. Lista todas las sesiones disponibles en WAHA
 */
export async function listSessions(organizationId?: string): Promise<WAHASessionInfo[]> {
  try {
    const wahaUrl = await getWAHAUrl(organizationId);
    
    console.log(`[WAHA] Listando todas las sesiones...`);
    
    const response = await fetch(`${wahaUrl}/api/sessions`, {
      method: 'GET',
      headers: await getWAHAHeaders(organizationId)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error listando sesiones: ${response.status} - ${errorText}`);
    }

    const sessions = await response.json();
    console.log(`[WAHA] ✅ Sesiones encontradas: ${sessions.length}`, sessions.map((s: any) => ({ name: s.name, status: s.status })));
    
    return Array.isArray(sessions) ? sessions : [];
  } catch (error) {
    console.error('[WAHA] ❌ Error listando sesiones:', error);
    return [];
  }
}

/**
 * 2.2. Busca una sesión WORKING existente (puede ser "default" u otra)
 */
export async function findWorkingSession(organizationId?: string): Promise<WAHASessionInfo | null> {
  try {
    const sessions = await listSessions(organizationId);
    
    // Buscar sesión "default" primero (común en WAHA)
    const defaultSession = sessions.find((s: any) => s.name === 'default' && (s.status === 'WORKING' || s.status === 'connected'));
    if (defaultSession) {
      console.log(`[WAHA] ✅ Sesión "default" encontrada y WORKING`);
      return defaultSession;
    }
    
    // Buscar cualquier sesión WORKING
    const workingSession = sessions.find((s: any) => s.status === 'WORKING' || s.status === 'connected');
    if (workingSession) {
      console.log(`[WAHA] ✅ Sesión WORKING encontrada: ${workingSession.name}`);
      return workingSession;
    }
    
    console.log(`[WAHA] ℹ️ No se encontró ninguna sesión WORKING`);
    return null;
  } catch (error) {
    console.error('[WAHA] ❌ Error buscando sesión WORKING:', error);
    return null;
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
    const wahaUrl = await getWAHAUrl(organizationId);
    const sessionName = getSessionName(organizationId);
    
    console.log(`[WAHA] Obteniendo QR para: ${sessionName}`);
    
    // PRIMERO: Verificar si hay una sesión WORKING existente (como "default")
    const workingSession = await findWorkingSession(organizationId);
    if (workingSession) {
      console.log(`[WAHA] ⚠️ Ya existe una sesión WORKING: ${workingSession.name}`);
      throw new Error('Sesión ya conectada. No se necesita QR.');
    }
    
    // SEGUNDO: Verificar si la sesión específica de la organización existe
    let sessionExists = false;
    try {
      const existingSession = await getSession(sessionName, organizationId);
      sessionExists = true;
      
      // Si la sesión ya está WORKING, no se puede obtener QR
      if (existingSession.status === 'WORKING' || existingSession.status === 'connected') {
        throw new Error('Sesión ya conectada. No se necesita QR.');
      }
    } catch (error: any) {
      if (error.message?.includes('no encontrada') || error.message?.includes('not found')) {
        console.log(`[WAHA] Sesión ${sessionName} no existe, creando...`);
        await createSession(organizationId);
        // Esperar un momento para que la sesión se inicialice
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else if (error.message?.includes('ya conectada')) {
        throw error;
      } else {
        throw error;
      }
    }
    
    // Verificar estado de la sesión e iniciarla si está detenida
    let sessionInfo;
    try {
      sessionInfo = await getSession(sessionName, organizationId);
      console.log(`[WAHA] Estado actual de sesión: ${sessionInfo.status}`);
      
      // Si la sesión está STOPPED o FAILED, iniciarla
      if (sessionInfo.status === 'STOPPED' || sessionInfo.status === 'FAILED') {
        console.log(`[WAHA] Sesión está ${sessionInfo.status}, iniciando...`);
        
        // Si está en FAILED, intentar restart primero para limpiar el estado
        if (sessionInfo.status === 'FAILED') {
          console.log(`[WAHA] Sesión en FAILED, intentando restart...`);
          try {
            const restartResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}/restart`, {
              method: 'POST',
              headers: await getWAHAHeaders(organizationId)
            });
            
            if (restartResponse.ok) {
              console.log(`[WAHA] ✅ Sesión reiniciada, esperando a que esté lista...`);
              // Esperar más tiempo después de restart
              await new Promise(resolve => setTimeout(resolve, 3000));
            } else {
              console.warn(`[WAHA] Restart no disponible o falló, intentando start...`);
            }
          } catch (restartError) {
            console.warn(`[WAHA] Error en restart, intentando start normal:`, restartError);
          }
        }
        
        // Iniciar la sesión
        const startResponse = await fetch(`${wahaUrl}/api/sessions/${sessionName}/start`, {
          method: 'POST',
          headers: await getWAHAHeaders(organizationId)
        });
        
        if (!startResponse.ok && startResponse.status !== 409) {
          // 409 = sesión ya iniciada, está bien
          const errorText = await startResponse.text();
          console.warn(`[WAHA] Error al iniciar sesión: ${startResponse.status} - ${errorText}`);
        } else {
          console.log(`[WAHA] ✅ Sesión iniciada, esperando a que esté lista...`);
        }
        
        // Esperar a que la sesión cambie de estado a SCAN_QR_CODE
        let attempts = 0;
        const maxAttempts = 15; // 15 intentos = ~22 segundos (más tiempo para FAILED)
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          try {
            sessionInfo = await getSession(sessionName, organizationId);
            console.log(`[WAHA] Estado después de iniciar (intento ${attempts + 1}): ${sessionInfo.status}`);
            
            // Si está en SCAN_QR_CODE, está lista para QR
            if (sessionInfo.status === 'SCAN_QR_CODE') {
              console.log(`[WAHA] ✅ Sesión lista para QR (SCAN_QR_CODE)`);
              break;
            }
            
            // Si está WORKING, ya está conectada
            if (sessionInfo.status === 'WORKING') {
              throw new Error('Sesión ya conectada. No se necesita QR.');
            }
            
            // Si sigue FAILED después de varios intentos, puede haber un problema
            if (attempts >= 8 && sessionInfo.status === 'FAILED') {
              console.warn(`[WAHA] ⚠️ Sesión sigue en FAILED después de ${attempts} intentos`);
              // Intentar restart una vez más
              try {
                await fetch(`${wahaUrl}/api/sessions/${sessionName}/restart`, {
                  method: 'POST',
                  headers: await getWAHAHeaders(organizationId)
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
                attempts = 0; // Reiniciar contador
                continue;
              } catch (retryError) {
                throw new Error('La sesión no se pudo iniciar después de múltiples intentos. Verifica que WAHA esté funcionando correctamente.');
              }
            }
            
            // Si sigue STOPPED después de varios intentos, puede haber un problema
            if (attempts >= 10 && sessionInfo.status === 'STOPPED') {
              throw new Error('La sesión no se pudo iniciar. Verifica que WAHA esté funcionando correctamente.');
            }
          } catch (error: any) {
            if (error.message?.includes('no encontrada')) {
              throw error;
            }
            if (error.message?.includes('ya conectada')) {
              throw error;
            }
            console.warn(`[WAHA] Error verificando estado (intento ${attempts + 1}):`, error.message);
          }
          
          attempts++;
        }
        
        // Verificar estado final antes de obtener QR
        sessionInfo = await getSession(sessionName, organizationId);
        if (sessionInfo.status !== 'SCAN_QR_CODE' && sessionInfo.status !== 'WORKING') {
          throw new Error(`La sesión no está lista para QR. Estado actual: ${sessionInfo.status}. Intenta nuevamente en unos momentos.`);
        }
      } else if (sessionInfo.status === 'WORKING') {
        // Si ya está conectada, no se puede obtener QR
        throw new Error('Sesión ya conectada. No se necesita QR.');
      }
    } catch (error: any) {
      // Si el error es que la sesión no existe, crearla
      if (error.message?.includes('no encontrada') || error.message?.includes('not found')) {
        console.log(`[WAHA] Sesión no existe, creando...`);
        await createSession(organizationId);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else if (!error.message?.includes('ya conectada')) {
        // Si no es un error de "ya conectada", reintentar iniciar
        console.log(`[WAHA] Reintentando iniciar sesión...`);
        try {
          await fetch(`${wahaUrl}/api/sessions/${sessionName}/start`, {
            method: 'POST',
            headers: await getWAHAHeaders(organizationId)
          });
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (startError: any) {
          console.warn('[WAHA] Error al reiniciar sesión:', startError.message);
        }
      } else {
        throw error;
      }
    }
    
    // Obtener QR code con formato raw (devuelve JSON con base64)
    // format=raw devuelve: { "mimetype": "image/png", "data": "base64string..." }
    const qrUrl = `${wahaUrl}/api/${sessionName}/auth/qr?format=raw`;
    console.log(`[WAHA] 🔍 URL de QR: ${qrUrl}`);
    
    const qrResponse = await fetch(qrUrl, {
      method: 'GET',
      headers: await getWAHAHeaders(organizationId)
    });

    console.log(`[WAHA] 📡 QR Response Status: ${qrResponse.status}`);
    console.log(`[WAHA] 📡 QR Response Headers:`, Object.fromEntries(qrResponse.headers.entries()));
    console.log(`[WAHA] 📡 QR Response Content-Type:`, qrResponse.headers.get('content-type'));

    if (!qrResponse.ok) {
      // Verificar si la sesión ya está conectada
      const sessionInfo = await getSession(sessionName, organizationId);
      if (sessionInfo.status === 'WORKING' || sessionInfo.status === 'connected') {
        throw new Error('Sesión ya conectada. No se necesita QR.');
      }
      
      const errorText = await qrResponse.text();
      console.error(`[WAHA] ❌ Error obteniendo QR: ${qrResponse.status} - ${errorText}`);
      throw new Error(`Error obteniendo QR: ${qrResponse.status} - ${errorText}`);
    }

    // Leer el body como texto primero para debug
    const responseText = await qrResponse.text();
    console.log(`[WAHA] 📦 QR Response Body (primeros 500 chars):`, responseText.substring(0, 500));
    console.log(`[WAHA] 📦 QR Response Body Length:`, responseText.length);
    console.log(`[WAHA] 📦 QR Response Body Type:`, typeof responseText);

    // Intentar parsear como JSON
    let qrData: any;
    try {
      qrData = JSON.parse(responseText);
      console.log(`[WAHA] ✅ QR Response parseado como JSON exitosamente`);
    } catch (parseError: any) {
      console.error(`[WAHA] ❌ Error parseando QR Response como JSON:`, parseError.message);
      console.error(`[WAHA] ❌ Response Text completo:`, responseText);
      throw new Error(`Error parseando respuesta de QR como JSON. Content-Type: ${qrResponse.headers.get('content-type')}, Body preview: ${responseText.substring(0, 200)}`);
    }
    
    console.log(`[WAHA] 📦 Respuesta QR de WAHA (format=raw):`, {
      hasMimetype: !!qrData.mimetype,
      hasData: !!qrData.data,
      hasValue: !!qrData.value,
      mimetype: qrData.mimetype,
      dataLength: qrData.data?.length || 0,
      valueLength: qrData.value?.length || 0,
      dataPreview: qrData.data ? qrData.data.substring(0, 50) + '...' : 'NO DATA',
      valuePreview: qrData.value ? qrData.value.substring(0, 50) + '...' : 'NO VALUE',
      keys: Object.keys(qrData)
    });
    
    // Extraer datos del QR
    let qrCode: string;
    let mimetype = 'image/png'; // Por defecto
    let isQRString = false; // Indica si es un string que debe convertirse a QR
    
    console.log(`[WAHA] 🔍 Analizando estructura de QR Data:`, {
      keys: Object.keys(qrData),
      hasMimetype: !!qrData.mimetype,
      hasData: !!qrData.data,
      hasValue: !!qrData.value,
      hasQr: !!qrData.qr,
      hasQrcode: !!qrData.qrcode,
      hasQrCode: !!qrData.qrCode,
      hasBase64: !!qrData.base64,
      isString: typeof qrData === 'string',
      fullStructure: JSON.stringify(qrData).substring(0, 500)
    });
    
    // NUEVO FORMATO: WAHA devuelve { "value": "2@lGKFF..." } - string que debe convertirse a QR
    if (qrData.value && typeof qrData.value === 'string') {
      qrCode = qrData.value;
      isQRString = true;
      console.log(`[WAHA] ✅ QR obtenido en formato 'value' (string para convertir a QR): length=${qrCode.length}`);
    }
    // Formato raw de WAHA: { "mimetype": "image/png", "data": "base64..." }
    else if (qrData.mimetype && qrData.data) {
      mimetype = qrData.mimetype;
      qrCode = qrData.data;
      console.log(`[WAHA] ✅ QR obtenido en formato raw: ${mimetype}, data length: ${qrCode.length}`);
    } 
    // Compatibilidad con otros formatos (por si acaso)
    else if (qrData.qr || qrData.qrcode || qrData.qrCode) {
      qrCode = qrData.qr || qrData.qrcode || qrData.qrCode;
      console.log(`[WAHA] ⚠️ QR en formato alternativo (compatibilidad)`);
    }
    // Si es un string directo
    else if (typeof qrData === 'string') {
      qrCode = qrData;
      console.log(`[WAHA] ⚠️ QR es string directo`);
    }
    // Si tiene base64 directamente
    else if (qrData.base64) {
      qrCode = qrData.base64;
      console.log(`[WAHA] ⚠️ QR tiene base64 directo`);
    }
    else {
      console.error(`[WAHA] ❌ Formato de QR no reconocido. Estructura completa:`, JSON.stringify(qrData, null, 2));
      throw new Error(`Formato de QR no reconocido en la respuesta de WAHA. Keys encontrados: ${Object.keys(qrData).join(', ')}. Estructura: ${JSON.stringify(qrData).substring(0, 300)}`);
    }
    
    // Si es un string que debe convertirse a QR (formato 'value'), devolverlo tal cual
    if (isQRString) {
      console.log(`[WAHA] ✅ QR en formato string (value), devolviendo para conversión en frontend`);
      return {
        qrCode: qrCode.trim(),
        sessionName,
        expiresIn: 60 // WAHA QR codes expiran en ~60 segundos
      };
    }
    
    // Limpiar y formatear el base64 (solo para formatos antiguos)
    if (typeof qrCode === 'string') {
      // Remover espacios en blanco y saltos de línea
      qrCode = qrCode.trim().replace(/\s/g, '');
      
      // Construir data URI completo: data:image/png;base64,{base64}
      if (!qrCode.startsWith('data:')) {
        qrCode = `data:${mimetype};base64,${qrCode}`;
        console.log(`[WAHA] ✅ QR formateado como data URI: data:${mimetype};base64,...`);
      } else {
        console.log(`[WAHA] ✅ QR ya tiene formato data URI`);
      }
    } else {
      throw new Error('QR code no es un string válido');
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
 * Primero busca sesiones WORKING existentes (como "default"), luego la sesión específica de la organización
 */
export async function checkConnectionStatus(organizationId: string): Promise<WAHAConnectionStatus> {
  try {
    const wahaUrl = await getWAHAUrl(organizationId);
    const sessionName = getSessionName(organizationId);
    
    // Primero, buscar si hay una sesión WORKING existente (como "default")
    const workingSession = await findWorkingSession(organizationId);
    if (workingSession) {
      console.log(`[WAHA] ✅ Usando sesión WORKING existente: ${workingSession.name}`);
      
      // Obtener información de la cuenta de la sesión WORKING
      try {
        const meResponse = await fetch(`${wahaUrl}/api/sessions/${workingSession.name}/me`, {
          method: 'GET',
          headers: await getWAHAHeaders(organizationId)
        });

        if (meResponse.ok) {
          const meData = await meResponse.json();
          return {
            connected: true,
            phone: meData.phone || meData.id?.split('@')[0] || undefined,
            name: meData.name || meData.pushname || undefined,
            status: workingSession.status
          };
        }
      } catch (meError) {
        console.warn('[WAHA] No se pudo obtener info de cuenta de sesión WORKING:', meError);
      }
      
      // Fallback: usar datos de workingSession si están disponibles
      if (workingSession.me) {
        return {
          connected: true,
          phone: workingSession.me.phone,
          name: workingSession.me.name,
          status: workingSession.status
        };
      }
      
      return {
        connected: true,
        status: workingSession.status
      };
    }
    
    // Si no hay sesión WORKING existente, verificar la sesión específica de la organización
    try {
      const sessionInfo = await getSession(sessionName, organizationId);
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
          headers: await getWAHAHeaders(organizationId)
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
    } catch (sessionError: any) {
      if (sessionError.message?.includes('no encontrada')) {
        return {
          connected: false,
          status: 'NOT_FOUND'
        };
      }
      throw sessionError;
    }
  } catch (error: any) {
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
    const wahaUrl = await getWAHAUrl(organizationId);
    const sessionName = getSessionName(organizationId);
    const formattedPhone = formatPhoneNumber(to);
    
    console.log(`[WAHA] Enviando mensaje de texto desde ${sessionName} a ${formattedPhone}`);
    
    const response = await fetch(`${wahaUrl}/api/sendText`, {
      method: 'POST',
      headers: await getWAHAHeaders(organizationId),
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
    const wahaUrl = await getWAHAUrl(organizationId);
    const sessionName = getSessionName(organizationId);
    const formattedPhone = formatPhoneNumber(to);
    
    console.log(`[WAHA] Enviando imagen desde ${sessionName} a ${formattedPhone}`);
    
    const response = await fetch(`${wahaUrl}/api/sendImage`, {
      method: 'POST',
      headers: await getWAHAHeaders(organizationId),
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
    const wahaUrl = await getWAHAUrl(organizationId);
    const sessionName = getSessionName(organizationId);
    const formattedPhone = formatPhoneNumber(to);
    
    console.log(`[WAHA] Enviando archivo desde ${sessionName} a ${formattedPhone}`);
    
    const response = await fetch(`${wahaUrl}/api/sendFile`, {
      method: 'POST',
      headers: await getWAHAHeaders(organizationId),
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
 * 8. Desconecta una sesión (hace logout del número)
 * DEPRECATED: Usar logoutSession en su lugar
 * Mantenida para compatibilidad, pero ahora usa logout internamente
 */
export async function disconnectSession(organizationId: string): Promise<void> {
  // Para WAHA Core, usar logout en lugar de stop
  return logoutSession(organizationId);
}

/**
 * 8.1. Hace logout de una sesión (desconecta el número pero mantiene la sesión)
 * Útil para cambiar de número en WAHA Core que solo soporta sesión "default"
 */
export async function logoutSession(organizationId: string): Promise<void> {
  try {
    const wahaUrl = await getWAHAUrl(organizationId);
    const sessionName = getSessionName(organizationId);
    
    console.log(`[WAHA] Haciendo logout de sesión: ${sessionName}`);
    
    const response = await fetch(`${wahaUrl}/api/${sessionName}/auth/logout`, {
      method: 'POST',
      headers: await getWAHAHeaders(organizationId)
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[WAHA] Sesión ${sessionName} no encontrada para logout`);
        return; // No es un error si no existe
      }
      const errorText = await response.text();
      throw new Error(`Error haciendo logout: ${response.status} - ${errorText}`);
    }

    console.log(`[WAHA] ✅ Logout exitoso de sesión: ${sessionName}`);
  } catch (error) {
    console.error('[WAHA] ❌ Error haciendo logout:', error);
    throw error;
  }
}

/**
 * 9. Elimina una sesión completamente
 * 
 * ⚠️ DEPRECATED para WAHA Core: NO usar esta función para WhatsApp
 * 
 * En WAHA Core, la sesión "default" NO debe eliminarse nunca.
 * Usar logoutSession() en su lugar para desconectar el número.
 * 
 * Esta función se mantiene solo para casos especiales o migraciones,
 * pero NO debe usarse en el flujo normal de WhatsApp.
 */
export async function deleteSession(organizationId: string): Promise<void> {
  console.warn('[WAHA] ⚠️ deleteSession llamado - esto NO debe usarse para WhatsApp en WAHA Core');
  console.warn('[WAHA] ⚠️ En su lugar, usar logoutSession() para desconectar el número');
  
  // Para WAHA Core, hacer logout en lugar de eliminar
  // La sesión "default" debe mantenerse siempre
  return logoutSession(organizationId);
}

