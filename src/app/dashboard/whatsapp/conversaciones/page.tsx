'use client'

import { useState, useEffect } from 'react'
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
  ArrowLeft
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
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

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
  isTyping?: boolean
  isFavorite?: boolean
}

interface ContactDetails {
  name: string
  phone: string
  email?: string
  avatar?: string
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
}

export default function ConversacionesPage() {
  const router = useRouter()
  const [darkMode, setDarkMode] = useState(true)
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [messageText, setMessageText] = useState('')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'Responder' | 'Nota' | 'Respuestas' | 'Programado' | 'IA Respuesta'>('Responder')
  const [scheduledDateTime, setScheduledDateTime] = useState('')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isAddingLabel, setIsAddingLabel] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('')
  
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

  // Datos de ejemplo - ahora mutables
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      contactName: 'Jennifer Fritz',
      contactPhone: '+1234567890',
      lastMessage: 'Sam está escribiendo en este chat...',
      lastMessageTime: '13h',
      unread: false,
      status: 'active',
      labels: ['SO'],
      isTyping: true
    },
    {
      id: '2',
      contactName: 'Laney Gray',
      contactPhone: '+1234567891',
      lastMessage: '¡Hola! Buenos días',
      lastMessageTime: '13h',
      unread: false,
      status: 'active',
      labels: ['TE']
    },
    {
      id: '3',
      contactName: 'Kendra Lord',
      contactPhone: '+0123456789',
      contactEmail: 'kendralord@company.com',
      lastMessage: 'Mark está escribiendo en este chat...',
      lastMessageTime: '17h',
      unread: true,
      status: 'resolved',
      labels: ['RE'],
      isTyping: true,
      isFavorite: true
    },
    {
      id: '4',
      contactName: 'Oscar Thomsen',
      contactPhone: '+1234567892',
      lastMessage: 'Imagen',
      lastMessageTime: '5h',
      unread: false,
      status: 'active',
      labels: ['LR']
    },
    {
      id: '5',
      contactName: 'Gatlin Huber',
      contactPhone: '+1234567893',
      lastMessage: 'Te avisaré tan pronto como sepamos...',
      lastMessageTime: '8h',
      unread: false,
      status: 'active',
      labels: ['SA']
    },
    {
      id: '6',
      contactName: 'Tim Morrison',
      contactPhone: '+1234567894',
      lastMessage: '¡Hola! Me preguntaba si podrías ayudar...',
      lastMessageTime: '6h',
      unread: false,
      status: 'active',
      labels: ['PA']
    },
    {
      id: '7',
      contactName: 'Mate Harris',
      contactPhone: '+1234567895',
      lastMessage: 'Imagen',
      lastMessageTime: '7h',
      unread: false,
      status: 'active',
      labels: []
    },
    {
      id: '8',
      contactName: 'Jon Doe',
      contactPhone: '+1234567896',
      lastMessage: '¿Puedo saber tu nombre?',
      lastMessageTime: '8h',
      unread: false,
      status: 'active',
      labels: []
    },
    {
      id: '9',
      contactName: 'Jahlil Kyle',
      contactPhone: '+1234567897',
      lastMessage: '¡Genial! Te contactaré cuando el paquete...',
      lastMessageTime: '9h',
      unread: false,
      status: 'active',
      labels: []
    }
  ])

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '¡Hola Kendra! Este es el soporte de Home Haven Marketplace. ¿Cómo puedo ayudarte hoy?',
      sender: 'agent',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '2',
      text: '¡Hola! Hice un pedido hace unos días y quería verificar el estado del envío. ¿Puedes ayudarme con eso?',
      sender: 'customer',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '3',
      text: '¡Por supuesto, Kendra! ¿Podrías proporcionar el número de pedido o el nombre del producto que compraste? Lo buscaré de inmediato.',
      sender: 'agent',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '4',
      text: '¡Claro! El número de pedido es HH12345678. Pedí el Set de Tazas de Cerámica Rústica.',
      sender: 'customer',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '5',
      text: '¡Gracias por los detalles! Déjame verificar eso por ti. Un momento, por favor.',
      sender: 'agent',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '6',
      text: '¡Listo! Tu pedido fue enviado el 7 de diciembre y está programado para ser entregado en tu dirección antes del 10 de diciembre. Aquí está tu enlace de seguimiento: track.homehaven.com/HH12345678',
      sender: 'agent',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '7',
      text: '¡Hola! ¿Cómo puedo ayudarte hoy?',
      sender: 'agent',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
      type: 'internal'
    },
    {
      id: '8',
      text: '¡Gracias por el aviso! Pasaré tu problema al equipo técnico.',
      sender: 'agent',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
      type: 'internal'
    }
  ])

  const [contactDetails, setContactDetails] = useState<ContactDetails>({
    name: 'Kendra Lord',
    phone: '+0123456789',
    email: 'kendralord@company.com',
    lastMessage: 'hace 17 horas',
    accountType: 'Cuenta personal',
    country: 'Estados Unidos',
    language: 'Español',
    currency: 'Dólar Estadounidense',
    started: 'hace 17 horas',
    status: 'resolved',
    device: 'Usuario de iPhone',
    labels: ['Importante'],
    address: '1234 Calle Maple, Ciudad, USA 12345',
    notes: 'Enviar factura de los últimos 2 meses'
  })

  const selectedConv = conversations.find(c => c.id === selectedConversation) || conversations[2]
  const isResolved = selectedConv?.status === 'resolved'

  // Aplicar dark mode al body
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = 
      activeFilter === 'all' ||
      (activeFilter === 'unread' && conv.unread) ||
      (activeFilter === 'resolved' && conv.status === 'resolved') ||
      (activeFilter === 'favorite' && conv.isFavorite)

    return matchesSearch && matchesFilter
  })

  useEffect(() => {
    if (conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[2].id) // Seleccionar Kendra Lord por defecto
    }
  }, [])

  // Marcar mensajes como leídos cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversation) {
      // Marcar conversación como leída
      updateConversation(selectedConversation, { unread: false })
      
      // Marcar mensajes como leídos
      setMessages(prev => prev.map(msg => ({ ...msg, read: true })))
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
  const updateConversation = (id: string, updates: Partial<Conversation>) => {
    setConversations(prev => prev.map(conv => 
      conv.id === id ? { ...conv, ...updates } : conv
    ))
  }

  const updateContactDetails = (updates: Partial<ContactDetails>) => {
    setContactDetails(prev => ({ ...prev, ...updates }))
  }

  // Funciones de mensajes
  const sendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return

    const messageToSend = messageText
    setMessageText('') // Limpiar inmediatamente para mejor UX

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageToSend,
      sender: 'agent',
      timestamp: new Date(),
      read: false,
      type: activeTab === 'Nota' ? 'internal' : 'text'
    }

    setMessages(prev => [...prev, newMessage])
    
    // Actualizar última conversación
    const conv = conversations.find(c => c.id === selectedConversation)
    if (conv) {
      const shortMessage = messageToSend.length > 50 ? messageToSend.substring(0, 50) + '...' : messageToSend
      updateConversation(selectedConversation, {
        lastMessage: shortMessage,
        lastMessageTime: 'Ahora',
        unread: false,
        isTyping: false
      })
    }

    // Simular envío con delay
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, read: true } : msg
      ))
      toast.success(activeTab === 'Nota' ? 'Nota interna agregada' : 'Mensaje enviado')
    }, 500)
  }

  const scheduleMessage = () => {
    if (!messageText.trim() || !scheduledDateTime) {
      toast.error('Por favor completa el mensaje y la fecha/hora')
      return
    }

    toast.success(`Mensaje programado para ${new Date(scheduledDateTime).toLocaleString('es-ES')}`)
    setMessageText('')
    setScheduledDateTime('')
    setActiveTab('Responder')
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
  const handleResolveChat = () => {
    if (!selectedConversation) return
    
    const newStatus = isResolved ? 'active' : 'resolved'
    updateConversation(selectedConversation, { status: newStatus })
    updateContactDetails({ status: newStatus })
    toast.success(newStatus === 'resolved' ? 'Chat resuelto' : 'Chat reactivado')
  }

  const handleReassign = () => {
    if (!selectedAgent) {
      toast.error('Por favor selecciona un agente')
      return
    }
    
    toast.success(`Chat reasignado a ${selectedAgent}`)
    setReassignDialogOpen(false)
    setSelectedAgent('')
  }

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'Mark as unread':
        if (selectedConversation) {
          updateConversation(selectedConversation, { unread: true })
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
        a.download = `chat-${selectedConv?.contactName}-${Date.now()}.json`
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
          updateConversation(selectedConversation, { status: 'archived' })
          toast.success('Contacto bloqueado')
        }
        break
      case 'Delete chat':
        if (selectedConversation && confirm('¿Estás seguro de eliminar este chat?')) {
          setConversations(prev => prev.filter(c => c.id !== selectedConversation))
          setSelectedConversation(null)
          toast.success('Chat eliminado')
        }
        break
    }
  }

  // Funciones de etiquetas y notas
  const addLabel = () => {
    if (!newLabel.trim()) {
      toast.error('Por favor ingresa una etiqueta')
      return
    }
    
    const currentLabels = contactDetails.labels || []
    if (currentLabels.includes(newLabel)) {
      toast.error('Esta etiqueta ya existe')
      return
    }
    
    updateContactDetails({ labels: [...currentLabels, newLabel] })
    if (selectedConversation) {
      const conv = conversations.find(c => c.id === selectedConversation)
      if (conv) {
        updateConversation(selectedConversation, { labels: [...conv.labels, newLabel] })
      }
    }
    
    setNewLabel('')
    setIsAddingLabel(false)
    toast.success('Etiqueta agregada')
  }

  const removeLabel = (label: string) => {
    const currentLabels = contactDetails.labels.filter(l => l !== label)
    updateContactDetails({ labels: currentLabels })
    
    if (selectedConversation) {
      const conv = conversations.find(c => c.id === selectedConversation)
      if (conv) {
        updateConversation(selectedConversation, { labels: conv.labels.filter(l => l !== label) })
      }
    }
    
    toast.success('Etiqueta eliminada')
  }

  const saveNotes = () => {
    toast.success('Notas guardadas')
    setIsEditingNotes(false)
  }

  const handleFileUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,video/*,.pdf,.doc,.docx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        toast.success(`Archivo "${file.name}" seleccionado (simulado)`)
        // Aquí se podría agregar la lógica real de subida
      }
    }
    input.click()
  }

  // Agentes disponibles para reasignación
  const availableAgents = ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez']

  return (
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
                  const dashboardUrl = window.location.origin + '/dashboard'
                  window.location.href = dashboardUrl
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
                onChange={(e) => setSearchQuery(e.target.value)}
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
            <div className="flex flex-wrap gap-2">
              {['all', 'unread', 'resolved', 'favorite'].map((filter) => (
                <Button
                  key={filter}
                  variant={activeFilter === filter ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveFilter(filter)}
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
            </div>
          </div>

          {/* Conversation List */}
          <ScrollArea className="flex-1">
            <div className="p-2">
              {filteredConversations.map((conversation) => (
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
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className={darkMode ? "bg-gray-700" : "bg-gray-300"}>
                        {conversation.contactName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-sm font-medium truncate",
                          conversation.unread && !darkMode ? "font-semibold" : "",
                          darkMode ? "text-white" : "text-gray-900"
                        )}>
                          {conversation.contactName}
                        </span>
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
                              {conversation.lastMessage}
                            </span>
                          ) : (
                            conversation.lastMessage
                          )}
                        </p>
                        {conversation.labels.length > 0 && (
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs px-1.5 py-0",
                              darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                            )}
                          >
                            {conversation.labels[0]}
                          </Badge>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            updateConversation(conversation.id, { isFavorite: !conversation.isFavorite })
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
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center Panel - Chat */}
        <div className={cn(
          "flex-1 flex flex-col transition-colors pt-16",
          darkMode ? "bg-[#0A0E1A]" : "bg-white"
        )}>
          {selectedConv && (
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
                              <option key={agent} value={agent}>{agent}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleReassign} disabled={!selectedAgent}>
                            Reasignar
                          </Button>
                        </div>
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
                      <AvatarFallback className={darkMode ? "bg-gray-700" : "bg-gray-300"}>
                        {selectedConv.contactName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className={cn("font-medium", darkMode ? "text-white" : "text-gray-900")}>
                      {selectedConv.contactName}
                    </span>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((message) => (
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
                          {message.text}
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
                          {new Date(message.timestamp).toLocaleTimeString('es-ES', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Typing Indicator */}
              {selectedConv.isTyping && (
                <div className={cn(
                  "px-4 py-2 border-t",
                  darkMode ? "border-gray-800 bg-gray-900/50" : "border-gray-200 bg-gray-50"
                )}>
                  <p className={cn(
                    "text-sm italic",
                    darkMode ? "text-gray-400" : "text-gray-600"
                  )}>
                    Mark está escribiendo en este chat...
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
                      disabled={!messageText.trim()}
                    >
                      <Send className="w-5 h-5" />
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
                      <AvatarFallback className={darkMode ? "bg-gray-700" : "bg-gray-300"}>
                        {selectedConv.contactName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className={cn("font-semibold", darkMode ? "text-white" : "text-gray-900")}>
                        {contactDetails.name}
                      </h3>
                      <p className={cn("text-sm", darkMode ? "text-gray-400" : "text-gray-600")}>
                        {contactDetails.phone}
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
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.lastMessage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Cuenta:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.accountType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>País:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Idioma:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.language}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Moneda:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Iniciado:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.started}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Estado:</span>
                        <div className="flex items-center gap-1">
                          {contactDetails.status === 'resolved' && (
                            <CheckCircle2 className={cn("w-4 h-4", darkMode ? "text-green-400" : "text-green-600")} />
                          )}
                          <span className={cn(
                            "capitalize",
                            darkMode ? "text-gray-300" : "text-gray-900"
                          )}>
                            Chat {contactDetails.status === 'resolved' ? 'resuelto' : contactDetails.status === 'active' ? 'activo' : 'archivado'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Dispositivo:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.device}</span>
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
                    {contactDetails.labels.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {contactDetails.labels.map((label, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className={cn(
                              "flex items-center gap-1",
                              darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-200 text-gray-700"
                            )}
                          >
                            {label}
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
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.name}</span>
                      </div>
                      <div>
                        <span className={cn("block mb-1", darkMode ? "text-gray-400" : "text-gray-600")}>Correo:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.email}</span>
                      </div>
                      {contactDetails.address && (
                        <div>
                          <span className={cn("block mb-1", darkMode ? "text-gray-400" : "text-gray-600")}>Dirección:</span>
                          <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.address}</span>
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
                          value={contactDetails.notes || ''}
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
                      <p className={cn(
                        "text-sm p-3 rounded-lg min-h-[60px]",
                        darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-900"
                      )}>
                        {contactDetails.notes || 'No hay notas. Haz clic en el icono para agregar.'}
                      </p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

