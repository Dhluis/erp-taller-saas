'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

interface OrganizationContextType {
  organizationId: string | null;
  workshopId: string | null;
  loading: boolean;
  error: Error | null;
  ready: boolean; // ✅ Indica cuando organizationId está estable y listo para usar
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [workshopId, setWorkshopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [ready, setReady] = useState(false);
  
  // ✅ FIX: Usar refs para evitar dependencias circulares
  const isFetchingRef = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const authSubscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const organizationIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  // ✅ FIX: Memoizar fetchOrganization para evitar recreaciones
  const fetchOrganization = useCallback(async (isRetry = false) => {
    // ✅ FIX: Prevenir llamadas concurrentes
    if (isFetchingRef.current && !isRetry) {
      console.log('⏸️ [OrganizationContext] Fetch ya en progreso, ignorando...');
      return;
    }

    try {
      isFetchingRef.current = true;
      console.log('🔄 [OrganizationContext] fetchOrganization ejecutándose...', { isRetry });
      setLoading(true);
      setError(null);
      const supabase = getSupabaseClient();
      
      // 1. Obtener usuario
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ [OrganizationContext] Usuario no autenticado:', userError);
        organizationIdRef.current = null;
        readyRef.current = false;
        setOrganizationId(null);
        setWorkshopId(null);
        setReady(false);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      console.log('✅ [OrganizationContext] Usuario obtenido:', user.id);

      // 2. Obtener datos del usuario
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('organization_id, workshop_id')
        .eq('auth_user_id', user.id)
        .single();

      if (userDataError) {
        console.error('❌ [OrganizationContext] Error obteniendo datos del usuario:', userDataError);
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

      const newWorkshopId = userData.workshop_id;
      setWorkshopId(newWorkshopId);

      // 3. Si tiene organization_id directo, usarlo
      if (userData.organization_id) {
        const newOrgId = userData.organization_id;
        console.log('✅ [OrganizationContext] Usando organization_id directo:', newOrgId);
        organizationIdRef.current = newOrgId;
        readyRef.current = true;
        setOrganizationId(newOrgId);
        setError(null);
        setLoading(false);
        setReady(true);
        console.log('✅✅✅ [OrganizationContext] READY = TRUE - organizationId está estable:', newOrgId);
        isFetchingRef.current = false;
        return;
      }

      // 4. Si no, obtenerlo del workshop
      if (newWorkshopId) {
        console.log('🔄 [OrganizationContext] Obteniendo organization_id del workshop:', newWorkshopId);
        const { data: workshop, error: workshopError } = await supabase
          .from('workshops')
          .select('organization_id')
          .eq('id', newWorkshopId)
          .single();

        if (workshopError) {
          console.error('❌ [OrganizationContext] Error obteniendo workshop:', workshopError);
          throw new Error('No se pudo obtener organization_id del workshop: ' + workshopError.message);
        }

        if (!workshop?.organization_id) {
          console.error('❌ [OrganizationContext] Workshop no tiene organization_id');
          throw new Error('No se pudo obtener organization_id del workshop');
        }

        const newOrgId = workshop.organization_id;
        console.log('✅ [OrganizationContext] organization_id obtenido del workshop:', newOrgId);
        organizationIdRef.current = newOrgId;
        readyRef.current = true;
        setOrganizationId(newOrgId);
        setError(null);
        setLoading(false);
        setReady(true);
        console.log('✅✅✅ [OrganizationContext] READY = TRUE - organizationId está estable:', newOrgId);
        isFetchingRef.current = false;
        return;
      }

      throw new Error('Usuario sin organización asignada');
    } catch (err) {
      console.error('❌ [OrganizationContext] Error en fetchOrganization:', err);
      setError(err as Error);
      organizationIdRef.current = null;
      readyRef.current = false;
      setOrganizationId(null);
      setReady(false);
      setLoading(false);
      isFetchingRef.current = false;
      
      // Si es un error de autenticación, no reintentar
      if (err instanceof Error && err.message.includes('no autenticado')) {
        return;
      }
      
      // Reintentar después de 2 segundos si no es el primer intento
      if (!isRetry) {
        console.log('🔄 [OrganizationContext] Reintentando en 2 segundos...');
        // ✅ FIX: Limpiar timeout anterior si existe
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          fetchOrganization(true);
        }, 2000);
      }
    }
  }, []);

  // ✅ FIX: Efecto de montaje - solo se ejecuta una vez
  useEffect(() => {
    console.log('🔄 [OrganizationContext] Montando OrganizationProvider...');
    
    // Cargar organización inicial
    fetchOrganization(false);
    
    // ✅ FIX: Escuchar cambios en el estado de auth (solo una vez)
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 [OrganizationContext] Auth state changed:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ [OrganizationContext] Usuario autenticado, refrescando organización...');
        fetchOrganization(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('⚠️ [OrganizationContext] Usuario desautenticado, limpiando organización...');
        organizationIdRef.current = null;
        readyRef.current = false;
        setOrganizationId(null);
        setWorkshopId(null);
        setError(null);
        setReady(false);
        isFetchingRef.current = false;
        // Limpiar timeout de retry si existe
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 [OrganizationContext] Token refrescado, verificando organización...');
        // Solo refrescar si no tenemos organizationId estable (usar refs para evitar dependencias)
        if (!organizationIdRef.current || !readyRef.current) {
          fetchOrganization(false);
        }
      }
    });

    authSubscriptionRef.current = subscription;

    return () => {
      console.log('🧹 [OrganizationContext] Limpiando suscripción de auth...');
      if (authSubscriptionRef.current) {
        authSubscriptionRef.current.unsubscribe();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []); // ✅ FIX: Sin dependencias para evitar re-montajes

  // ✅ FIX: Log cuando organizationId o ready cambia (solo para debugging)
  useEffect(() => {
    if (organizationId && ready) {
      console.log('✅✅✅ [OrganizationContext] organizationId ESTABLE Y READY:', organizationId);
      console.log('✅✅✅ [OrganizationContext] Los componentes pueden cargar datos de forma segura');
    } else if (organizationId && !ready) {
      console.log('⏳ [OrganizationContext] organizationId disponible pero aún NO está ready:', organizationId);
    } else if (!organizationId && !loading) {
      console.warn('⚠️⚠️⚠️ [OrganizationContext] organizationId es NULL después de cargar');
    }
  }, [organizationId, ready, loading]);

  // ✅ FIX: Memoizar el valor del contexto para evitar re-renders innecesarios
  const contextValue = useMemo(() => ({
    organizationId,
    workshopId,
    loading,
    error,
    ready,
    refresh: fetchOrganization
  }), [organizationId, workshopId, loading, error, ready, fetchOrganization]);

  return (
    <OrganizationContext.Provider value={contextValue}>
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

