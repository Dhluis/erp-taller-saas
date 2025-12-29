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
  if (!organizationId || organizationId.trim() === '') {
    throw new Error('organizationId es requerido para generar nombre de sesión');
  }
  
  // Remover guiones y tomar primeros 20 caracteres
  const cleanId = organizationId.replace(/-/g, '').substring(0, 20);
  const sessionName = `eagles_${cleanId}`;
  
  console.log(`[WAHA Sessions] 🔧 Generando nombre de sesión:`, {
    organizationId,
    cleanId,
    sessionName
  });
  
  if (!sessionName || sessionName === 'eagles_' || sessionName.length < 10) {
    throw new Error(`Nombre de sesión inválido generado: ${sessionName}`);
  }
  
  return sessionName;
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
  if (!organizationId || organizationId.trim() === '') {
    throw new Error('organizationId es requerido para crear sesión');
  }

  console.log(`[WAHA Sessions] 🚀 ===== INICIANDO createOrganizationSession =====`);
  console.log(`[WAHA Sessions] 🚀 organizationId: ${organizationId}`);
  
  console.log(`[WAHA Sessions] 🔧 Obteniendo configuración WAHA...`);
  const { url, key } = await getWahaConfig(organizationId);
  console.log(`[WAHA Sessions] ✅ Configuración obtenida:`, {
    url,
    hasKey: !!key,
    keyLength: key?.length || 0
  });

  console.log(`[WAHA Sessions] 🔧 Generando nombre de sesión...`);
  const sessionName = generateSessionName(organizationId);
  console.log(`[WAHA Sessions] ✅ Nombre generado: "${sessionName}"`);

  if (!sessionName || sessionName === 'default' || sessionName.trim() === '' || sessionName === 'eagles_') {
    console.error(`[WAHA Sessions] ❌ Nombre de sesión inválido: "${sessionName}"`);
    throw new Error(`Nombre de sesión inválido generado: "${sessionName}"`);
  }

  console.log(`[WAHA Sessions] 📝 Nombre de sesión validado: ${sessionName}`);
  console.log(`[WAHA Sessions] 🌐 WAHA URL: ${url}`);
  console.log(`[WAHA Sessions] 🔑 WAHA Key length: ${key.length}`);

  // URL del webhook (fail-fast si no está configurada)
  const webhookUrl = (() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!appUrl) {
      console.error('[WhatsApp Config] ❌ NEXT_PUBLIC_APP_URL no está configurada');
      throw new Error(
        'NEXT_PUBLIC_APP_URL es requerida para configurar webhooks de WhatsApp. ' +
        'Configúrala en .env.local o en Vercel'
      );
    }
    
    return `${appUrl}/api/webhooks/whatsapp`;
  })();

  console.log(`[WAHA Sessions] 🔗 Webhook URL: ${webhookUrl}`);

  // Crear sesión en WAHA
  const requestBody = {
    name: sessionName,
    start: true,
    config: {
      webhooks: [{
        url: webhookUrl,
        events: ['message', 'session.status'],
        downloadMedia: true, // ✅ Descargar media automáticamente
        downloadMediaOnMessage: true, // ✅ Descargar media cuando llega mensaje
        customHeaders: [{
          name: 'X-Organization-ID',
          value: organizationId
        }]
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
 * Actualizar configuración del webhook de una sesión existente
 * Útil para agregar soporte multimedia sin recrear la sesión
 * @deprecated Use updateWebhookForOrganization instead for clarity
 */
export async function updateSessionWebhook(sessionName: string, organizationId?: string): Promise<void> {
  return updateWebhookForOrganization(sessionName, organizationId);
}

/**
 * Actualizar webhook para una organización específica (multi-tenant)
 * Configura el webhook con custom header X-Organization-ID dinámico
 * 
 * @param sessionName - Nombre de la sesión WAHA
 * @param organizationId - ID de la organización (opcional, se obtiene de la sesión si no se proporciona)
 */
export async function updateWebhookForOrganization(sessionName: string, organizationId?: string): Promise<void> {
  const orgId = organizationId || await getOrganizationFromSession(sessionName);
  if (!orgId) {
    throw new Error('No se pudo obtener organizationId para actualizar webhook');
  }
  
  const { url, key } = await getWahaConfig(orgId);
  
  // URL del webhook (fail-fast si no está configurada)
  const webhookUrl = (() => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    
    if (!appUrl) {
      console.error('[WhatsApp Config] ❌ NEXT_PUBLIC_APP_URL no está configurada');
      throw new Error(
        'NEXT_PUBLIC_APP_URL es requerida para configurar webhooks de WhatsApp. ' +
        'Configúrala en .env.local o en Vercel'
      );
    }
    
    return `${appUrl}/api/webhooks/whatsapp`;
  })();

  console.log(`[WAHA Sessions] 🔄 Actualizando webhook para organización: ${orgId}`);
  console.log(`[WAHA Sessions] 📍 Session Name: ${sessionName}`);
  console.log(`[WAHA Sessions] 🔗 Webhook URL: ${webhookUrl}`);
  console.log(`[WAHA Sessions] 🏢 Configurando webhook con X-Organization-ID: ${orgId}`);

  const requestBody = {
    config: {
      webhooks: [{
        url: webhookUrl,
        events: ['message', 'session.status'],
        downloadMedia: true,
        downloadMediaOnMessage: true,
        customHeaders: [{
          name: 'X-Organization-ID',
          value: orgId
        }]
      }]
    }
  };

  console.log(`[WAHA Sessions] 📤 Request body:`, JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${url}/api/sessions/${sessionName}`, {
    method: 'PUT',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Error desconocido');
    console.error(`[WAHA Sessions] ❌ Error actualizando webhook: ${response.status}`, errorText);
    throw new Error(`Error actualizando webhook: ${response.status} - ${errorText}`);
  }

  const responseData = await response.json().catch(() => ({}));
  console.log(`[WAHA Sessions] ✅ Webhook actualizado exitosamente con X-Organization-ID: ${orgId}`);
  if (Object.keys(responseData).length > 0) {
    console.log(`[WAHA Sessions] 📥 Response:`, JSON.stringify(responseData, null, 2));
  }
}

/**
 * Verificar configuración del webhook de una sesión
 * Retorna la configuración actual del webhook incluyendo custom headers
 */
export async function verifyWebhookConfiguration(sessionName: string, organizationId?: string): Promise<{
  webhook?: {
    url: string;
    events: string[];
    customHeaders?: Array<{ name: string; value: string }>;
  };
  isConfigured: boolean;
  isCorrect: boolean;
  expectedOrgId: string;
  actualOrgId?: string;
}> {
  const orgId = organizationId || await getOrganizationFromSession(sessionName);
  if (!orgId) {
    throw new Error('No se pudo obtener organizationId para verificar webhook');
  }

  const { url, key } = await getWahaConfig(orgId);

  console.log(`[WAHA Sessions] 🔍 Verificando configuración de webhook para sesión: ${sessionName}`);
  console.log(`[WAHA Sessions] 🏢 Organization ID esperado: ${orgId}`);

  const response = await fetch(`${url}/api/sessions/${sessionName}`, {
    method: 'GET',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Error desconocido');
    console.error(`[WAHA Sessions] ❌ Error verificando webhook: ${response.status}`, errorText);
    throw new Error(`Error verificando webhook: ${response.status} - ${errorText}`);
  }

  const sessionData = await response.json().catch(() => ({}));
  
  // Buscar webhook en la configuración
  const webhooks = sessionData?.config?.webhooks || [];
  const webhook = webhooks[0];

  const isConfigured = !!webhook;
  const customHeader = webhook?.customHeaders?.find((h: any) => h.name === 'X-Organization-ID');
  const actualOrgId = customHeader?.value;
  const isCorrect = isConfigured && actualOrgId === orgId;

  console.log(`[WAHA Sessions] 📊 Verificación completada:`, {
    isConfigured,
    isCorrect,
    expectedOrgId: orgId,
    actualOrgId,
    webhookUrl: webhook?.url
  });

  return {
    webhook: webhook ? {
      url: webhook.url,
      events: webhook.events || [],
      customHeaders: webhook.customHeaders || []
    } : undefined,
    isConfigured,
    isCorrect,
    expectedOrgId: orgId,
    actualOrgId
  };
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
  console.log(`[WAHA Sessions] 🔍 ===== INICIANDO getOrganizationSession =====`);
  console.log(`[WAHA Sessions] 🔍 organizationId recibido: ${organizationId}`);
  
  if (!organizationId || organizationId.trim() === '') {
    throw new Error('organizationId es requerido y no puede estar vacío');
  }

  const supabase = getSupabaseServiceClient();

  // Buscar sesión existente en BD
  console.log(`[WAHA Sessions] 🔍 Buscando en BD: ai_agent_config donde organization_id = ${organizationId}`);
  const { data, error } = await supabase
    .from('ai_agent_config')
    .select('whatsapp_session_name')
    .eq('organization_id', organizationId)
    .single();

  console.log(`[WAHA Sessions] 🔍 Resultado de búsqueda en BD:`, {
    data,
    error: error ? {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    } : null,
    hasSessionName: !!data?.whatsapp_session_name,
    sessionName: data?.whatsapp_session_name,
    sessionNameType: typeof data?.whatsapp_session_name,
    sessionNameLength: data?.whatsapp_session_name?.length
  });

  if (error && error.code !== 'PGRST116') {
    console.warn(`[WAHA Sessions] ⚠️ Error leyendo sesión de BD:`, error);
  }

  if (data?.whatsapp_session_name) {
    const sessionName = data.whatsapp_session_name;
    console.log(`[WAHA Sessions] ✅ Sesión encontrada en BD: "${sessionName}"`);
    
    // Validar que el nombre de sesión no sea "default" o vacío
    if (!sessionName || sessionName.trim() === '' || sessionName === 'default') {
      console.error(`[WAHA Sessions] ❌ Nombre de sesión inválido en BD: "${sessionName}"`);
      console.log(`[WAHA Sessions] 🔄 Creando nueva sesión para reemplazar valor inválido...`);
      return await createOrganizationSession(organizationId);
    }
    
    // Verificar que la sesión existe en WAHA antes de retornarla
    try {
      console.log(`[WAHA Sessions] 🔍 Verificando estado de sesión en WAHA: ${sessionName}`);
      const status = await getSessionStatus(sessionName, organizationId);
      console.log(`[WAHA Sessions] 📊 Estado de sesión:`, status);
      
      if (!status.exists || status.status === 'NOT_FOUND') {
        console.warn(`[WAHA Sessions] ⚠️ Sesión ${sessionName} no existe en WAHA, creando nueva...`);
        return await createOrganizationSession(organizationId);
      }
      console.log(`[WAHA Sessions] ✅ Sesión ${sessionName} existe en WAHA con estado: ${status.status}`);
      console.log(`[WAHA Sessions] ✅ ===== RETORNANDO SESIÓN: ${sessionName} =====`);
      return sessionName;
    } catch (statusError: any) {
      console.warn(`[WAHA Sessions] ⚠️ Error verificando estado de sesión:`, statusError.message);
      console.log(`[WAHA Sessions] 🔄 Creando nueva sesión debido a error...`);
      return await createOrganizationSession(organizationId);
    }
  }

  // Si no existe, crear nueva sesión
  console.log(`[WAHA Sessions] 📝 Sesión no encontrada en BD, creando nueva...`);
  const newSessionName = await createOrganizationSession(organizationId);
  console.log(`[WAHA Sessions] ✅ ===== SESIÓN CREADA: ${newSessionName} =====`);
  return newSessionName;
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
  // Validar que sessionName no sea vacío o "default"
  if (!sessionName || sessionName.trim() === '' || sessionName === 'default') {
    console.error(`[WAHA Sessions] ❌ Nombre de sesión inválido: "${sessionName}"`);
    throw new Error(`Nombre de sesión inválido: "${sessionName}". La sesión debe estar configurada correctamente.`);
  }

  console.log(`[WAHA Sessions] 📤 Preparando envío de mensaje:`, {
    sessionName,
    to,
    textLength: text.length,
    organizationId
  });

  // Obtener organizationId si no se proporcionó
  const orgId = organizationId || await getOrganizationFromSession(sessionName);
  const { url, key } = await getWahaConfig(orgId || undefined);

  if (!url || !key) {
    console.error(`[WAHA Sessions] ❌ Configuración WAHA no disponible`);
    throw new Error('Configuración de WAHA no disponible');
  }

  // Verificar estado de la sesión antes de enviar
  console.log(`[WAHA Sessions] 🔍 Verificando estado de sesión antes de enviar...`);
  try {
    const status = await getSessionStatus(sessionName, orgId || undefined);
    console.log(`[WAHA Sessions] 📊 Estado de sesión:`, status);
    
    if (status.status === 'FAILED' || status.status === 'STOPPED') {
      console.warn(`[WAHA Sessions] ⚠️ Sesión en estado ${status.status}, intentando reiniciar...`);
      try {
        await startSession(sessionName, orgId || undefined);
        console.log(`[WAHA Sessions] ✅ Sesión reiniciada, esperando 2 segundos...`);
        // Esperar un poco para que la sesión se estabilice
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar estado nuevamente
        const newStatus = await getSessionStatus(sessionName, orgId || undefined);
        console.log(`[WAHA Sessions] 📊 Nuevo estado después de reiniciar:`, newStatus);
        
        if (newStatus.status !== 'WORKING' && newStatus.status !== 'SCAN_QR_CODE' && newStatus.status !== 'SCAN_QR') {
          throw new Error(`La sesión no pudo ser reiniciada. Estado actual: ${newStatus.status}. Por favor, verifica la conexión de WhatsApp.`);
        }
      } catch (restartError: any) {
        console.error(`[WAHA Sessions] ❌ Error reiniciando sesión:`, restartError);
        throw new Error(`La sesión de WhatsApp está en estado ${status.status} y no pudo ser reiniciada. Por favor, verifica la conexión de WhatsApp o reinicia la sesión manualmente.`);
      }
    } else if (status.status === 'SCAN_QR_CODE' || status.status === 'SCAN_QR') {
      throw new Error('La sesión de WhatsApp requiere escanear el código QR. Por favor, escanea el código QR primero.');
    } else if (status.status !== 'WORKING') {
      console.warn(`[WAHA Sessions] ⚠️ Sesión en estado ${status.status}, intentando enviar de todas formas...`);
    }
  } catch (statusError: any) {
    console.warn(`[WAHA Sessions] ⚠️ Error verificando estado de sesión:`, statusError.message);
    // Continuar de todas formas, puede que el estado se pueda verificar después
  }

  // Construir chatId - mantener formato original si ya tiene @
  // Si no tiene @, agregar @c.us por defecto
  let chatId: string;
  if (to.includes('@')) {
    // Ya tiene formato (@lid, @c.us, @s.whatsapp.net)
    chatId = to;
  } else {
    // Solo número, agregar @c.us por defecto
    chatId = `${to}@c.us`;
  }

  // WAHA Plus usa /api/sendText con session en el body (no en la URL)
  const endpointUrl = `${url}/api/sendText`;
  const requestBody = {
    session: sessionName,
    chatId,
    text
  };

  console.log(`[WAHA Sessions] 📤 Enviando mensaje:`, {
    sessionName,
    chatId,
    endpointUrl,
    hasKey: !!key,
    requestBody
  });

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response) {
    throw new Error('No se recibió respuesta de WAHA al enviar mensaje');
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Error desconocido');
    let errorData: any = {};
    try {
      errorData = JSON.parse(errorText);
    } catch (e) {
      // Si no es JSON, usar el texto
    }
    
    console.error(`[WAHA Sessions] ❌ Error enviando mensaje: ${response.status}`, {
      errorText,
      errorData,
      status: response.status
    });

    // Si el error es 422 y la sesión está en FAILED, dar mensaje claro
    if (response.status === 422 && errorData?.status === 'FAILED') {
      console.error(`[WAHA Sessions] ❌ Sesión en estado FAILED - necesita ser vinculada`);
      throw new Error(`La sesión de WhatsApp no está vinculada. Por favor, ve a la configuración de WhatsApp y escanea el código QR para vincular tu cuenta. La sesión "${sessionName}" existe pero necesita ser conectada.`);
    }
    
    // Si el error es 422 y la sesión está en otro estado no válido
    if (response.status === 422 && errorData?.status && errorData?.status !== 'WORKING') {
      console.error(`[WAHA Sessions] ❌ Sesión en estado inválido: ${errorData.status}`);
      
      // Si está en SCAN_QR_CODE, indicar que necesita escanear QR
      if (errorData.status === 'SCAN_QR_CODE' || errorData.status === 'SCAN_QR') {
        throw new Error(`La sesión de WhatsApp requiere escanear el código QR. Por favor, ve a la configuración de WhatsApp y escanea el código QR para vincular tu cuenta.`);
      }
      
      // Para otros estados, intentar reiniciar
      console.log(`[WAHA Sessions] 🔄 Sesión en estado ${errorData.status}, intentando reiniciar...`);
      try {
        await startSession(sessionName, orgId || undefined);
        console.log(`[WAHA Sessions] ✅ Sesión reiniciada, esperando 3 segundos...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Reintentar envío
        console.log(`[WAHA Sessions] 🔄 Reintentando envío de mensaje...`);
        const retryResponse = await fetch(endpointUrl, {
          method: 'POST',
          headers: {
            'X-Api-Key': key,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text().catch(() => 'Error desconocido');
          console.error(`[WAHA Sessions] ❌ Error en reintento: ${retryResponse.status}`, retryErrorText);
          throw new Error(`Error enviando mensaje después de reiniciar sesión: ${retryResponse.status} - ${retryErrorText}`);
        }

        const retryResult = await retryResponse.json().catch((parseError) => {
          console.error('[WAHA Sessions] ❌ Error parseando respuesta de reintento:', parseError);
          return { sent: true, id: `msg_${Date.now()}` };
        });

        console.log(`[WAHA Sessions] ✅ Mensaje enviado después de reiniciar sesión:`, retryResult);
        return retryResult;
      } catch (retryError: any) {
        console.error(`[WAHA Sessions] ❌ Error en reintento después de reiniciar:`, retryError);
        throw new Error(`La sesión de WhatsApp está en estado ${errorData.status}. Se intentó reiniciar pero falló: ${retryError.message}. Por favor, verifica la conexión de WhatsApp o reinicia la sesión manualmente.`);
      }
    }

    // Si el error es sobre estado de sesión, dar mensaje más claro
    if (response.status === 422 && errorData?.error?.includes('status is not as expected')) {
      throw new Error(`La sesión de WhatsApp está en estado ${errorData?.status || 'desconocido'} y necesita estar en WORKING. Por favor, verifica la conexión de WhatsApp o reinicia la sesión manualmente.`);
    }

    throw new Error(`Error enviando mensaje: ${response.status} - ${errorText}`);
  }

  const result = await response.json().catch((parseError) => {
    console.error('[WAHA Sessions] ❌ Error parseando respuesta de envío:', parseError);
    // Retornar un objeto básico si no se puede parsear
    return { sent: true, id: `msg_${Date.now()}` };
  });

  console.log(`[WAHA Sessions] ✅ Mensaje enviado:`, result);
  return result;
}

/**
 * Obtener foto de perfil de un contacto de WhatsApp
 */
export async function getProfilePicture(
  phone: string, 
  sessionName: string, 
  organizationId: string
): Promise<string | null> {
  try {
    const { url, key } = await getWahaConfig(organizationId);
    if (!url || !key) {
      console.log('[WAHA] No hay configuración WAHA disponible');
      return null;
    }

    const contactId = phone.includes('@') ? phone : `${phone}@c.us`;
    
    console.log(`[WAHA] 📸 Obteniendo foto de perfil para: ${contactId}`);
    
    const response = await fetch(
      `${url}/api/contacts/profile-picture?contactId=${contactId}&session=${sessionName}`,
      {
        headers: { 'X-Api-Key': key }
      }
    );

    if (!response.ok) {
      console.log(`[WAHA] No se pudo obtener foto de perfil: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const profilePicUrl = data.profilePictureUrl || data.url || data.profile_picture_url || null;
    
    if (profilePicUrl) {
      console.log(`[WAHA] ✅ Foto de perfil obtenida: ${profilePicUrl.substring(0, 50)}...`);
    } else {
      console.log(`[WAHA] ⚠️ Respuesta no contiene URL de foto`);
    }
    
    return profilePicUrl;
  } catch (error: any) {
    console.error('[WAHA] Error obteniendo foto de perfil:', error.message);
    return null;
  }
}

