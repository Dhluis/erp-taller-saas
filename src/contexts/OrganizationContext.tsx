'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface OrganizationContextType {
  organizationId: string | null;
  workshopId: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = async () => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();
      
      // 1. Obtener usuario
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // 2. Obtener datos del usuario
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('organization_id, workshop_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userDataError || !userData) {
        throw new Error('No se pudo obtener información del usuario');
      }

      setWorkshopId(userData.workshop_id);

      // 3. Si tiene organization_id directo, usarlo
      if (userData.organization_id) {
        setOrganizationId(userData.organization_id);
        setError(null);
        return;
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

        setOrganizationId(workshop.organization_id);
        setError(null);
        return;
      }

      throw new Error('Usuario sin organización asignada');
    } catch (err) {
      setError(err as Error);
      setOrganizationId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganization();
  }, []);

  return (
    <OrganizationContext.Provider 
      value={{ 
        organizationId, 
        workshopId,
        loading, 
        error, 
        refresh: fetchOrganization 
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization debe usarse dentro de OrganizationProvider');
  }
  return context;
}

