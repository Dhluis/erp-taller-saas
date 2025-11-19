/**
 * ⚠️ CRÍTICO: Esta es la ÚNICA función autorizada para obtener organization_id
 * NO uses organization.id, user.organization_id, ni ninguna otra variante
 * SIEMPRE usa esta función
 * 
 * Funciona tanto en cliente como en servidor
 */

/**
 * Obtiene el organization_id del usuario autenticado
 * Primero intenta obtenerlo directamente del usuario, luego del workshop
 * Funciona tanto en cliente como en servidor
 */
export async function getOrganizationId(): Promise<string> {
  // Detectar si estamos en servidor o cliente
  const isServer = typeof window === 'undefined';
  
  let supabase;
  if (isServer) {
    // En servidor, usar cliente de servidor
    const { getSupabaseServerClient } = await import('@/lib/supabase/server');
    supabase = await getSupabaseServerClient();
  } else {
    // En cliente, usar cliente de navegador
    const { getSupabaseClient } = await import('@/lib/supabase/client');
    supabase = getSupabaseClient();
  }
  
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

/**
 * Hook para usar en componentes React (solo cliente)
 * Importar dinámicamente para evitar errores en servidor
 */
export function useOrganizationId() {
  // Importar React solo en cliente
  if (typeof window === 'undefined') {
    throw new Error('useOrganizationId solo puede usarse en componentes del cliente');
  }
  
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const React = require('react');
  const { useState, useEffect } = React;
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    getOrganizationId()
      .then(setOrganizationId)
      .catch((err) => {
        console.error('❌ [useOrganizationId] Error:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));
  }, []);

  return { organizationId, loading, error };
}

