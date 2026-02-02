/**
 * useWhatsAppMessages Hook con Realtime
 * Hook para cargar mensajes de una conversación específica con actualizaciones en tiempo real
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase/client'

// ==========================================
// TYPES
// ==========================================

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  organization_id: string
  message_id?: string | null
  direction: 'inbound' | 'outbound'
  body: string
  media_url?: string | null
  media_type?: string | null
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending'
  timestamp: string
  created_at: string
  updated_at: string
}

interface UseMessagesOptions {
  conversationId: string
  organizationId: string
  enableRealtime?: boolean // Habilitar actualizaciones en tiempo real (default: true)
  limit?: number // Límite de mensajes a cargar
}

interface UseMessagesReturn {
  // Data
  messages: WhatsAppMessage[]
  isLoading: boolean
  error: string | null
  
  // Realtime status
  realtimeConnected: boolean
  
  // Actions
  refresh: () => Promise<void>
  mutate: () => Promise<void> // Alias de refresh
}

// ==========================================
// HOOK
// ==========================================

export function useWhatsAppMessages(options: UseMessagesOptions): UseMessagesReturn {
  const {
    conversationId,
    organizationId,
    enableRealtime = true,
    limit = 100
  } = options

  // ==========================================
  // STATE
  // ==========================================
  
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  
  // Refs
  const isFetching = useRef(false)
  const subscriptionRef = useRef<any>(null)

  // ==========================================
  // FETCH FUNCTION
  // ==========================================
  
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !organizationId) {
      console.log('⏳ [useWhatsAppMessages] Esperando conversationId u organizationId...')
      setMessages([])
      setIsLoading(false)
      return
    }

    // Guard: Prevenir fetch múltiples simultáneos
    if (isFetching.current) {
      console.log('⏸️ [useWhatsAppMessages] Fetch ya en progreso, ignorando...')
      return
    }

    try {
      isFetching.current = true
      setIsLoading(true)
      setError(null)

      const url = `/api/whatsapp/conversations/${conversationId}/messages?limit=${limit}`
      console.log('🔄 [useWhatsAppMessages] Fetching:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al cargar mensajes')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar mensajes')
      }

      const data = result.data || []
      
      // Ordenar mensajes por timestamp (más antiguos primero)
      const sortedMessages = [...data].sort((a, b) => {
        const timeA = new Date(a.timestamp || a.created_at).getTime()
        const timeB = new Date(b.timestamp || b.created_at).getTime()
        return timeA - timeB
      })

      setMessages(sortedMessages)

      console.log('✅ [useWhatsAppMessages] Mensajes cargados:', sortedMessages.length)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      toast.error('Error al cargar mensajes', { description: errorMessage })
      console.error('❌ [useWhatsAppMessages] Error:', err)
    } finally {
      setIsLoading(false)
      isFetching.current = false
    }
  }, [conversationId, organizationId, limit])

  // ==========================================
  // REALTIME SUBSCRIPTION
  // ==========================================
  
  useEffect(() => {
    if (!enableRealtime || !conversationId || !organizationId) {
      console.log('📡 [useWhatsAppMessages] Realtime deshabilitado o sin conversationId/organizationId')
      return
    }

    console.log('📡 [useWhatsAppMessages] Suscribiendo a mensajes realtime...')
    
    const supabase = getSupabaseClient()
    
    // Limpiar suscripción anterior si existe
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }
    
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('🔔 [useWhatsAppMessages] Nuevo mensaje:', payload.new)
          
          // Agregar nuevo mensaje a la lista
          const newMessage = payload.new as WhatsAppMessage
          setMessages(prev => {
            // Evitar duplicados
            if (prev.some(m => m.id === newMessage.id)) {
              return prev
            }
            // Agregar y ordenar
            const updated = [...prev, newMessage].sort((a, b) => {
              const timeA = new Date(a.timestamp || a.created_at).getTime()
              const timeB = new Date(b.timestamp || b.created_at).getTime()
              return timeA - timeB
            })
            return updated
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('🔔 [useWhatsAppMessages] Mensaje actualizado:', payload.new)
          
          // Actualizar mensaje en la lista
          const updatedMessage = payload.new as WhatsAppMessage
          setMessages(prev => prev.map(m => 
            m.id === updatedMessage.id ? updatedMessage : m
          ))
        }
      )
      .subscribe((status) => {
        console.log('📡 [useWhatsAppMessages] Realtime status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ [useWhatsAppMessages] Suscripción Realtime activa')
          setRealtimeConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [useWhatsAppMessages] Error en suscripción Realtime')
          setRealtimeConnected(false)
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ [useWhatsAppMessages] Suscripción Realtime timeout')
          setRealtimeConnected(false)
        } else if (status === 'CLOSED') {
          console.log('🔌 [useWhatsAppMessages] Suscripción Realtime cerrada')
          setRealtimeConnected(false)
        }
      })
    
    subscriptionRef.current = messagesChannel
    
    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 [useWhatsAppMessages] Desconectando realtime mensajes...')
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [conversationId, organizationId, enableRealtime])

  // ==========================================
  // EFFECTS
  // ==========================================
  
  // Auto-load on mount and when params change
  useEffect(() => {
    if (conversationId && organizationId) {
      fetchMessages()
    }
  }, [conversationId, organizationId, fetchMessages])

  // ==========================================
  // RETURN
  // ==========================================
  
  return {
    // Data
    messages,
    isLoading,
    error,
    
    // Realtime status
    realtimeConnected,
    
    // Actions
    refresh: fetchMessages,
    mutate: fetchMessages // Alias para compatibilidad con SWR
  }
}
