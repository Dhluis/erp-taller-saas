'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useSession } from '@/lib/context/SessionContext'
import { getSupabaseClient } from '@/lib/supabase/client'
import { useWhatsAppConversations } from '@/hooks/useWhatsAppConversations'
import { Pagination } from '@/components/ui/pagination'
import {
  MessageSquare,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  CheckCircle2,
  XCircle,
  Moon,
  Sun,
  Phone,
  Mail,
  MapPin,
  Globe,
  DollarSign,
  Calendar,
  Clock,
  User,
  Filter,
  ChevronDown,
  Star,
  Archive,
  Trash2,
  Lock,
  Block,
  Download,
  Pin,
  BellOff,
  Sync,
  Settings,
  Reply,
  FileText,
  Clock as ClockIcon,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Video,
  File,
  X,
  Sparkles,
  Plus,
  Home,
  ArrowLeft,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { getDisplayName, formatMexicanPhone } from '@/lib/utils/phone-formatter'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { LeadManagementPanel } from '@/components/whatsapp/LeadManagementPanel'
import { LeadIndicator } from '@/components/whatsapp/LeadIndicator'
import type { LeadStatus } from '@/components/whatsapp/LeadStatusBadge'

// Tipos
interface Message {
  id: string
  text: string
  sender: 'agent' | 'customer'
  timestamp: Date
  read: boolean
  type?: 'text' | 'image' | 'video' | 'file' | 'internal'
}

interface Conversation {
  id: string
  contactName: string
  contactPhone: string
  contactEmail?: string
  lastMessage: string
  lastMessageTime: string
  unread: boolean
  status: 'pending' | 'active' | 'resolved' | 'archived'
  labels: string[]
  avatar?: string
  profilePictureUrl?: string
  isTyping?: boolean
  isFavorite?: boolean
  // Lead fields
  lead?: {
    id: string
    status: LeadStatus
    lead_score?: number
    estimated_value?: number
    customer_id?: string
  } | null
}

interface ContactDetails {
  name: string
  phone: string
  email?: string
  avatar?: string
  profilePictureUrl?: string
  lastMessage: string
  accountType: string
  country: string
  language: string
  currency: string
  started: string
  status: 'active' | 'resolved' | 'archived'
  device: string
  labels: string[]
  address?: string
  notes?: string
  metadata?: any
  // Lead fields
  lead?: {
    id: string
    status: LeadStatus
    lead_score?: number
    estimated_value?: number
    customer_id?: string
  } | null
}

export default function ConversacionesPage() {
  const router = useRouter()
  const { organization } = useAuth()
  const { organizationId, isLoading: sessionLoading, isReady: sessionReady } = useSession()
  const supabase = getSupabaseClient()
  const subscriptionRef = useRef<any>(null)
  const [darkMode, setDarkMode] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  
  // Handlers para búsqueda y ordenamiento
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setPage(1) // Reset a primera página al buscar
  }
  
  const handleSortChange = (newSortBy: typeof sortBy) => {
    setSortBy(newSortBy)
    setPage(1) // Reset a primera página al cambiar orden
  }
  
  const handleSortOrderChange = (newOrder: typeof sortOrder) => {
    setSortOrder(newOrder)
    setPage(1) // Reset a primera página al cambiar orden
  }
  
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize)
    setPage(1) // Reset a primera página al cambiar tamaño
  }
  const [messageText, setMessageText] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'Responder' | 'Nota' | 'Respuestas' | 'Programado' | 'IA Respuesta'>('Responder')
  const [scheduledDateTime, setScheduledDateTime] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isAddingLabel, setIsAddingLabel] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortBy, setSortBy] = useState<'last_message_at' | 'created_at' | 'customer_name' | 'messages_count'>('last_message_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isBotTyping, setIsBotTyping] = useState(false)
  const [realtimeConnected, setRealtimeConnected] = useState(false) // Estado de conexión realtime
  
  // Hook de conversaciones con paginación, búsqueda y ordenamiento
  // ✅ Realtime habilitado por defecto para actualizaciones automáticas
  const { conversations: hookConversations, pagination, isLoading: loadingConversations, error, mutate, realtimeConnected: hookRealtimeConnected } = useWhatsAppConversations(
    page,
    pageSize,
    activeFilter === 'all' ? 'all' : activeFilter === 'resolved' ? 'resolved' : activeFilter === 'unread' ? 'unread' : activeFilter === 'favorite' ? 'favorite' : 'all',
    {
      search: searchQuery,
      sortBy,
      sortOrder,
      enableRealtime: true // ✅ Habilitar actualizaciones en tiempo real
    }
  )
  
  // Sincronizar estado de realtime del hook con el estado local
  useEffect(() => {
    setRealtimeConnected(hookRealtimeConnected)
  }, [hookRealtimeConnected])
  
  // Emojis comunes
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
    '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
    '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👏', '🙌',
    '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦵', '🦶', '👂', '👃',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
    '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
    '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
    '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
    '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
    '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
    '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️',
    '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❓', '❕',
    '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️',
    '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠',
    'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂',
    '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶',
    '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒',
    '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣',
    '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '▶️', '⏸️', '⏯️', '⏹️',
    '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽',
    '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️',
    '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵',
    '🎶', '➕', '➖', '➗', '✖️', '💲', '💱', '™️', '©️', '®️',
    '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔜', '🔝', '🛐', '✡️'
  ]
  
  const insertEmoji = (emoji: string) => {
    setMessageText(prev => prev + emoji)
    setEmojiPickerOpen(false)
  }

  // Estado de mensajes (conversaciones vienen del hook)
  const [messages, setMessages] = useState<Message[]>([])
  
  // Función para formatear tiempo relativo (debe estar antes de usarse)
  const formatRelativeTime = (date: Date | string): string => {
    const now = new Date()
    const messageDate = typeof date === 'string' ? new Date(date) : date
    const diffMs = now.getTime() - messageDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}d`
    return messageDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }
  
  // Mapear conversaciones del hook al formato del componente
  const conversations: Conversation[] = hookConversations.map((conv) => {
    // ✅ FIX: Usar helper para obtener nombre formateado correctamente
    const contactName = getDisplayName(conv.customer_name, conv.customer_phone)
    
    return {
      id: conv.id,
      contactName,
      contactPhone: conv.customer_phone || 'Sin teléfono',
      contactEmail: undefined, // Se puede obtener de customer_id si es necesario
      lastMessage: conv.last_message || 'Sin mensajes',
      lastMessageTime: conv.last_message_at ? formatRelativeTime(conv.last_message_at) : 'Nunca',
      unread: false, // Se puede calcular basado en mensajes no leídos
      status: (conv.status || 'active') as 'active' | 'resolved' | 'archived',
      labels: Array.isArray((conv.metadata as any)?.labels) ? (conv.metadata as any).labels : [],
      avatar: undefined,
      profilePictureUrl: conv.profile_picture_url || undefined,
      isTyping: false,
      isFavorite: false,
      // Lead data from API
      lead: (conv as any).lead ? {
        id: (conv as any).lead.id,
        status: (conv as any).lead.status as LeadStatus,
        lead_score: (conv as any).lead.lead_score,
        estimated_value: (conv as any).lead.estimated_value,
        customer_id: (conv as any).lead.customer_id
      } : null
    }
  })

  const [contactDetails, setContactDetails] = useState<ContactDetails | null>(null)

  const selectedConv = conversations.find(c => c.id === selectedConversation)
  const isResolved = selectedConv?.status === 'resolved'
  const isSessionLoadingUI = sessionLoading || !sessionReady || !organizationId

  // Seleccionar primera conversación si no hay seleccionada y hay conversaciones
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      const firstConv = conversations[0]
      if (firstConv && firstConv.id) {
        console.log('🎯 [useEffect] Seleccionando primera conversación:', firstConv.id)
        setSelectedConversation(firstConv.id)
      }
    }
  }, [conversations, selectedConversation])

  // Flag para evitar múltiples peticiones simultáneas
  const loadingRef = useRef<string | null>(null)
  // Ref para rastrear la última conversación cargada y evitar loops
  const lastLoadedConversationRef = useRef<string | null>(null)
  // Ref para almacenar conversaciones actuales sin causar re-renders
  const conversationsRef = useRef(conversations)
  
  // Actualizar ref cuando cambian las conversaciones
  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  // Cargar mensajes de una conversación
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      console.warn('⚠️ [loadMessages] No hay conversationId')
      return
    }
    
    // ✅ Prevenir múltiples peticiones simultáneas para la misma conversación
    if (loadingRef.current === conversationId) {
      console.log('⏳ [loadMessages] Ya hay una petición en curso para esta conversación')
      return
    }
    
    if (!organizationId) {
      if (sessionLoading || !sessionReady) {
        console.log('⏳ [loadMessages] Esperando organizationId (sesión en carga)...')
        return
      }
      console.warn('⚠️ [loadMessages] No hay organizationId disponible')
      toast.error('No se encontró la organización')
      return
    }

    try {
      loadingRef.current = conversationId
      setLoadingMessages(true)
      
      // ✅ Usar API route en lugar de query directa
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/messages?limit=100`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || 'Error al cargar mensajes'
        
        // ✅ Manejar error 404 específicamente: la conversación no existe
        if (response.status === 404) {
          console.warn('⚠️ [loadMessages] Conversación no encontrada:', conversationId)
          toast.error('La conversación no existe o fue eliminada')
          // Limpiar mensajes y deseleccionar conversación
          setMessages([])
          setSelectedConversation(null)
          lastLoadedConversationRef.current = null // ✅ Limpiar ref para permitir recarga
          return
        }
        
        // ✅ Manejar error 403: no autorizado
        if (response.status === 403) {
          console.warn('⚠️ [loadMessages] No autorizado para esta conversación:', conversationId)
          toast.error('No tienes permiso para ver esta conversación')
          setMessages([])
          setSelectedConversation(null)
          lastLoadedConversationRef.current = null // ✅ Limpiar ref para permitir recarga
          return
        }
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Error al cargar mensajes')
      }

      const data = result.data || []

      const formattedMessages: Message[] = (data || []).map((msg: any) => {
        // La columna correcta es created_at, no timestamp
        const timestamp = msg.created_at || msg.sent_at || msg.timestamp
        let date: Date
        try {
          date = timestamp ? new Date(timestamp) : new Date()
          // Validar que la fecha sea válida
          if (isNaN(date.getTime())) {
            date = new Date()
          }
        } catch {
          date = new Date()
        }
        
        return {
          id: msg.id || Date.now().toString(),
          text: msg.body || msg.content || msg.text || '',
        sender: msg.direction === 'inbound' ? 'customer' : 'agent',
          timestamp: date,
          read: msg.status === 'read' || msg.status === 'delivered' || false,
        type: (msg.metadata?.is_internal_note || msg.is_internal_note) ? 'internal' : (msg.message_type || msg.type || 'text')
        }
      })

      setMessages(formattedMessages)

      // Cargar detalles del contacto
      // ✅ Usar ref para acceder a conversaciones sin incluirlas en dependencias
      const conv = conversationsRef.current.find(c => c.id === conversationId)
      if (conv && conv.contactPhone) {
        // ✅ Usar API route para obtener detalles de conversación
        let customerData: any = null
        let convData: any = null
        
        try {
          const convResponse = await fetch(`/api/whatsapp/conversations/${conversationId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-store',
          })

          if (convResponse.ok) {
            const convResult = await convResponse.json()
            if (convResult.success && convResult.data) {
              convData = convResult.data
              customerData = convResult.data.customer || null
            }
          }
        } catch (error) {
          console.warn('⚠️ [loadMessages] Error cargando detalles de conversación:', error)
        }

        // Si no se encontró por ID, intentar por teléfono (normalizar formato)
        if (!customerData && conv.contactPhone) {
          // ✅ Usar API route para buscar cliente por teléfono
          try {
            // Normalizar teléfono: remover +, espacios, guiones, solo números
            const normalizedPhone = conv.contactPhone.replace(/[\s\+\-\(\)]/g, '')
            
            // Obtener todos los clientes y filtrar por teléfono en el frontend
            const customersResponse = await fetch('/api/customers', {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
              cache: 'no-store',
            })

            if (customersResponse.ok) {
              const customersResult = await customersResponse.json()
              if (customersResult.success && customersResult.data) {
                // ✅ FIX: Manejar estructura paginada { data: { items, pagination } }
                const customers = customersResult.data?.items || customersResult.data || [];
                customerData = customers.find((c: any) => {
                  if (!c.phone) return false
                  const normalizedCustomerPhone = c.phone.replace(/[\s\+\-\(\)]/g, '')
                  return normalizedCustomerPhone === normalizedPhone || 
                         normalizedCustomerPhone.endsWith(normalizedPhone) ||
                         normalizedPhone.endsWith(normalizedCustomerPhone)
                }) || null
              }
            }
          } catch (error) {
            console.warn('⚠️ [loadMessages] Error buscando cliente por teléfono:', error)
          }
        }

        setContactDetails({
          name: conv.contactName || 'Cliente WhatsApp',
          phone: formatMexicanPhone(conv.contactPhone) || 'Sin teléfono',
          email: customerData?.email || undefined,
          profilePictureUrl: conv.profilePictureUrl || undefined,
          lastMessage: conv.lastMessageTime || 'Nunca',
          accountType: 'Cuenta personal',
          country: 'México',
          language: 'Español',
          currency: 'Peso Mexicano',
          started: convData && (convData as any).created_at ? formatRelativeTime((convData as any).created_at) : 'Nunca',
          status: (conv.status === 'pending' ? 'active' : conv.status) || 'active' as 'active' | 'resolved' | 'archived',
          device: 'WhatsApp',
          labels: Array.isArray(conv.labels) ? conv.labels.filter((l): l is string => Boolean(l)) : [],
          address: customerData?.address || undefined,
          notes: convData && (convData as any).metadata?.notes ? (convData as any).metadata.notes : undefined, // Notas están en metadata
          metadata: convData && (convData as any).metadata ? (convData as any).metadata : undefined,
          // Lead data from conversation
          lead: conv.lead || null
        })
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al cargar mensajes'
      
      // ✅ Solo mostrar toast si no es un error de red (ERR_INSUFFICIENT_RESOURCES)
      if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('ERR_INSUFFICIENT_RESOURCES')) {
        toast.error(errorMessage)
      } else {
        console.warn('⚠️ [loadMessages] Error de red, omitiendo toast para evitar spam')
      }
      
      // Limpiar mensajes en caso de error
      setMessages([])
    } finally {
      setLoadingMessages(false)
      loadingRef.current = null
    }
  }, [organizationId, sessionLoading, sessionReady]) // ✅ Remover conversations de dependencias

  // Resetear a página 1 cuando cambia el filtro
  useEffect(() => {
    setPage(1)
  }, [activeFilter])

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversation && selectedConversation !== lastLoadedConversationRef.current) {
      lastLoadedConversationRef.current = selectedConversation
      loadMessages(selectedConversation)
    }
  }, [selectedConversation]) // ✅ Remover loadMessages de dependencias para evitar loops

  // Aplicar dark mode al body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // ✅ Filtrado ahora se hace en el backend, usar conversaciones directamente
  // Solo mantener filtro de frontend para estados especiales (unread, favorite) si no están en backend
  const filteredConversations = conversations.filter(conv => {
    if (!conv) return false
    
    // Filtros que aún se hacen en frontend (si no están soportados en backend)
    const matchesFilter = 
      activeFilter === 'all' ||
      activeFilter === 'resolved' ||
      (activeFilter === 'unread' && conv.unread) ||
      (activeFilter === 'favorite' && conv.isFavorite)

    return matchesFilter
  })

  // Suscripción realtime para nuevos mensajes
  useEffect(() => {
    if (!organizationId) {
      console.warn('⚠️ [Realtime] No hay organizationId, omitiendo suscripción')
      return
    }

    // Limpiar suscripción anterior
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    // Crear suscripción mejorada para mensajes Y conversaciones
    const channel = supabase
      .channel(`whatsapp-realtime-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('📨 Nuevo mensaje:', payload)
          
          // Manejar nuevo mensaje
          if (payload.eventType === 'INSERT' && payload.new?.conversation_id === selectedConversation) {
            const newMsg = payload.new as any
            
            // Mostrar indicador si es del bot
            if (newMsg?.is_from_bot && newMsg?.direction === 'outbound') {
              setIsBotTyping(true)
            }

            // Recargar mensajes de la conversación actual
            if (selectedConversation) {
              loadMessages(selectedConversation)
            }
          }

          // Ocultar indicador cuando el mensaje se completa
          if (payload.eventType === 'UPDATE' && payload.new?.is_from_bot) {
            setIsBotTyping(false)
          }
          
          // Siempre recargar lista de conversaciones para actualizar last_message
          mutate()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_conversations',
          filter: `organization_id=eq.${organizationId}`
        },
        (payload) => {
          console.log('💬 Cambio en conversación:', payload)
          
          // Recargar lista completa en cualquier cambio
          mutate()
          
          // Si se creó nueva conversación, seleccionarla automáticamente si no hay ninguna seleccionada
          if (payload.eventType === 'INSERT' && !selectedConversation) {
            const newConv = payload.new as any
            if (newConv?.id) {
              console.log('🆕 Nueva conversación detectada, seleccionando:', newConv.id)
              setSelectedConversation(newConv.id)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime connection status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime suscripción activa')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en canal Realtime')
        } else if (status === 'TIMED_OUT') {
          console.warn('⏱️ Realtime timeout, reintentando...')
        }
      })

    subscriptionRef.current = channel

    // Cleanup al desmontar
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [organizationId, selectedConversation, supabase, loadMessages, mutate])

  // Marcar mensajes como leídos cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversation) {
      // Marcar conversación como leída (actualizar en BD si es necesario)
      // Las conversaciones se refrescan automáticamente desde el hook
    }
  }, [selectedConversation])

  // Respuestas rápidas
  const quickReplies = [
    '¡Hola! ¿En qué puedo ayudarte?',
    'Gracias por contactarnos. Estamos revisando tu solicitud.',
    'Tu solicitud ha sido recibida. Te responderemos pronto.',
    '¿Necesitas ayuda con algo más?',
    '¡Perfecto! ¿Hay algo más en lo que pueda ayudarte?',
    'Entendido. Voy a revisar eso ahora mismo.',
    'Gracias por tu paciencia. Estamos trabajando en tu caso.',
    '¿Podrías proporcionar más detalles sobre tu consulta?'
  ]

  const insertQuickReply = (reply: string) => {
    setMessageText(reply)
    setActiveTab('Responder')
  }

  // Funciones de utilidad
  // Nota: updateConversation eliminado - las conversaciones vienen del hook
  // Usar mutate() después de actualizar en la BD para refrescar

  const updateContactDetails = (updates: Partial<ContactDetails>) => {
    setContactDetails(prev => {
      if (!prev) {
        // Si no hay contactDetails previo, crear uno con valores por defecto
        return {
          name: updates.name || 'Cliente WhatsApp',
          phone: updates.phone || 'Sin teléfono',
          email: updates.email,
          lastMessage: updates.lastMessage || 'Nunca',
          accountType: updates.accountType || 'Cuenta personal',
          country: updates.country || 'México',
          language: updates.language || 'Español',
          currency: updates.currency || 'Peso Mexicano',
          started: updates.started || 'Nunca',
          status: updates.status || 'active',
          device: updates.device || 'WhatsApp',
          labels: updates.labels || [],
          address: updates.address,
          notes: updates.notes
        } as ContactDetails
      }
      return { ...prev, ...updates }
    })
  }

  // Funciones de mensajes
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return

    if (!organizationId) {
      if (sessionLoading || !sessionReady) {
        toast.info('Cargando organización, intenta en unos segundos')
        return
      }
      toast.error('No se encontró la organización')
      return
    }

    const messageToSend = messageText
    const isInternalNote = activeTab === 'Nota'
    const conv = conversations.find(c => c.id === selectedConversation)
    
    if (!conv) {
      toast.error('Conversación no encontrada')
      return
    }

    if (!conv.contactPhone) {
      toast.error('No hay número de teléfono asociado a esta conversación')
      return
    }

    setIsSendingMessage(true)
    setMessageText('') // Limpiar inmediatamente para mejor UX

    try {
      // Si es nota interna, guardar en BD como mensaje interno Y actualizar campo notes
      if (isInternalNote) {
        try {
          // Guardar como mensaje interno en whatsapp_messages
          // Usar la estructura de la tabla según migración 014
          const { data: savedMessage, error: messageError } = await supabase
            .from('whatsapp_messages')
            .insert({
              conversation_id: selectedConversation,
              organization_id: organizationId,
              direction: 'outbound',
              from_number: '', // Nota interna, no tiene remitente externo
              to_number: conv.contactPhone || '',
              body: messageToSend,
              message_type: 'text',
              status: 'sent',
              metadata: { is_internal_note: true }
            })
            .select()
            .single()

          if (messageError) {
            console.error('Error guardando nota interna como mensaje:', messageError)
            throw messageError
          }

          // Actualizar campo notes en metadata (ya que la columna notes puede no existir)
          const currentMetadata = contactDetails?.metadata || {}
          const currentNotes = (currentMetadata.notes as string) || contactDetails?.notes || ''
          const newNotes = currentNotes 
            ? `${currentNotes}\n\n[${new Date().toLocaleString('es-ES')}] ${messageToSend}`
            : `[${new Date().toLocaleString('es-ES')}] ${messageToSend}`
          
          const { error: notesError } = await supabase
            .from('whatsapp_conversations')
            .update({ 
              metadata: {
                ...currentMetadata,
                notes: newNotes
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', selectedConversation)

          if (notesError) {
            console.error('Error actualizando notas de conversación:', notesError)
            // No lanzar error, solo loguear - el mensaje ya se guardó
          }

          // Actualizar estado local
        const newMessage: Message = {
            id: savedMessage?.id || Date.now().toString(),
          text: messageToSend,
          sender: 'agent',
          timestamp: new Date(),
          read: true,
          type: 'internal'
        }
        setMessages(prev => [...prev, newMessage])
          
          // Actualizar contactDetails con las nuevas notas
          updateContactDetails({ notes: newNotes })
          
          // Recargar mensajes para asegurar sincronización
          await loadMessages(selectedConversation)
          
        toast.success('Nota interna agregada')
          setMessageText('') // Limpiar input
        } catch (error) {
          console.error('Error guardando nota interna:', error)
          toast.error('Error al guardar nota interna')
        } finally {
        setIsSendingMessage(false)
        }
        return
      }

      // Enviar mensaje real usando el API
      const requestBody = {
        conversationId: selectedConversation,
        to: conv.contactPhone || '',
        message: messageToSend,
        type: 'text' as const
      }
      
      console.log('📤 [sendMessage] ===== INICIANDO ENVÍO =====')
      console.log('📤 [sendMessage] Datos del mensaje:', {
        conversationId: selectedConversation,
        to: conv.contactPhone,
        messageLength: messageToSend.length,
        messagePreview: messageToSend.substring(0, 50) + '...',
        body: requestBody
      })

      try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        console.log('📥 [sendMessage] Respuesta HTTP:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
      })

      const result = await response.json()
        
        console.log('📊 [sendMessage] Resultado JSON:', result)

        if (!response.ok) {
          console.error('❌ [sendMessage] Error HTTP:', {
            status: response.status,
            statusText: response.statusText,
            result
          })
          throw new Error(result.error || `Error HTTP ${response.status}: ${response.statusText}`)
        }

      if (!result.success) {
          console.error('❌ [sendMessage] Error en respuesta:', result.error)
        throw new Error(result.error || 'Error al enviar mensaje')
        }

        console.log('✅ [sendMessage] Mensaje enviado exitosamente')
      } catch (fetchError) {
        console.error('❌ [sendMessage] Error en fetch:', fetchError)
        throw fetchError
      }

      // Recargar mensajes para obtener el mensaje guardado en BD
      await loadMessages(selectedConversation)
      
      // Recargar conversaciones para actualizar last_message
      await mutate()

      toast.success('Mensaje enviado')
    } catch (error) {
      console.error('Error enviando mensaje:', error)
      toast.error(error instanceof Error ? error.message : 'Error al enviar mensaje')
      setMessageText(messageToSend) // Restaurar texto en caso de error
    } finally {
      setIsSendingMessage(false)
    }
  }

  const scheduleMessage = async () => {
    if (!messageText.trim() || !scheduledDateTime || !selectedConversation) {
      toast.error('Por favor completa el mensaje y la fecha/hora')
      return
    }

    const conv = conversations.find(c => c.id === selectedConversation)
    if (!conv || !conv.contactPhone) {
      toast.error('No hay número de teléfono asociado a esta conversación')
      return
    }

    try {
      // Guardar mensaje programado en metadata de la conversación
      // En el futuro se puede crear una tabla scheduled_messages
      const scheduledMessages = (contactDetails?.metadata as any)?.scheduled_messages || []
      const newScheduledMessage = {
        id: Date.now().toString(),
        message: messageText,
        scheduledAt: scheduledDateTime,
        to: conv.contactPhone,
        createdAt: new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          metadata: {
            ...(contactDetails?.metadata || {}),
            scheduled_messages: [...scheduledMessages, newScheduledMessage]
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation)

      if (error) throw error

    toast.success(`Mensaje programado para ${new Date(scheduledDateTime).toLocaleString('es-ES')}`)
    setMessageText('')
    setScheduledDateTime('')
    setActiveTab('Responder')
      
      // Actualizar contactDetails localmente
      updateContactDetails({
        metadata: {
          ...(contactDetails?.metadata || {}),
          scheduled_messages: [...scheduledMessages, newScheduledMessage]
        }
      })
    } catch (error) {
      console.error('Error programando mensaje:', error)
      toast.error('Error al programar mensaje')
    }
  }

  const generateAIResponse = async () => {
    if (!messageText.trim()) {
      toast.error('Por favor escribe un mensaje primero')
      return
    }

    toast.loading('Generando respuesta con IA...')
    
    // Simular respuesta de IA
    setTimeout(() => {
      const aiResponse = `Basado en tu mensaje "${messageText}", aquí está una respuesta sugerida: "Gracias por contactarnos. Estamos revisando tu solicitud y te responderemos pronto."`
      setMessageText(aiResponse)
      toast.dismiss()
      toast.success('Respuesta de IA generada')
    }, 2000)
  }

  // Funciones de acciones del chat
  const handleResolveChat = async () => {
    if (!selectedConversation || !organizationId) return
    
    const newStatus = isResolved ? 'active' : 'resolved'
    
    try {
      console.log(`[handleResolveChat] Actualizando estado a: ${newStatus}`, {
        conversationId: selectedConversation,
        organizationId
      })
      
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation)
        .eq('organization_id', organizationId) // Agregar filtro de organización para RLS

      if (error) {
        console.error('[handleResolveChat] Error en update:', error)
        throw error
      }

      updateContactDetails({ status: newStatus })
      await mutate() // Recargar para actualizar filtros
      toast.success(newStatus === 'resolved' ? 'Chat resuelto' : 'Chat reactivado')
    } catch (error: any) {
      console.error('[handleResolveChat] Error actualizando estado:', error)
      toast.error(`Error al actualizar estado: ${error.message || 'Error desconocido'}`)
    }
  }

  const handleReassign = async () => {
    if (!selectedAgent || !selectedConversation) {
      toast.error('Por favor selecciona un agente')
      return
    }
    
    try {
      // Guardar agente asignado en metadata o en un campo específico
      // Por ahora usaremos metadata JSONB si existe, o actualizaremos customer_name temporalmente
      // En el futuro se puede agregar un campo assigned_agent_id
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          metadata: { assigned_agent: selectedAgent },
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation)

      if (error) throw error
    
    toast.success(`Chat reasignado a ${selectedAgent}`)
    setReassignDialogOpen(false)
    setSelectedAgent('')
      
      // Recargar conversaciones para reflejar el cambio
      await mutate()
    } catch (error) {
      console.error('Error reasignando chat:', error)
      toast.error('Error al reasignar chat')
    }
  }

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'Mark as unread':
        if (selectedConversation) {
          // Actualizar en BD y refrescar
          mutate()
          toast.success('Chat marcado como no leído')
        }
        break
      case 'Export chat':
        const chatData = {
          conversation: selectedConv,
          messages: messages.filter(m => selectedConv?.id === selectedConversation)
        }
        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `chat-${selectedConv?.contactName || 'cliente'}-${Date.now()}.json`
        a.click()
        toast.success('Chat exportado')
        break
      case 'Pin chat':
        toast.success('Chat fijado')
        break
      case 'Mute chat':
        toast.success('Chat silenciado')
        break
      case 'Sync messages':
        toast.loading('Sincronizando mensajes...')
        setTimeout(() => toast.success('Mensajes sincronizados'), 1500)
        break
      case 'Lock chat':
        toast.success('Chat bloqueado')
        break
      case 'Block contact':
        if (selectedConversation) {
          // Actualizar en BD y refrescar
          mutate()
          toast.success('Contacto bloqueado')
        }
        break
      case 'Delete chat':
        if (selectedConversation) {
          setDeleteDialogOpen(true)
        }
        break
    }
  }

  // Función para eliminar conversación
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      console.log('[Delete Conversation] 🗑️ Eliminando conversación:', conversationId)
      
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar conversación')
      }

      console.log('[Delete Conversation] ✅ Conversación eliminada:', data)
      
      // Cerrar conversación seleccionada
      setSelectedConversation(null)
      
      // Refrescar lista de conversaciones
      await mutate()
      
      toast.success('Conversación eliminada')
    } catch (error: any) {
      console.error('[Delete Conversation] ❌ Error:', error)
      toast.error(error.message || 'Error al eliminar conversación')
    }
  }

  // Funciones de etiquetas y notas
  const addLabel = async () => {
    if (!newLabel.trim()) {
      toast.error('Por favor ingresa una etiqueta')
      return
    }
    
    if (!selectedConversation) return

    const conv = conversations.find(c => c.id === selectedConversation)
    if (!conv) return

    const currentLabels = contactDetails?.labels || conv.labels || []
    if (currentLabels.includes(newLabel)) {
      toast.error('Esta etiqueta ya existe')
      return
    }
    
    const newLabels = [...currentLabels, newLabel]
    
    // Actualizar en BD
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ labels: newLabels })
        .eq('id', selectedConversation)

      if (error) throw error

      updateContactDetails({ labels: newLabels })
      await mutate() // Refrescar conversaciones
      
      setNewLabel('')
      setIsAddingLabel(false)
      toast.success('Etiqueta agregada')
    } catch (error) {
      console.error('Error agregando etiqueta:', error)
      toast.error('Error al agregar etiqueta')
    }
  }

  const removeLabel = async (label: string) => {
    if (!selectedConversation) return

    const conv = conversations.find(c => c.id === selectedConversation)
    if (!conv) return

    const currentLabels = contactDetails?.labels || conv.labels || []
    const newLabels = currentLabels.filter(l => l !== label)
    
    // Actualizar en BD
    try {
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ labels: newLabels })
        .eq('id', selectedConversation)

      if (error) throw error

      updateContactDetails({ labels: newLabels })
      await mutate() // Refrescar conversaciones
      
      toast.success('Etiqueta eliminada')
    } catch (error) {
      console.error('Error eliminando etiqueta:', error)
      toast.error('Error al eliminar etiqueta')
    }
  }

  const saveNotes = async () => {
    if (!selectedConversation) return
    
    try {
      // Guardar notas en metadata ya que la columna notes puede no existir
      const currentMetadata = contactDetails?.metadata || {}
      const { error } = await supabase
        .from('whatsapp_conversations')
        .update({ 
          metadata: {
            ...currentMetadata,
            notes: contactDetails?.notes || ''
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedConversation)

      if (error) throw error

      // Recargar mensajes para actualizar contactDetails
      await loadMessages(selectedConversation)
      
    toast.success('Notas guardadas')
    setIsEditingNotes(false)
    } catch (error) {
      console.error('Error guardando notas:', error)
      toast.error('Error al guardar notas')
    }
  }

  const handleFileUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*,.pdf,.doc,.docx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        toast.success(`Archivo "${file.name}" seleccionado. La subida de medios está en desarrollo.`)
      }
    }
    input.click()
  }

  // Agentes disponibles para reasignación - cargar desde BD
  const [availableAgents, setAvailableAgents] = useState<Array<{ id: string; name: string }>>([])
  const [loadingAgents, setLoadingAgents] = useState(false)

  // Cargar agentes (empleados activos) desde la BD
  useEffect(() => {
    const loadAgents = async () => {
      if (!organizationId) return
      
      try {
        setLoadingAgents(true)
        // Intentar obtener empleados activos
        // ✅ Usar API route para obtener empleados
        const employeesResponse = await fetch('/api/employees?active=true&limit=50', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        })

        if (employeesResponse.ok) {
          const employeesResult = await employeesResponse.json()
          if (employeesResult.success && employeesResult.data) {
            setAvailableAgents((employeesResult.data || []).map((emp: any) => ({
              id: emp.id,
              name: emp.name
            })))
            return
          }
        }

        // Fallback: intentar con usuarios del sistema
        console.warn('Error cargando empleados, intentando con usuarios')
        const usersResponse = await fetch('/api/users', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        })

        if (usersResponse.ok) {
          const usersResult = await usersResponse.json()
          if (usersResult.success && usersResult.data) {
            setAvailableAgents((usersResult.data || []).map((u: any) => ({
              id: u.auth_user_id || u.id,
              name: u.full_name || u.email || 'Usuario sin nombre'
            })))
            return
          }
        }

        // Si falla todo, no hay agentes disponibles
        console.error('Error cargando usuarios: No se pudieron cargar agentes desde la BD')
        setAvailableAgents([])
      } catch (error) {
        console.error('Error cargando agentes:', error)
        // No usar fallback mock, dejar array vacío
        setAvailableAgents([])
      } finally {
        setLoadingAgents(false)
      }
    }

    loadAgents()
  }, [organizationId, supabase])

  return isSessionLoadingUI ? (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">Cargando conversaciones...</p>
      </div>
    </div>
  ) : (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      darkMode ? "bg-[#0A0E1A] text-white" : "bg-gray-50 text-gray-900"
    )}>
      <div className="flex h-screen overflow-hidden">
        {/* Top Navigation Bar */}
        <div className={cn(
          "fixed top-0 left-0 right-0 z-50 border-b transition-colors",
          darkMode ? "bg-[#0A0E1A] border-gray-800" : "bg-white border-gray-200"
        )}>
          <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Botón para volver al Dashboard */}
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  if (sessionLoading || !sessionReady) {
                    toast.info('Cargando sesión, intenta de nuevo en un momento')
                    return
                  }
                  if (!organizationId) {
                    toast.error('No se encontró la organización')
                    return
                  }
                  router.push('/dashboard')
                }}
                className={cn(
                  "flex items-center gap-2 font-semibold",
                  darkMode ? "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-500" : "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                )}
              >
                <Home className="w-4 h-4" />
                <span>Dashboard</span>
                <ArrowLeft className="w-3 h-3 ml-1" />
              </Button>
              <div className={cn("h-6 w-px", darkMode ? "bg-gray-700" : "bg-gray-300")}></div>
              <Button
                variant="ghost"
                className={cn(
                  "relative px-4 py-2 rounded-none border-b-2 border-transparent hover:border-primary transition-colors",
                  darkMode ? "text-white hover:text-cyan-400" : "text-gray-700 hover:text-blue-600"
                )}
              >
                <span className="flex items-center gap-2">
                  Atención al Cliente
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                </span>
              </Button>
              
              {/* Indicador de conexión Realtime */}
              <div className="flex items-center gap-2 text-xs">
                <div className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  realtimeConnected ? "bg-green-500 animate-pulse" : "bg-gray-400"
                )} />
                <span className={cn(
                  darkMode ? "text-gray-400" : "text-gray-600"
                )}>
                  {realtimeConnected ? "Actualizaciones en vivo" : "Conectando..."}
                </span>
              </div>
              <Button
                variant="ghost"
                className={cn(
                  "px-4 py-2 rounded-none border-b-2 border-transparent hover:border-primary transition-colors",
                  darkMode ? "text-gray-400 hover:text-cyan-400" : "text-gray-500 hover:text-blue-600"
                )}
              >
                Ventas
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "px-4 py-2 rounded-none border-b-2 border-transparent hover:border-primary transition-colors",
                  darkMode ? "text-gray-400 hover:text-cyan-400" : "text-gray-500 hover:text-blue-600"
                )}
              >
                Reclutamiento
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className={darkMode ? "text-gray-400" : "text-gray-600"}>
                <span className="text-sm font-semibold">32</span>
              </Button>
              <Button variant="ghost" size="icon" className={darkMode ? "text-gray-400" : "text-gray-600"}>
                <span className="text-sm font-semibold">24</span>
              </Button>
              {/* Dark Theme Toggle */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
              )}>
                <Label htmlFor="dark-mode-toggle" className={cn(
                  "text-sm font-medium cursor-pointer flex items-center gap-2",
                  darkMode ? "text-white" : "text-gray-900"
                )}>
                  {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </Label>
                <Switch
                  id="dark-mode-toggle"
                  checked={darkMode}
                  onCheckedChange={setDarkMode}
                />
              </div>
              <Button variant="ghost" size="icon" className={darkMode ? "text-gray-400" : "text-gray-600"}>
                <User className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Left Sidebar - Chat List */}
        <div className={cn(
          "w-80 border-r flex flex-col transition-colors pt-16",
          darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200"
        )}>
          {/* Search Bar */}
          <div className={cn(
            "p-4 border-b",
            darkMode ? "border-gray-800" : "border-gray-200"
          )}>
            <div className="relative">
              <Search className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
                darkMode ? "text-gray-500" : "text-gray-400"
              )} />
              <Input
                placeholder="Contactos, mensaje, @agente o etiqueta"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={cn(
                  "pl-10",
                  darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
                )}
              />
            </div>
          </div>

          {/* Filters */}
          <div className={cn(
            "p-4 border-b overflow-x-auto",
            darkMode ? "border-gray-800 bg-gray-900" : "border-gray-200 bg-gray-50"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "text-sm font-medium flex items-center gap-1",
                darkMode ? "text-gray-300" : "text-gray-700"
              )}>
                Chats
                <ChevronDown className="w-4 h-4" />
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'unread', 'resolved', 'favorite'].map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "ghost"}
                  size="sm"
                  onClick={() => {
                    setActiveFilter(filter)
                    setPage(1) // Reset a primera página al cambiar filtro
                  }}
                  className={cn(
                    "text-xs capitalize",
                    activeFilter === filter 
                      ? (darkMode ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700")
                      : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800")
                  )}
                >
                  {filter === 'all' ? 'Todos' : filter === 'unread' ? 'No leídos' : filter === 'resolved' ? 'Resueltos' : 'Favoritos'}
                </Button>
              ))}
              
              {/* Controles de ordenamiento */}
              <div className="flex items-center gap-2 ml-auto">
                <span className={cn(
                  "text-xs",
                  darkMode ? "text-gray-400" : "text-gray-600"
                )}>
                  Ordenar:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as typeof sortBy)}
                  className={cn(
                    "text-xs px-2 py-1 rounded border",
                    darkMode 
                      ? "bg-gray-800 border-gray-700 text-white" 
                      : "bg-white border-gray-300 text-gray-900"
                  )}
                >
                  <option value="last_message_at">Más recientes</option>
                  <option value="created_at">Fecha de creación</option>
                  <option value="customer_name">Nombre A-Z</option>
                  <option value="messages_count">Más mensajes</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className={cn(
                    "h-7 w-7 p-0",
                    darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800"
                  )}
                  title={sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-gray-400" : "text-gray-600"
                  )}>
                    No hay conversaciones
                  </p>
                </div>
              ) : (
                filteredConversations.filter(c => c && c.id).map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer mb-1 transition-colors",
                      selectedConversation === conversation.id
                        ? (darkMode ? "bg-gray-800" : "bg-blue-50")
                        : (darkMode ? "hover:bg-gray-800/50" : "hover:bg-gray-100")
                    )}
                  >
                    <div className="flex items-start gap-3 relative">
                      <Avatar className="w-10 h-10 relative">
                        {conversation.profilePictureUrl ? (
                          <AvatarImage 
                            src={conversation.profilePictureUrl} 
                            alt={conversation.contactName}
                            onError={(e) => {
                              // Fallback si la imagen falla
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'flex';
                              }
                            }}
                          />
                        ) : null}
                        <AvatarFallback 
                          className={cn(
                            darkMode ? "bg-gray-700" : "bg-gray-300",
                            conversation.profilePictureUrl ? "hidden" : "flex"
                          )}
                        >
                          {(conversation.contactName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2) || 'C'}
                        </AvatarFallback>
                      </Avatar>
                      {/* Lead Indicator */}
                      {conversation.lead && (
                        <div className="absolute -top-1 -right-1 z-10">
                          <LeadIndicator
                            isLead={!!conversation.lead}
                            leadStatus={conversation.lead.status}
                            estimatedValue={conversation.lead.estimated_value}
                            variant="icon"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={cn(
                              "text-sm font-medium truncate",
                              conversation.unread && !darkMode ? "font-semibold" : "",
                              darkMode ? "text-white" : "text-gray-900"
                            )}>
                              {conversation.contactName || 'Cliente WhatsApp'}
                            </span>
                            {conversation.lead && (
                              <LeadIndicator
                                isLead={!!conversation.lead}
                                leadStatus={conversation.lead.status}
                                variant="badge"
                              />
                            )}
                          </div>
                          <span className={cn(
                            "text-xs whitespace-nowrap ml-2",
                            darkMode ? "text-gray-500" : "text-gray-500"
                          )}>
                            {conversation.lastMessageTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={cn(
                            "text-xs truncate flex-1",
                            conversation.unread 
                              ? (darkMode ? "text-white font-medium" : "text-gray-900 font-semibold")
                              : (darkMode ? "text-gray-400" : "text-gray-600")
                          )}>
                            {conversation.isTyping ? (
                              <span className={cn(darkMode ? "text-cyan-400" : "text-blue-600")}>
                                {conversation.lastMessage || 'Escribiendo...'}
                              </span>
                            ) : (
                              conversation.lastMessage || 'Sin mensajes'
                            )}
                          </p>
                          {conversation.labels && conversation.labels.length > 0 && (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs px-1.5 py-0",
                                darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                              )}
                            >
                              {(conversation.labels && conversation.labels[0]) || ''}
                            </Badge>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Actualizar en BD y refrescar
                              mutate()
                              toast.success(conversation.isFavorite ? 'Eliminado de favoritos' : 'Agregado a favoritos')
                            }}
                            className="ml-1"
                          >
                            <Star className={cn(
                              "w-3 h-3 transition-colors",
                              conversation.isFavorite 
                                ? (darkMode ? "text-yellow-400 fill-yellow-400" : "text-yellow-500 fill-yellow-500")
                                : (darkMode ? "text-gray-600 hover:text-yellow-400" : "text-gray-400 hover:text-yellow-500")
                            )} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          {/* Pagination Component */}
          {!loadingConversations && conversations.length > 0 && pagination && (
            <Pagination
              currentPage={pagination.page || 1}
              totalPages={pagination.totalPages || 1}
              pageSize={pagination.pageSize || pageSize}
              total={pagination.total || 0}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              loading={loadingConversations}
              showPageSizeSelector={true}
            />
          )}
        </div>

        {/* Center Panel - Chat */}
        <div className={cn(
          "flex-1 flex flex-col transition-colors pt-16",
          darkMode ? "bg-[#0A0E1A]" : "bg-white"
        )}>
          {!selectedConv ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className={cn("w-16 h-16 mx-auto mb-4", darkMode ? "text-gray-600" : "text-gray-400")} />
                <p className={cn("text-lg font-medium mb-2", darkMode ? "text-gray-300" : "text-gray-700")}>
                  Selecciona una conversación
                </p>
                <p className={cn("text-sm", darkMode ? "text-gray-500" : "text-gray-500")}>
                  Elige una conversación de la lista para comenzar a chatear
                </p>
              </div>
            </div>
          ) : selectedConv && (
            <>
              {/* Chat Header */}
              <div className={cn(
                "px-4 py-3 border-b flex items-center justify-between",
                darkMode ? "border-gray-800" : "border-gray-200"
              )}>
                <div className="flex items-center gap-3">
                  <Button
                    variant={isResolved ? "default" : "outline"}
                    size="sm"
                    onClick={handleResolveChat}
                    className={cn(
                      isResolved 
                        ? (darkMode ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600")
                        : ""
                    )}
                  >
                    {isResolved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Resolver chat
                      </>
                    ) : (
                      'Resolver chat'
                    )}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                  <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" onClick={() => setReassignDialogOpen(true)}>
                        Reasignar
                      </Button>
                    </DialogTrigger>
                    <DialogContent className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                      <DialogHeader>
                        <DialogTitle className={darkMode ? "text-white" : ""}>Reasignar Chat</DialogTitle>
                        <DialogDescription className={darkMode ? "text-gray-400" : ""}>
                          Selecciona un agente para reasignar este chat
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 mt-4">
                        <div>
                          <Label className={darkMode ? "text-white" : ""}>Agente</Label>
                          {loadingAgents ? (
                            <div className={cn(
                              "w-full mt-2 p-3 rounded-md border text-sm text-center",
                              darkMode ? "bg-gray-700 border-gray-600 text-gray-400" : "bg-gray-50 border-gray-300 text-gray-600"
                            )}>
                              Cargando agentes...
                            </div>
                          ) : availableAgents.length === 0 ? (
                            <div className={cn(
                              "w-full mt-2 p-3 rounded-md border text-sm",
                              darkMode ? "bg-yellow-900/20 border-yellow-700/50 text-yellow-300" : "bg-yellow-50 border-yellow-200 text-yellow-800"
                            )}>
                              <p className="font-medium mb-1">No hay agentes disponibles</p>
                              <p className="text-xs opacity-90">
                                Contacta al administrador para configurar agentes de WhatsApp.
                              </p>
                            </div>
                          ) : (
                            <select
                              value={selectedAgent}
                              onChange={(e) => setSelectedAgent(e.target.value)}
                              className={cn(
                                "w-full mt-2 p-2 rounded-md border",
                                darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300"
                              )}
                            >
                              <option value="">Selecciona un agente</option>
                              {availableAgents.map(agent => (
                                <option key={agent.id} value={agent.name}>{agent.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleReassign} 
                            disabled={!selectedAgent || availableAgents.length === 0 || loadingAgents}
                          >
                            Reasignar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Dialog de confirmación de eliminación */}
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                      <DialogHeader>
                        <DialogTitle className={darkMode ? "text-white" : ""}>Eliminar conversación</DialogTitle>
                        <DialogDescription className={darkMode ? "text-gray-400" : ""}>
                          ¿Estás seguro de que deseas eliminar esta conversación? Esta acción no se puede deshacer.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => setDeleteDialogOpen(false)}
                          className={darkMode ? "border-gray-700 text-gray-300 hover:bg-gray-700" : ""}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => {
                            if (selectedConversation) {
                              handleDeleteConversation(selectedConversation)
                              setDeleteDialogOpen(false)
                            }
                          }}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Search className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Filter className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={darkMode ? "bg-gray-800 border-gray-700" : ""}>
                      <DropdownMenuItem 
                        className={darkMode ? "text-white" : ""}
                        onClick={() => handleMenuAction('Mark as unread')}
                      >
                        Marcar como no leído
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={darkMode ? "text-white" : ""}
                        onClick={() => handleMenuAction('Export chat')}
                      >
                        Exportar chat
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={darkMode ? "text-white" : ""}
                        onClick={() => handleMenuAction('Pin chat')}
                      >
                        Fijar chat
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={darkMode ? "text-white" : ""}
                        onClick={() => handleMenuAction('Mute chat')}
                      >
                        Silenciar chat
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className={darkMode ? "bg-gray-700" : ""} />
                      <DropdownMenuItem 
                        className={darkMode ? "text-white" : ""}
                        onClick={() => handleMenuAction('Sync messages')}
                      >
                        Sincronizar mensajes
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={darkMode ? "text-white" : ""}
                        onClick={() => handleMenuAction('Lock chat')}
                      >
                        Bloquear chat
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={darkMode ? "text-red-400" : "text-red-600"}
                        onClick={() => handleMenuAction('Block contact')}
                      >
                        Bloquear contacto
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className={darkMode ? "text-red-400" : "text-red-600"}
                        onClick={() => handleMenuAction('Delete chat')}
                      >
                        Eliminar chat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex items-center gap-2 ml-2">
                    <Avatar className="w-8 h-8">
                      {selectedConv?.profilePictureUrl ? (
                        <AvatarImage 
                          src={selectedConv.profilePictureUrl} 
                          alt={selectedConv.contactName}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <AvatarFallback 
                        className={cn(
                          darkMode ? "bg-gray-700" : "bg-gray-300",
                          selectedConv?.profilePictureUrl ? "hidden" : "flex"
                        )}
                      >
                        {((selectedConv?.contactName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2) || 'C')}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("font-medium", darkMode ? "text-white" : "text-gray-900")}>
                      {selectedConv?.contactName || 'Cliente WhatsApp'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.filter(m => m && m.id).map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.sender === 'agent' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          message.type === 'internal'
                            ? (darkMode ? "bg-gray-800/50 border border-gray-700" : "bg-yellow-50 border border-yellow-200")
                            : message.sender === 'agent'
                            ? (darkMode ? "bg-cyan-600" : "bg-blue-600 text-white")
                            : (darkMode ? "bg-gray-800" : "bg-gray-200")
                        )}
                      >
                        {message.type === 'internal' && (
                          <span className={cn(
                            "text-xs font-medium mb-1 block",
                            darkMode ? "text-yellow-400" : "text-yellow-700"
                          )}>
                            Nota Interna
                          </span>
                        )}
                        <p className={cn(
                          "text-sm",
                          message.sender === 'agent' && !message.type
                            ? "text-white"
                            : darkMode
                            ? "text-gray-200"
                            : "text-gray-900"
                        )}>
                          {message.text || 'Sin contenido'}
                        </p>
                        <div className={cn(
                          "flex items-center gap-1 mt-1 text-xs",
                          message.sender === 'agent' && !message.type
                            ? "text-blue-100"
                            : darkMode
                            ? "text-gray-500"
                            : "text-gray-500"
                        )}>
                          {message.sender === 'agent' && (
                            <>
                              {message.read ? (
                                <CheckCheck className="w-3 h-3" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </>
                          )}
                          {message.timestamp && !isNaN(message.timestamp.getTime()) 
                            ? message.timestamp.toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                              })
                            : '--:--'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Typing Indicator */}
              {(isBotTyping || (selectedConv?.isTyping)) && (
                <div className={cn(
                  "px-4 py-2 border-t",
                  darkMode ? "border-gray-800 bg-gray-900/50" : "border-gray-200 bg-gray-50"
                )}>
                  <p className={cn(
                    "text-sm italic flex items-center gap-2",
                    darkMode ? "text-gray-400" : "text-gray-600"
                  )}>
                    <span className="flex gap-1">
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                    El asistente está escribiendo...
                  </p>
                </div>
              )}

              {/* Loading Messages */}
              {loadingMessages && messages.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-gray-400" : "text-gray-600"
                  )}>
                    Cargando mensajes...
                  </p>
                </div>
              )}

              {/* Empty Messages */}
              {!loadingMessages && messages.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-gray-400" : "text-gray-600"
                  )}>
                    No hay mensajes en esta conversación
                  </p>
                </div>
              )}

              {/* Chat Input */}
              <div className={cn(
                "p-4 border-t",
                darkMode ? "border-gray-800" : "border-gray-200"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {(['Responder', 'Nota', 'Respuestas', 'Programado', 'IA Respuesta'] as const).map((tab) => (
                    <Button
                      key={tab}
                      variant={activeTab === tab ? "default" : "ghost"}
                      size="sm"
                      onClick={() => {
                        setActiveTab(tab)
                        if (tab === 'Programado') {
                          setScheduledDateTime('')
                        }
                      }}
                      className={cn(
                        "text-xs",
                        activeTab === tab 
                          ? (darkMode ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700")
                          : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800")
                      )}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>
                {activeTab === 'Programado' && (
                  <div className="mb-2">
                    <Input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      className={cn(
                        "w-full text-sm",
                        darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
                      )}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>
                )}
                {activeTab === 'Respuestas' && (
                  <div className={cn(
                    "mb-2 p-3 rounded-lg max-h-40 overflow-y-auto",
                    darkMode ? "bg-gray-800 border border-gray-700" : "bg-gray-50 border border-gray-200"
                  )}>
                    <p className={cn(
                      "text-xs mb-2 font-medium",
                      darkMode ? "text-gray-400" : "text-gray-600"
                    )}>
                      Respuestas rápidas:
                    </p>
                    <div className="grid grid-cols-1 gap-1">
                      {quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => insertQuickReply(reply)}
                          className={cn(
                            "text-left text-sm p-2 rounded hover:bg-opacity-50 transition-colors",
                            darkMode ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-700"
                          )}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Button variant="ghost" size="icon" className="mt-2" onClick={handleFileUpload}>
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Textarea
                    placeholder={activeTab === 'Nota' ? "Escribe una nota interna..." : activeTab === 'IA Respuesta' ? "Escribe el mensaje para generar respuesta..." : "Escribe un mensaje..."}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && activeTab !== 'Programado' && activeTab !== 'IA Respuesta') {
                        e.preventDefault()
                        sendMessage()
                      }
                    }}
                    className={cn(
                      "flex-1 min-h-[100px] resize-none",
                      darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
                    )}
                    rows={4}
                  />
                  <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="mt-2">
                        <Smile className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className={cn(
                        "w-80 p-4",
                        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                      )}
                      align="end"
                    >
                      <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto">
                        {commonEmojis.map((emoji, idx) => (
                          <button
                            key={idx}
                            onClick={() => insertEmoji(emoji)}
                            className={cn(
                              "text-2xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 transition-colors",
                              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                            )}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {activeTab === 'IA Respuesta' ? (
                    <Button 
                      size="icon"
                      className={cn(
                        "mt-2",
                        darkMode ? "bg-purple-600 hover:bg-purple-700" : "bg-purple-600 hover:bg-purple-700"
                      )}
                      onClick={generateAIResponse}
                      disabled={!messageText.trim()}
                    >
                      <Sparkles className="w-5 h-5" />
                    </Button>
                  ) : activeTab === 'Programado' ? (
                    <Button 
                      size="icon"
                      className={cn(
                        "mt-2",
                        darkMode ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700"
                      )}
                      onClick={scheduleMessage}
                      disabled={!messageText.trim() || !scheduledDateTime}
                    >
                      <ClockIcon className="w-5 h-5" />
                    </Button>
                  ) : (
                    <Button 
                      size="icon"
                      className={cn(
                        "mt-2",
                        darkMode ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700"
                      )}
                      onClick={sendMessage}
                      disabled={isSendingMessage || !messageText.trim()}
                    >
                      {isSendingMessage ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Sidebar - Contact Details */}
        <div className={cn(
          "w-80 border-l flex flex-col transition-colors pt-16",
          darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-50 border-gray-200"
        )}>
          {selectedConv && (
            <>
              {/* Contact Header */}
              <div className={cn(
                "p-4 border-b",
                darkMode ? "border-gray-800" : "border-gray-200"
              )}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      {(contactDetails?.profilePictureUrl || selectedConv?.profilePictureUrl) ? (
                        <AvatarImage 
                          src={contactDetails?.profilePictureUrl || selectedConv?.profilePictureUrl || ''} 
                          alt={contactDetails?.name || selectedConv?.contactName || 'Cliente'}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) {
                              fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <AvatarFallback 
                        className={cn(
                          darkMode ? "bg-gray-700" : "bg-gray-300",
                          (contactDetails?.profilePictureUrl || selectedConv?.profilePictureUrl) ? "hidden" : "flex"
                        )}
                      >
                        {((contactDetails?.name || selectedConv?.contactName || 'C').split(' ').map(n => n[0]).join('').slice(0, 2) || 'C')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className={cn("font-semibold", darkMode ? "text-white" : "text-gray-900")}>
                        {contactDetails?.name || selectedConv?.contactName || 'Cliente WhatsApp'}
                      </h3>
                      <p className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                        {formatMexicanPhone(contactDetails?.phone || selectedConv?.contactPhone) || 'Sin teléfono'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Information */}
                  <div>
                    <h4 className={cn(
                      "text-sm font-semibold mb-3",
                      darkMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      Información
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Último mensaje:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.lastMessage || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Cuenta:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.accountType || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>País:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.country || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Idioma:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.language || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Moneda:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.currency || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Iniciado:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.started || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Estado:</span>
                        <div className="flex items-center gap-1">
                          {contactDetails?.status === 'resolved' && (
                            <CheckCircle2 className={cn("w-4 h-4", darkMode ? "text-green-400" : "text-green-600")} />
                          )}
                          <span className={cn(
                            "capitalize",
                            darkMode ? "text-gray-300" : "text-gray-900"
                          )}>
                            Chat {contactDetails?.status === 'resolved' ? 'resuelto' : contactDetails?.status === 'active' ? 'activo' : 'archivado'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Dispositivo:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.device || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Labels */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={cn(
                        "text-sm font-semibold",
                        darkMode ? "text-gray-300" : "text-gray-700"
                      )}>
                        Etiquetas
                      </h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAddingLabel(!isAddingLabel)}
                        className="h-6 px-2"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    {isAddingLabel && (
                      <div className="flex gap-2 mb-2">
                        <Input
                          placeholder="Nueva etiqueta"
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addLabel()
                            } else if (e.key === 'Escape') {
                              setIsAddingLabel(false)
                              setNewLabel('')
                            }
                          }}
                          className={cn(
                            "flex-1 h-8 text-sm",
                            darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
                          )}
                          autoFocus
                        />
                        <Button size="sm" onClick={addLabel} className="h-8">
                          Agregar
                        </Button>
                      </div>
                    )}
                    {(contactDetails?.labels || selectedConv?.labels || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(contactDetails?.labels || selectedConv?.labels || [])
                          .filter((label): label is string => Boolean(label))
                          .map((label, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className={cn(
                              "flex items-center gap-1",
                              darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                            )}
                          >
                              {label || 'Sin etiqueta'}
                            <X 
                              className="w-3 h-3 cursor-pointer hover:text-red-500" 
                              onClick={() => removeLabel(label)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contact */}
                  <div>
                    <h4 className={cn(
                      "text-sm font-semibold mb-3",
                      darkMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      Contacto
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className={cn("block mb-1", darkMode ? "text-gray-400" : "text-gray-600")}>Nombre:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.name || 'Sin nombre'}</span>
                      </div>
                      <div>
                        <span className={cn("block mb-1", darkMode ? "text-gray-400" : "text-gray-600")}>Correo:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails?.email || 'Sin correo'}</span>
                      </div>
                      {contactDetails?.address && (
                        <div>
                          <span className={cn("block mb-1", darkMode ? "text-gray-400" : "text-gray-600")}>Dirección:</span>
                          <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.address || 'Sin dirección'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={cn(
                        "text-sm font-semibold",
                        darkMode ? "text-gray-300" : "text-gray-700"
                      )}>
                        Notas
                      </h4>
                      {!isEditingNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingNotes(true)}
                          className="h-6 px-2"
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {isEditingNotes ? (
                      <div className="space-y-2">
                        <Textarea
                          value={contactDetails?.notes || contactDetails?.metadata?.notes || ''}
                          onChange={(e) => updateContactDetails({ notes: e.target.value })}
                          className={cn(
                            "text-sm min-h-[80px]",
                            darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
                          )}
                          placeholder="Escribe notas sobre este contacto..."
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveNotes}>
                            Guardar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setIsEditingNotes(false)
                              // Restaurar notas originales si se cancela
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className={cn(
                        "text-sm p-3 rounded-lg min-h-[60px] whitespace-pre-wrap",
                        darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-900"
                      )}>
                        {(contactDetails?.notes && contactDetails.notes.trim()) || 
                         (contactDetails?.metadata?.notes && contactDetails.metadata.notes.trim()) ? (
                          <p className="whitespace-pre-wrap">
                            {contactDetails?.notes || contactDetails?.metadata?.notes}
                          </p>
                        ) : (
                          <p className={cn(
                            "italic",
                            darkMode ? "text-gray-500" : "text-gray-400"
                          )}>
                            No hay notas. Haz clic en el icono para agregar.
                      </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lead Management Panel */}
                  {selectedConversation && 
                   selectedConversation.trim() !== '' && 
                   (selectedConv || contactDetails) && (
                    <LeadManagementPanel
                      conversationId={selectedConversation}
                      customerPhone={contactDetails?.phone || formatMexicanPhone(selectedConv?.contactPhone) || ''}
                      customerName={contactDetails?.name || selectedConv?.contactName || 'Cliente WhatsApp'}
                      lead={contactDetails?.lead || selectedConv?.lead || null}
                      onLeadCreated={(lead) => {
                        console.log('Lead creado:', lead)
                        // Actualizar contactDetails con el nuevo lead
                        updateContactDetails({ lead })
                        // Recargar conversaciones para reflejar el cambio
                        mutate()
                        toast.success('Lead creado exitosamente')
                      }}
                      onLeadUpdated={(lead) => {
                        console.log('Lead actualizado:', lead)
                        // Actualizar contactDetails con el lead actualizado
                        updateContactDetails({ lead })
                        // Recargar conversaciones para reflejar el cambio
                        mutate()
                        toast.success('Lead actualizado exitosamente')
                      }}
                      onLeadConverted={(customerId) => {
                        console.log('Convertido a cliente:', customerId)
                        // Recargar conversaciones para reflejar el cambio
                        mutate()
                        toast.success('Lead convertido a cliente exitosamente')
                        // Opcional: Redirigir a la página del cliente
                        // router.push(`/dashboard/clientes/${customerId}`)
                      }}
                    />
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

      </div>
    </div>
  )
}


