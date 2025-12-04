/**
 * WAHA Sessions Helper - Multi-tenant
 * 
 * Gestiona sesiones de WhatsApp para cada organización usando WAHA Plus
 * Cada organización tiene su propia sesión única
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * Generar nombre de sesión único por organización
 * Formato: eagles_<orgId sin guiones, primeros 20 caracteres>
 */
export function generateSessionName(organizationId: string): string {
  // Remover guiones y tomar primeros 20 caracteres
  const cleanId = organizationId.replace(/-/g, '').substring(0, 20);
  return `eagles_${cleanId}`;
}

/**
 * Obtener configuración WAHA
 * 1. Primero intenta variables de entorno
 * 2. Luego busca en BD con organizationId específico
 * 3. Finalmente busca en cualquier registro de BD que tenga la config
 */
export async function getWahaConfig(organizationId?: string): Promise<{ url: string; key: string }> {
  console.log('[WAHA Sessions] 🔍 Buscando configuración WAHA...', { 
    hasEnvUrl: !!process.env.WAHA_API_URL, 
    hasEnvKey: !!process.env.WAHA_API_KEY,
    organizationId: organizationId || 'no proporcionado'
  });

  // 1. PRIMERO: Intentar desde variables de entorno
  if (process.env.WAHA_API_URL && process.env.WAHA_API_KEY) {
    console.log('[WAHA Sessions] ✅ Usando configuración de variables de entorno');
    return {
      url: process.env.WAHA_API_URL.replace(/\/$/, ''),
      key: process.env.WAHA_API_KEY
    };
  }

  console.log('[WAHA Sessions] ⚠️ Variables de entorno no encontradas, buscando en BD...');

  // 2. Si no hay env vars, buscar en BD con organizationId específico
  if (organizationId) {
    try {
      console.log('[WAHA Sessions] 🔍 Buscando configuración en BD para organización:', organizationId);
      const supabase = getSupabaseServiceClient();
      
      const { data, error } = await supabase
        .from('ai_agent_config')
        .select('policies')
        .eq('organization_id', organizationId)
        .single();

      if (error) {
        console.warn('[WAHA Sessions] ⚠️ Error leyendo configuración de BD para organización:', error.message, error.code);
      } else if (data?.policies) {
        const policies = data.policies as any;
        console.log('[WAHA Sessions] 📦 Policies encontradas:', Object.keys(policies || {}));
        
        // Buscar en ambos formatos (minúsculas y mayúsculas) para compatibilidad
        const dbUrl = policies?.waha_api_url || policies?.WAHA_API_URL;
        const dbKey = policies?.waha_api_key || policies?.WAHA_API_KEY;

        console.log('[WAHA Sessions] 🔑 Valores encontrados:', { 
          hasUrl: !!dbUrl, 
          hasKey: !!dbKey,
          urlPreview: dbUrl ? `${dbUrl.substring(0, 30)}...` : null,
          keyLength: dbKey ? dbKey.length : 0
        });

        if (dbUrl && dbKey) {
          console.log('[WAHA Sessions] ✅ Usando configuración de BD para organización:', organizationId);
          return {
            url: dbUrl.replace(/\/$/, ''),
            key: dbKey
          };
        } else {
          console.warn('[WAHA Sessions] ⚠️ Configuración incompleta en BD para organización:', {
            hasUrl: !!dbUrl,
            hasKey: !!dbKey
          });
        }
      } else {
        console.warn('[WAHA Sessions] ⚠️ No se encontró configuración en BD para organización:', organizationId);
      }
    } catch (dbError: any) {
      console.error('[WAHA Sessions] ❌ Error accediendo a BD:', dbError.message, dbError.stack);
    }
  }

  // 3. Buscar en cualquier registro de BD que tenga la config
  try {
    console.log('[WAHA Sessions] 🔍 Buscando configuración en cualquier registro de BD...');
    const supabase = getSupabaseServiceClient();
    
    // Obtener todos los registros y buscar el primero que tenga la configuración
    const { data: allConfigs, error: anyError } = await supabase
      .from('ai_agent_config')
      .select('policies, organization_id')
      .limit(100); // Limitar a 100 para no sobrecargar

    if (anyError) {
      console.error('[WAHA Sessions] ❌ Error obteniendo configuraciones de BD:', anyError.message);
    } else if (allConfigs && allConfigs.length > 0) {
      console.log('[WAHA Sessions] 📊 Registros encontrados en BD:', allConfigs.length);
      
      // Buscar el primer registro que tenga waha_api_url y waha_api_key
      for (const config of allConfigs) {
        if (config?.policies) {
          const policies = config.policies as any;
          
          // Buscar en ambos formatos (minúsculas y mayúsculas) para compatibilidad
          const dbUrl = policies?.waha_api_url || policies?.WAHA_API_URL;
          const dbKey = policies?.waha_api_key || policies?.WAHA_API_KEY;

          if (dbUrl && dbKey) {
            console.log('[WAHA Sessions] ✅ Usando configuración de BD (cualquier organización):', {
              organizationId: config.organization_id,
              urlPreview: `${dbUrl.substring(0, 30)}...`,
              keyLength: dbKey.length
            });
            return {
              url: dbUrl.replace(/\/$/, ''),
              key: dbKey
            };
          }
        }
      }
      console.warn('[WAHA Sessions] ⚠️ Ningún registro en BD tiene configuración WAHA completa');
    } else {
      console.warn('[WAHA Sessions] ⚠️ No se encontraron registros en ai_agent_config');
    }
  } catch (anyDbError: any) {
    console.error('[WAHA Sessions] ❌ Error buscando configuración en BD:', anyDbError.message, anyDbError.stack);
  }

  // 4. Si nada funciona, lanzar error
  console.error('[WAHA Sessions] ❌ No se pudo encontrar configuración WAHA en ningún lugar');
  throw new Error('WAHA_API_URL y WAHA_API_KEY son requeridos. Configúralos en variables de entorno o en ai_agent_config.policies');
}

/**
 * Iniciar/reiniciar una sesión existente
 */
export async function startSession(sessionName: string, organizationId?: string): Promise<void> {
  const orgId = organizationId || await getOrganizationFromSession(sessionName);
  const { url, key } = await getWahaConfig(orgId || undefined);

  console.log(`[WAHA Sessions] ▶️ Iniciando sesión: ${sessionName}`);

  const response = await fetch(`${url}/api/sessions/${sessionName}/start`, {
    method: 'POST',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json'
    }
  });

  if (!response) {
    throw new Error('No se recibió respuesta de WAHA al iniciar sesión');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Error desconocido');
    console.error(`[WAHA Sessions] ❌ Error iniciando sesión: ${response.status}`, errorText);
    throw new Error(`Error iniciando sesión: ${response.status} - ${errorText}`);
  }

  console.log(`[WAHA Sessions] ✅ Sesión iniciada: ${sessionName}`);
}

/**
 * Crear sesión para una organización
 */
export async function createOrganizationSession(organizationId: string): Promise<string> {
  const { url, key } = await getWahaConfig(organizationId);
  const sessionName = generateSessionName(organizationId);

  console.log(`[WAHA Sessions] 🚀 Creando sesión para organización: ${organizationId}`);
  console.log(`[WAHA Sessions] 📝 Nombre de sesión: ${sessionName}`);
  console.log(`[WAHA Sessions] 🌐 WAHA URL: ${url}`);
  console.log(`[WAHA Sessions] 🔑 WAHA Key length: ${key.length}`);

  // URL del webhook
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
    : 'https://erp-taller-saas.vercel.app/api/webhooks/whatsapp';

  console.log(`[WAHA Sessions] 🔗 Webhook URL: ${webhookUrl}`);

  // Crear sesión en WAHA
  const requestBody = {
    name: sessionName,
    start: true,
    config: {
      webhooks: [{
        url: webhookUrl,
        events: ['message', 'session.status']
      }]
    }
  };

  console.log(`[WAHA Sessions] 📤 Request body:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${url}/api/sessions`, {
    method: 'POST',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  console.log(`[WAHA Sessions] 📥 Response status: ${response.status}`);
  console.log(`[WAHA Sessions] 📥 Response headers:`, Object.fromEntries(response.headers.entries()));

  if (!response) {
    throw new Error('No se recibió respuesta de WAHA al crear sesión');
  }

  const responseText = await response.text().catch(() => 'Error desconocido');
  console.log(`[WAHA Sessions] 📥 Response body (full):`, responseText);
  
  let responseData: any = {};
  
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    // Si no es JSON, usar el texto
    console.warn('[WAHA Sessions] ⚠️ Respuesta no es JSON:', responseText);
  }

  // 409 o 422 = sesión ya existe, está bien
  const sessionExists = response.status === 409 || response.status === 422;
  
  if (!response.ok && !sessionExists) {
    console.error(`[WAHA Sessions] ❌ Error creando sesión: ${response.status}`, responseText);
    throw new Error(`Error creando sesión: ${response.status} - ${responseText}`);
  }

  if (sessionExists) {
    console.log(`[WAHA Sessions] ℹ️ Sesión ${sessionName} ya existe (status: ${response.status})`);
    
    // Si la sesión ya existe, verificar su estado y reiniciarla si está en FAILED
    try {
      const status = await getSessionStatus(sessionName, organizationId);
      console.log(`[WAHA Sessions] 📊 Estado de sesión existente: ${status.status}`);
      
      if (status.status === 'FAILED' || status.status === 'STOPPED') {
        console.log(`[WAHA Sessions] 🔄 Sesión en estado ${status.status}, reiniciando...`);
        await startSession(sessionName, organizationId);
      } else if (status.status === 'SCAN_QR_CODE' || status.status === 'SCAN_QR') {
        console.log(`[WAHA Sessions] ℹ️ Sesión en estado ${status.status}, esperando QR...`);
        // La sesión está esperando QR, no hacer nada más
      } else {
        console.log(`[WAHA Sessions] ℹ️ Sesión en estado ${status.status}`);
      }
    } catch (statusError: any) {
      console.warn(`[WAHA Sessions] ⚠️ Error verificando estado de sesión existente:`, statusError.message);
      // Intentar iniciar de todas formas si hay error
      try {
        await startSession(sessionName, organizationId);
      } catch (startError: any) {
        console.warn(`[WAHA Sessions] ⚠️ Error iniciando sesión existente:`, startError.message);
      }
    }
  } else {
    console.log(`[WAHA Sessions] ✅ Sesión ${sessionName} creada exitosamente`);
  }

  // Guardar nombre de sesión en BD
  const supabase = getSupabaseServiceClient();
  const { error: updateError } = await supabase
    .from('ai_agent_config')
    .update({ 
      whatsapp_session_name: sessionName,
      updated_at: new Date().toISOString()
    })
    .eq('organization_id', organizationId);

  if (updateError) {
    console.warn(`[WAHA Sessions] ⚠️ Error guardando sesión en BD:`, updateError);
    // No lanzar error, la sesión ya está creada en WAHA
  } else {
    console.log(`[WAHA Sessions] ✅ Nombre de sesión guardado en BD`);
  }

  return sessionName;
}

/**
 * Obtener organizationId desde nombre de sesión (para webhooks y obtener configuración)
 */
export async function getOrganizationFromSession(sessionName: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('ai_agent_config')
    .select('organization_id')
    .eq('whatsapp_session_name', sessionName)
    .single();

  if (error) {
    console.warn(`[WAHA Sessions] ⚠️ Error obteniendo organización de sesión:`, error);
    return null;
  }

  return data?.organization_id || null;
}

/**
 * Obtener sesión de una organización (crear si no existe)
 */
export async function getOrganizationSession(organizationId: string): Promise<string> {
  const supabase = getSupabaseServiceClient();

  // Buscar sesión existente en BD
  const { data, error } = await supabase
    .from('ai_agent_config')
    .select('whatsapp_session_name')
    .eq('organization_id', organizationId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.warn(`[WAHA Sessions] ⚠️ Error leyendo sesión de BD:`, error);
  }

  if (data?.whatsapp_session_name) {
    console.log(`[WAHA Sessions] ✅ Sesión encontrada: ${data.whatsapp_session_name}`);
    return data.whatsapp_session_name;
  }

  // Si no existe, crear nueva sesión
  console.log(`[WAHA Sessions] 📝 Sesión no encontrada, creando nueva...`);
  return await createOrganizationSession(organizationId);
}

/**
 * Obtener estado de sesión
 */
export async function getSessionStatus(sessionName: string, organizationId?: string): Promise<{
  exists: boolean;
  status: string;
  me?: { id: string; name?: string; phone?: string };
  error?: string;
  [key: string]: any;
}> {
  try {
    // Obtener organizationId si no se proporcionó
    const orgId = organizationId || await getOrganizationFromSession(sessionName);
    const { url, key } = await getWahaConfig(orgId || undefined);

    if (!url || !key) {
      console.error('[WAHA Sessions] ❌ No se pudo obtener configuración WAHA');
      return { exists: false, status: 'ERROR', error: 'Configuración WAHA no disponible' };
    }

    const response = await fetch(`${url}/api/sessions/${sessionName}`, {
      headers: { 'X-Api-Key': key }
    });

    // Verificar que response existe
    if (!response) {
      console.error('[WAHA Sessions] ❌ No se recibió respuesta de WAHA');
      return { exists: false, status: 'ERROR', error: 'No response from WAHA' };
    }

    if (response.status === 404) {
      return { exists: false, status: 'NOT_FOUND' };
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Error desconocido');
      console.error(`[WAHA Sessions] ❌ Error obteniendo estado: ${response.status}`, errorText);
      return { exists: false, status: 'ERROR', error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json().catch((parseError) => {
      console.error('[WAHA Sessions] ❌ Error parseando respuesta JSON:', parseError);
      return null;
    });

    if (!data) {
      return { exists: false, status: 'ERROR', error: 'Respuesta inválida de WAHA' };
    }

    // Asegurar que siempre hay un status
    return { 
      exists: true, 
      status: data.status || 'UNKNOWN',
      ...data 
    };
  } catch (error: any) {
    console.error(`[WAHA Sessions] ❌ Error en getSessionStatus:`, error);
    return { 
      exists: false, 
      status: 'ERROR', 
      error: error?.message || 'Error desconocido al obtener estado de sesión' 
    };
  }
}

/**
 * Obtener QR de sesión
 */
export async function getSessionQR(sessionName: string, organizationId?: string): Promise<any> {
  // Obtener organizationId si no se proporcionó
  const orgId = organizationId || await getOrganizationFromSession(sessionName);
  const { url, key } = await getWahaConfig(orgId || undefined);

  console.log(`[WAHA Sessions] 📱 Obteniendo QR para sesión: ${sessionName}`);
  console.log(`[WAHA Sessions] 📱 URL: ${url}/api/${sessionName}/auth/qr?format=raw`);

  const response = await fetch(`${url}/api/${sessionName}/auth/qr?format=raw`, {
    headers: { 'X-Api-Key': key }
  });

  if (!response) {
    throw new Error('No se recibió respuesta de WAHA al obtener QR');
  }

  if (!response.ok) {
    const error = await response.text().catch(() => 'Error desconocido');
    console.error(`[WAHA Sessions] ❌ Error obteniendo QR: ${response.status}`, error);
    
    // Si el error es 404 o 400, puede ser que el QR no esté disponible aún
    if (response.status === 404 || response.status === 400) {
      console.warn(`[WAHA Sessions] ⚠️ QR no disponible aún (status: ${response.status})`);
      return { value: null, data: null, error: 'QR no disponible aún' };
    }
    
    throw new Error(`Error obteniendo QR: ${response.status} - ${error}`);
  }

  const qrData = await response.json().catch((parseError) => {
    console.error('[WAHA Sessions] ❌ Error parseando QR JSON:', parseError);
    throw new Error('Error parseando respuesta de QR');
  });

  console.log(`[WAHA Sessions] 📱 Respuesta QR de WAHA (raw):`, {
    type: typeof qrData,
    isObject: typeof qrData === 'object' && qrData !== null,
    keys: qrData ? Object.keys(qrData) : [],
    hasValue: !!qrData?.value,
    hasData: !!qrData?.data,
    valueLength: qrData?.value?.length || 0,
    dataLength: qrData?.data?.length || 0,
    stringified: JSON.stringify(qrData).substring(0, 200)
  });

  if (!qrData) {
    console.warn(`[WAHA Sessions] ⚠️ Respuesta de QR vacía o inválida`);
    return { value: null, data: null, error: 'QR vacío' };
  }

  // Si el QR está vacío o no tiene valor, devolver objeto con error
  const qrValue = qrData.value || qrData.data || null;
  if (!qrValue || (typeof qrValue === 'string' && qrValue.trim().length === 0)) {
    console.warn(`[WAHA Sessions] ⚠️ QR obtenido pero valor vacío o inválido`);
    return { value: null, data: null, error: 'QR vacío', raw: qrData };
  }

  console.log(`[WAHA Sessions] ✅ QR obtenido exitosamente:`, {
    hasQR: !!qrValue,
    qrLength: qrValue.length,
    qrPreview: qrValue.substring(0, 50) + '...'
  });

  return qrData;
}

/**
 * Cerrar sesión (logout sin eliminar)
 */
export async function logoutSession(sessionName: string, organizationId?: string): Promise<void> {
  // Obtener organizationId si no se proporcionó
  const orgId = organizationId || await getOrganizationFromSession(sessionName);
  const { url, key } = await getWahaConfig(orgId || undefined);

  console.log(`[WAHA Sessions] 🔓 Cerrando sesión: ${sessionName}`);

  const response = await fetch(`${url}/api/${sessionName}/auth/logout`, {
    method: 'POST',
    headers: { 'X-Api-Key': key }
  });

  if (!response) {
    console.warn('[WAHA Sessions] ⚠️ No se recibió respuesta al cerrar sesión');
    return; // No lanzar error, puede que la sesión ya esté cerrada
  }

  if (!response.ok && response.status !== 404) {
    const error = await response.text().catch(() => 'Error desconocido');
    console.error(`[WAHA Sessions] ❌ Error cerrando sesión: ${response.status}`, error);
    throw new Error(`Error cerrando sesión: ${response.status}`);
  }

  console.log(`[WAHA Sessions] ✅ Sesión cerrada: ${sessionName}`);
}

/**
 * Enviar mensaje de WhatsApp
 */
export async function sendWhatsAppMessage(
  sessionName: string, 
  to: string, 
  text: string,
  organizationId?: string
): Promise<any> {
  // Obtener organizationId si no se proporcionó
  const orgId = organizationId || await getOrganizationFromSession(sessionName);
  const { url, key } = await getWahaConfig(orgId || undefined);

  // Formatear número si no tiene @
  const chatId = to.includes('@') ? to : `${to}@c.us`;

  console.log(`[WAHA Sessions] 📤 Enviando mensaje desde ${sessionName} a ${chatId}`);

  const response = await fetch(`${url}/api/sendText`, {
    method: 'POST',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      session: sessionName,
      chatId,
      text
    })
  });

  if (!response) {
    throw new Error('No se recibió respuesta de WAHA al enviar mensaje');
  }

  if (!response.ok) {
    const error = await response.text().catch(() => 'Error desconocido');
    console.error(`[WAHA Sessions] ❌ Error enviando mensaje: ${response.status}`, error);
    throw new Error(`Error enviando mensaje: ${response.status} - ${error}`);
  }

  const result = await response.json().catch((parseError) => {
    console.error('[WAHA Sessions] ❌ Error parseando respuesta de envío:', parseError);
    // Retornar un objeto básico si no se puede parsear
    return { sent: true, id: `msg_${Date.now()}` };
  });

  console.log(`[WAHA Sessions] ✅ Mensaje enviado:`, result);
  return result;
}

