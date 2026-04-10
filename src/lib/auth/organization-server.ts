/**
 * ⚠️ CRÍTICO: Versión SERVIDOR de getOrganizationId
 * Solo para uso en Server Components y API routes
 * NO importa código del cliente
 */

import type { NextRequest } from 'next/server';

/**
 * Obtiene el organization_id del usuario autenticado (SOLO SERVIDOR)
 * 
 * @param request - Opcional: NextRequest para obtener cookies del request (para API routes)
 */
export async function getOrganizationId(request?: NextRequest): Promise<string> {
  const { getSupabaseServerClient, createClientFromRequest } = await import('@/lib/supabase/server');
  
  // Intentar primero con request si está disponible (para API routes)
  let supabase;
  try {
    if (request) {
      supabase = createClientFromRequest(request);
    } else {
      supabase = await getSupabaseServerClient();
    }
  } catch (requestError: any) {
    console.warn('[getOrganizationId] ⚠️ Error inicializando cliente:', requestError.message);
    supabase = await getSupabaseServerClient();
  }
  
  // 1. Obtener usuario autenticado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // 2. Obtener el user completo usando Service Role (bypass RLS)
  // Esto es necesario para asegurar que el ID de organización esté disponible
  // incluso si el usuario acaba de registrarse y RLS aún no permite lectura
  const { getSupabaseServiceClient } = await import('@/lib/supabase/server');
  const supabaseAdmin = getSupabaseServiceClient();
  
  // Intento 1: Tabla 'users' (Principal)
  let { data: userData, error: userDataError } = await (supabaseAdmin as any)
    .from('users')
    .select('organization_id, workshop_id')
    .or(`auth_user_id.eq.${user.id},id.eq.${user.id}`)
    .maybeSingle();

  // Intento 2: Tabla 'system_users' (Fallback / Legacy / Admin-created)
  if (userDataError || !userData) {
    console.log(`🔍 [getOrganizationId] Buscando en 'system_users' para ${user.id}...`);
    const { data: systemData } = await (supabaseAdmin as any)
      .from('system_users')
      .select('organization_id')
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email || 'unset'}`)
      .maybeSingle();
    
    if (systemData) {
      userData = systemProfileToUserFormat(systemData);
      userDataError = null;
    }
  }

  if (userDataError || !userData) {
    console.error(`❌ [getOrganizationId] Error perfil para ${user.id}:`, userDataError);
    throw new Error('No se pudo obtener la organización del usuario');
  }

  // Función helper interna para adaptar formato
  function systemProfileToUserFormat(systemData: any) {
    return {
      organization_id: systemData.organization_id,
      workshop_id: systemData.workshop_id || null
    };
  }

  // 3. Si ya tiene organization_id directo, usarlo
  if (userData.organization_id) {
    return userData.organization_id;
  }

  // 4. Si no, obtenerlo del workshop
  if (userData.workshop_id) {
    const { data: workshop, error: workshopError } = await supabase
      .from('workshops')
      .select('organization_id')
      .eq('id', userData.workshop_id)
      .single();

    if (workshopError || !workshop?.organization_id) {
      throw new Error('No se pudo obtener organization_id del workshop');
    }

    return workshop.organization_id;
  }

  throw new Error('Usuario sin organización asignada');
}

