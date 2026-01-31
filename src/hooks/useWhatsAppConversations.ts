/**
 * useWhatsAppConversations Hook con Paginación
 * Eagles ERP - Hook para gestión de conversaciones de WhatsApp con paginación completa
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { safeFetch } from '@/lib/api'
import { useOrganization } from '@/lib/context/SessionContext'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { PaginatedResponse } from '@/types/pagination'

// ==========================================
// TYPES
// ==========================================

/**
 * Tipo de conversación de WhatsApp basado en la respuesta del API
 */
export interface WhatsAppConversation {
  id: string
  organization_id: string
  customer_id?: string | null
  customer_phone: string
  customer_name?: string | null
  status: 'active' | 'closed' | 'archived' | 'resolved' | 'pending'
  last_message_at: string
  last_message?: string | null
  messages_count: number
  is_bot_active: boolean
  assigned_to_user_id?: string | null
  escalated_at?: string | null
  escalation_reason?: string | null
  related_order_id?: string | null
  related_appointment_id?: string | null
  metadata?: Record<string, any>
  started_at: string
  closed_at?: string | null
  profile_picture_url?: string | null
  created_at: string
  updated_at: string
  // Lead relationship
  lead?: {
    id: string
    status: string
    lead_score?: number
    estimated_value?: number
    customer_id?: string
  } | null
}

interface UseWhatsAppConversationsOptions {
  page?: number
  pageSize?: number
  status?: 'all' | 'active' | 'closed' | 'archived' | 'resolved' | 'pending' | 'unread' | 'favorite'
  search?: string // Búsqueda por teléfono o nombre
  sortBy?: 'last_message_at' | 'created_at' | 'customer_name' | 'messages_count' // Campo de ordenamiento
  sortOrder?: 'asc' | 'desc' // Orden ascendente o descendente
  autoLoad?: boolean // Si debe cargar automáticamente al montar
  enableCache?: boolean // Habilitar cache simple
}

interface UseWhatsAppConversationsReturn {
  // Data
  conversations: WhatsAppConversation[]
  isLoading: boolean
  error: string | null
  
  // Pagination
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
  
  // Navigation Actions
  goToPage: (page: number) => void
  goToNextPage: () => void
  goToPreviousPage: () => void
  goToFirstPage: () => void
  goToLastPage: () => void
  changePageSize: (size: number) => void
  
  // Filter Actions
  setStatus: (status: UseWhatsAppConversationsOptions['status']) => void
  
  // Actions
  refresh: () => Promise<void>
  mutate: () => Promise<void> // Alias de refresh para compatibilidad con SWR
}

// ==========================================
// HOOK
// ==========================================

export function useWhatsAppConversations(
  page: number = 1,
  pageSize: number = 20,
  status: UseWhatsAppConversationsOptions['status'] = 'all',
  options: Omit<UseWhatsAppConversationsOptions, 'page' | 'pageSize' | 'status'> = {}
): UseWhatsAppConversationsReturn {
  
  // Extraer opciones adicionales
  const {
    search = '',
    sortBy = 'last_message_at',
    sortOrder = 'desc',
    ...restOptions
  } = options
  const {
    autoLoad = true,
    enableCache = false
  } = restOptions

  // ==========================================
  // STATE
  // ==========================================
  
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  })
  
  // Context
  const { organizationId, ready } = useOrganization()
  
  // Refs
  const isFetching = useRef(false)
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map())
  const subscriptionRef = useRef<any>(null)

  // ==========================================
  // FETCH FUNCTION
  // ==========================================
  
  const fetchConversations = useCallback(async () => {
    // Guard: No fetch si no está ready
    if (!organizationId || !ready) {
      console.log('⏳ [useWhatsAppConversations] Esperando organizationId...')
      setConversations([])
      setIsLoading(false)
      return
    }

    // Guard: Prevenir fetch múltiples simultáneos
    if (isFetching.current) {
      console.log('⏸️ [useWhatsAppConversations] Fetch ya en progreso, ignorando...')
      return
    }

    try {
      isFetching.current = true
      setIsLoading(true)
      setError(null)

      // Construir query params (usar parámetros directos)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())
      if (status && status !== 'all') {
        params.set('status', status)
      }
      if (search) {
        params.set('search', search)
      }
      if (sortBy) {
        params.set('sortBy', sortBy)
      }
      if (sortOrder) {
        params.set('sortOrder', sortOrder)
      }

      const url = `/api/whatsapp/conversations?${params.toString()}`
      console.log('🔄 [useWhatsAppConversations] Fetching:', url)

      // Check cache
      if (enableCache) {
        const cached = cacheRef.current.get(url)
        const cacheAge = cached ? Date.now() - cached.timestamp : Infinity
        
        // Cache válido por 30 segundos
        if (cached && cacheAge < 30000) {
          console.log('💾 [useWhatsAppConversations] Usando cache')
          const responseData = cached.data.data || cached.data
          setConversations(responseData.items || [])
          setPagination(responseData.pagination)
          setIsLoading(false)
          isFetching.current = false
          return
        }
      }

      // Fetch
      const result = await safeFetch<PaginatedResponse<WhatsAppConversation>>(url, { 
        timeout: 30000,
        headers: {
          'Cache-Control': 'no-cache'
        }
      })

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al cargar conversaciones')
      }

      // Extraer datos de la estructura PaginatedResponse
      const responseData = result.data.data || result.data
      const items = responseData.items || []
      const paginationData = responseData.pagination

      // Actualizar state
      setConversations(items)
      setPagination(paginationData)

      // Guardar en cache
      if (enableCache) {
        cacheRef.current.set(url, {
          data: result.data,
          timestamp: Date.now()
        })
      }

      console.log('✅ [useWhatsAppConversations] Conversaciones cargadas:', {
        items: items.length,
        page: paginationData.page,
        total: paginationData.total
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al cargar conversaciones', { description: errorMessage })
      console.error('❌ [useWhatsAppConversations] Error:', err)
    } finally {
      setIsLoading(false)
      isFetching.current = false
    }
  }, [organizationId, ready, page, pageSize, status, search, sortBy, sortOrder, enableCache])

  // ==========================================
  // NAVIGATION ACTIONS (No-op, controlado externamente)
  // ==========================================

  const goToPage = useCallback((newPage: number) => {
    // No-op: El componente controla la página
    console.warn('[useWhatsAppConversations] goToPage llamado pero el control es externo. Usa setPage del componente.')
  }, [])

  const goToNextPage = useCallback(() => {
    // No-op: El componente controla la página
    console.warn('[useWhatsAppConversations] goToNextPage llamado pero el control es externo.')
  }, [])

  const goToPreviousPage = useCallback(() => {
    // No-op: El componente controla la página
    console.warn('[useWhatsAppConversations] goToPreviousPage llamado pero el control es externo.')
  }, [])

  const goToFirstPage = useCallback(() => {
    // No-op: El componente controla la página
    console.warn('[useWhatsAppConversations] goToFirstPage llamado pero el control es externo.')
  }, [])

  const goToLastPage = useCallback(() => {
    // No-op: El componente controla la página
    console.warn('[useWhatsAppConversations] goToLastPage llamado pero el control es externo.')
  }, [])

  const changePageSize = useCallback((newSize: number) => {
    // No-op: El componente controla el pageSize
    console.warn('[useWhatsAppConversations] changePageSize llamado pero el control es externo.')
  }, [])

  // ==========================================
  // FILTER ACTIONS (No-op, controlado externamente)
  // ==========================================

  const setStatus = useCallback((newStatus: UseWhatsAppConversationsOptions['status']) => {
    // No-op: El componente controla el status
    console.warn('[useWhatsAppConversations] setStatus llamado pero el control es externo.')
  }, [])

  // ==========================================
  // EFFECTS
  // ==========================================

  // Auto-load on mount and when params change
  useEffect(() => {
    if (autoLoad && ready && organizationId) {
      fetchConversations()
    }
  }, [autoLoad, ready, organizationId, fetchConversations])

  // ✅ Suscripción Realtime para actualizar conversaciones automáticamente
  useEffect(() => {
    if (!organizationId || !ready) return

    const supabase = getSupabaseClient()
    
    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    console.log('🔄 [useWhatsAppConversations] Configurando suscripción Realtime...')

    // Suscribirse a cambios en conversaciones
    const subscription = supabase
      .channel('whatsapp-conversations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📨 [useWhatsAppConversations] Cambio detectado en conversaciones:', payload.eventType)
          
          // Refrescar conversaciones cuando hay cambios
          // Usar un pequeño delay para evitar múltiples refreshes
          setTimeout(() => {
            fetchConversations()
          }, 500)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📨 [useWhatsAppConversations] Cambio detectado en mensajes:', payload.eventType)
          
          // Refrescar conversaciones cuando hay nuevos mensajes
          setTimeout(() => {
            fetchConversations()
          }, 500)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ [useWhatsAppConversations] Suscripción Realtime activa')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [useWhatsAppConversations] Error en suscripción Realtime')
        }
      })

    subscriptionRef.current = subscription

    // Cleanup al desmontar
    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 [useWhatsAppConversations] Limpiando suscripción Realtime')
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [organizationId, ready, fetchConversations])

  // ==========================================
  // RETURN
  // ==========================================

  return {
    // Data
    conversations,
    isLoading,
    error,
    
    // Pagination
    pagination,
    
    // Navigation
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    changePageSize,
    
    // Filters
    setStatus,
    
    // Actions
    refresh: fetchConversations,
    mutate: fetchConversations // Alias para compatibilidad con SWR
  }
}

