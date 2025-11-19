/**
 * ⚠️ DEPRECATED: Este archivo ya no se usa directamente
 * 
 * Usa:
 * - @/lib/auth/organization-client para componentes del cliente
 * - @/lib/auth/organization-server para Server Components y API routes
 * 
 * Este archivo solo mantiene el hook useOrganizationId para compatibilidad
 */

// Re-exportar desde la versión cliente para el hook
export { getOrganizationId } from './organization-client';

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
  const React = require('react') as typeof import('react');
  const { useState, useEffect } = React;
  
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Importar dinámicamente para evitar problemas de bundle
    import('./organization-client').then(({ getOrganizationId: getOrgId }) => {
      getOrgId()
        .then(setOrganizationId)
        .catch((err) => {
          console.error('❌ [useOrganizationId] Error:', err);
          setError(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => setLoading(false));
    });
  }, []);

  return { organizationId, loading, error };
}

