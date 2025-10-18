'use client';

/**
 * Hook para manejo de organización
 * Proporciona contexto de organización y funciones relacionadas
 */

import { useState, useEffect, useContext, createContext } from 'react';
import { createClient } from '@/lib/supabase/client';

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export interface Organization {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  logo_url: string;
  currency: string;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface OrganizationContextType {
  organization: Organization | null;
  organizationId: string;
  loading: boolean;
  error: string | null;
  setOrganization: (org: Organization | null) => void;
  refreshOrganization: () => Promise<void>;
}

// =====================================================
// CONTEXTO DE ORGANIZACIÓN
// =====================================================

const OrganizationContext = createContext<OrganizationContextType | null>(null);

// =====================================================
// HOOK PRINCIPAL
// =====================================================

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization debe ser usado dentro de OrganizationProvider');
  }
  return context;
}

// =====================================================
// PROVIDER DE ORGANIZACIÓN
// =====================================================

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const organizationId = organization?.id || '00000000-0000-0000-0000-000000000001'; // Fallback para desarrollo

  const refreshOrganization = async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      
      // Obtener usuario actual
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.warn('No hay usuario autenticado, usando organización temporal');
        setOrganization({
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Organización Temporal',
          email: 'temp@example.com',
          phone: '',
          address: '',
          tax_id: '',
          logo_url: '',
          currency: 'MXN',
          tax_rate: 16.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return;
      }

      // Obtener organización del usuario
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.user_metadata?.organization_id || '00000000-0000-0000-0000-000000000001')
        .single();

      if (orgError) {
        console.warn('Error al obtener organización:', orgError);
        // Usar organización temporal como fallback
        setOrganization({
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Organización Temporal',
          email: 'temp@example.com',
          phone: '',
          address: '',
          tax_id: '',
          logo_url: '',
          currency: 'MXN',
          tax_rate: 16.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return;
      }

      setOrganization(orgData);
    } catch (err) {
      console.error('Error al cargar organización:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      
      // Fallback a organización temporal
      setOrganization({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Organización Temporal',
        email: 'temp@example.com',
        phone: '',
        address: '',
        tax_id: '',
        logo_url: '',
        currency: 'MXN',
        tax_rate: 16.00,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrganization();
  }, []);

  const value: OrganizationContextType = {
    organization,
    organizationId,
    loading,
    error,
    setOrganization,
    refreshOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

/**
 * Obtener ID de organización del contexto
 */
export function getOrganizationId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000001'; // Server-side fallback
  }
  
  // En el cliente, intentar obtener del contexto
  try {
    const context = useContext(OrganizationContext);
    return context?.organizationId || '00000000-0000-0000-0000-000000000001';
  } catch {
    return '00000000-0000-0000-0000-000000000001';
  }
}

/**
 * Validar que la organización esté disponible
 */
export function validateOrganization(organizationId: string): boolean {
  if (!organizationId || organizationId === '') {
    console.error('Organization ID is required');
    return false;
  }
  
  if (organizationId === '00000000-0000-0000-0000-000000000001') {
    console.warn('Using temporary organization ID - this should be replaced in production');
  }
  
  return true;
}

/**
 * Obtener configuración de impuestos de la organización
 */
export function getOrganizationTaxConfig(organization: Organization | null) {
  return {
    taxRate: organization?.tax_rate || 16.00,
    currency: organization?.currency || 'MXN',
    taxId: organization?.tax_id || '',
  };
}
