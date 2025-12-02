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
 * Obtener configuración WAHA desde variables de entorno
 */
export function getWahaConfig(): { url: string; key: string } {
  const url = process.env.WAHA_API_URL;
  const key = process.env.WAHA_API_KEY;

  if (!url || !key) {
    throw new Error('WAHA_API_URL y WAHA_API_KEY son requeridos en variables de entorno');
  }

  return { url: url.replace(/\/$/, ''), key };
}

/**
 * Crear sesión para una organización
 */
export async function createOrganizationSession(organizationId: string): Promise<string> {
  const { url, key } = getWahaConfig();
  const sessionName = generateSessionName(organizationId);

  console.log(`[WAHA Sessions] 🚀 Creando sesión para organización: ${organizationId}`);
  console.log(`[WAHA Sessions] 📝 Nombre de sesión: ${sessionName}`);

  // URL del webhook
  const webhookUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`
    : 'https://erp-taller-saas.vercel.app/api/webhooks/whatsapp';

  // Crear sesión en WAHA
  const response = await fetch(`${url}/api/sessions`, {
    method: 'POST',
    headers: {
      'X-Api-Key': key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: sessionName,
      start: true,
      config: {
        webhooks: [{
          url: webhookUrl,
          events: ['message', 'message.any', 'session.status']
        }]
      }
    })
  });

  const responseText = await response.text();
  let responseData: any = {};
  
  try {
    responseData = JSON.parse(responseText);
  } catch (e) {
    // Si no es JSON, usar el texto
    console.warn('[WAHA Sessions] ⚠️ Respuesta no es JSON:', responseText);
  }

  // 409 = sesión ya existe, está bien
  if (!response.ok && response.status !== 409) {
    console.error(`[WAHA Sessions] ❌ Error creando sesión: ${response.status}`, responseText);
    throw new Error(`Error creando sesión: ${response.status} - ${responseText}`);
  }

  if (response.status === 409) {
    console.log(`[WAHA Sessions] ℹ️ Sesión ${sessionName} ya existe`);
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
export async function getSessionStatus(sessionName: string): Promise<{
  exists: boolean;
  status?: string;
  me?: { id: string; name?: string; phone?: string };
  [key: string]: any;
}> {
  const { url, key } = getWahaConfig();

  try {
    const response = await fetch(`${url}/api/sessions/${sessionName}`, {
      headers: { 'X-Api-Key': key }
    });

    if (response.status === 404) {
      return { exists: false, status: 'NOT_FOUND' };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[WAHA Sessions] ❌ Error obteniendo estado: ${response.status}`, errorText);
      throw new Error(`Error obteniendo estado: ${response.status}`);
    }

    const data = await response.json();
    return { exists: true, ...data };
  } catch (error: any) {
    console.error(`[WAHA Sessions] ❌ Error en getSessionStatus:`, error);
    throw error;
  }
}

/**
 * Obtener QR de sesión
 */
export async function getSessionQR(sessionName: string): Promise<any> {
  const { url, key } = getWahaConfig();

  const response = await fetch(`${url}/api/${sessionName}/auth/qr?format=raw`, {
    headers: { 'X-Api-Key': key }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[WAHA Sessions] ❌ Error obteniendo QR: ${response.status}`, error);
    throw new Error(`Error obteniendo QR: ${response.status} - ${error}`);
  }

  return await response.json();
}

/**
 * Cerrar sesión (logout sin eliminar)
 */
export async function logoutSession(sessionName: string): Promise<void> {
  const { url, key } = getWahaConfig();

  console.log(`[WAHA Sessions] 🔓 Cerrando sesión: ${sessionName}`);

  const response = await fetch(`${url}/api/${sessionName}/auth/logout`, {
    method: 'POST',
    headers: { 'X-Api-Key': key }
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    console.error(`[WAHA Sessions] ❌ Error cerrando sesión: ${response.status}`, error);
    throw new Error(`Error cerrando sesión: ${response.status}`);
  }

  console.log(`[WAHA Sessions] ✅ Sesión cerrada: ${sessionName}`);
}

/**
 * Obtener organizationId desde nombre de sesión (para webhooks)
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
 * Enviar mensaje de WhatsApp
 */
export async function sendWhatsAppMessage(
  sessionName: string, 
  to: string, 
  text: string
): Promise<any> {
  const { url, key } = getWahaConfig();

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

  if (!response.ok) {
    const error = await response.text();
    console.error(`[WAHA Sessions] ❌ Error enviando mensaje: ${response.status}`, error);
    throw new Error(`Error enviando mensaje: ${response.status} - ${error}`);
  }

  const result = await response.json();
  console.log(`[WAHA Sessions] ✅ Mensaje enviado:`, result);
  return result;
}

