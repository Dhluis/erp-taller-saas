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
  
  // Si hay request, usar las cookies del request (para API routes)
  // Si no, usar cookies() de next/headers (para Server Components)
  const supabase = request 
    ? createClientFromRequest(request)
    : await getSupabaseServerClient();
  
  // 1. Obtener usuario autenticado
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('Usuario no autenticado');
  }

  // 2. Obtener el user completo de la tabla users
  // Intentar primero con auth_user_id
  let { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('organization_id, workshop_id')
    .eq('auth_user_id', user.id)
    .single();

  // Si falla con auth_user_id, intentar con email
  if (userDataError && (userDataError.code === 'PGRST116' || userDataError.code === '42703')) {
    const { data: userDataFallback, error: userDataErrorFallback } = await supabase
      .from('users')
      .select('organization_id, workshop_id')
      .eq('email', user.email)
      .single();
    
    if (!userDataErrorFallback && userDataFallback) {
      userData = userDataFallback;
      userDataError = null;
    }
  }

  if (userDataError || !userData) {
    throw new Error('No se pudo obtener información del usuario');
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

