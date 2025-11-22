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

  const fetchOrganization = async (isRetry = false) => {
    try {
      console.log('🔄 [OrganizationContext] fetchOrganization ejecutándose...', { isRetry });
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();
      
      // 1. Obtener usuario
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [OrganizationContext] Usuario no autenticado:', userError);
        throw new Error('Usuario no autenticado');
      }

      console.log('✅ [OrganizationContext] Usuario obtenido:', user.id);

      // 2. Obtener datos del usuario - FORZAR SIN CACHE
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('organization_id, workshop_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userDataError) {
        console.error('❌ [OrganizationContext] Error obteniendo datos del usuario:', userDataError);
        console.error('❌ [OrganizationContext] Detalles del error:', {
          message: userDataError.message,
          code: userDataError.code,
          details: userDataError.details,
          hint: userDataError.hint
        });
        throw new Error('No se pudo obtener información del usuario: ' + userDataError.message);
      }

      if (!userData) {
        console.error('❌ [OrganizationContext] No hay datos del usuario');
        throw new Error('No se pudo obtener información del usuario');
      }

      console.log('✅ [OrganizationContext] Datos del usuario obtenidos:', {
        has_org_id: !!userData.organization_id,
        has_workshop_id: !!userData.workshop_id
      });

      setWorkshopId(userData.workshop_id);

      // 3. Si tiene organization_id directo, usarlo
      if (userData.organization_id) {
        console.log('✅ [OrganizationContext] Usando organization_id directo:', userData.organization_id);
        setOrganizationId(userData.organization_id);
        setError(null);
        setLoading(false);
        return;
      }

      // 4. Si no, obtenerlo del workshop
      if (userData.workshop_id) {
        console.log('🔄 [OrganizationContext] Obteniendo organization_id del workshop:', userData.workshop_id);
        const { data: workshop, error: workshopError } = await supabase
          .from('workshops')
          .select('organization_id')
          .eq('id', userData.workshop_id)
          .single();

        if (workshopError) {
          console.error('❌ [OrganizationContext] Error obteniendo workshop:', workshopError);
          throw new Error('No se pudo obtener organization_id del workshop: ' + workshopError.message);
        }

        if (!workshop?.organization_id) {
          console.error('❌ [OrganizationContext] Workshop no tiene organization_id');
          throw new Error('No se pudo obtener organization_id del workshop');
        }

        console.log('✅ [OrganizationContext] organization_id obtenido del workshop:', workshop.organization_id);
        setOrganizationId(workshop.organization_id);
        setError(null);
        setLoading(false);
        return;
      }

      throw new Error('Usuario sin organización asignada');
    } catch (err) {
      console.error('❌ [OrganizationContext] Error en fetchOrganization:', err);
      setError(err as Error);
      setOrganizationId(null);
      setLoading(false);
      
      // Si es un error de autenticación, no reintentar
      if (err instanceof Error && err.message.includes('no autenticado')) {
        return;
      }
      
      // Reintentar después de 2 segundos si no es el primer intento
      if (!isRetry) {
        console.log('🔄 [OrganizationContext] Reintentando en 2 segundos...');
        setTimeout(() => {
          fetchOrganization(true);
        }, 2000);
      }
    }
  };

  useEffect(() => {
    console.log('🔄 [OrganizationContext] Montando OrganizationProvider...');
    fetchOrganization(false);
    
    // ✅ FIX: Escuchar cambios en el estado de auth
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [OrganizationContext] Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [OrganizationContext] Usuario autenticado, refrescando organización...');
        fetchOrganization(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('⚠️ [OrganizationContext] Usuario desautenticado, limpiando organización...');
        setOrganizationId(null);
        setWorkshopId(null);
        setError(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 [OrganizationContext] Token refrescado, verificando organización...');
        // Solo refrescar si no tenemos organizationId
        if (!organizationId) {
          fetchOrganization(false);
        }
      }
    });

    return () => {
      console.log('🧹 [OrganizationContext] Limpiando suscripción de auth...');
      subscription.unsubscribe();
    };
  }, []);

  // ✅ FIX: Log cuando organizationId cambia
  useEffect(() => {
    if (organizationId) {
      console.log('✅✅✅ [OrganizationContext] organizationId DISPONIBLE:', organizationId);
      console.log('✅✅✅ [OrganizationContext] Esto debería disparar las cargas de datos en los componentes');
    } else if (!loading) {
      console.warn('⚠️⚠️⚠️ [OrganizationContext] organizationId es NULL después de cargar');
    }
  }, [organizationId, loading]);

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

