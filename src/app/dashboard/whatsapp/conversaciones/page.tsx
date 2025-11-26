'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  X
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

  // Datos de ejemplo
  const [conversations] = useState<Conversation[]>([
    {
      id: '1',
      contactName: 'Jennifer Fritz',
      contactPhone: '+1234567890',
      lastMessage: 'Sam is typing on this chat...',
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
      lastMessage: 'Hello! Good morning',
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
      lastMessage: 'Mark is typing on this chat...',
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
      lastMessage: 'Image',
      lastMessageTime: '5h',
      unread: false,
      status: 'active',
      labels: ['LR']
    },
    {
      id: '5',
      contactName: 'Gatlin Huber',
      contactPhone: '+1234567893',
      lastMessage: 'I will let you know as soon as we know...',
      lastMessageTime: '8h',
      unread: false,
      status: 'active',
      labels: ['SA']
    },
    {
      id: '6',
      contactName: 'Tim Morrison',
      contactPhone: '+1234567894',
      lastMessage: 'Hello! I was wondering if your could help...',
      lastMessageTime: '6h',
      unread: false,
      status: 'active',
      labels: ['PA']
    },
    {
      id: '7',
      contactName: 'Mate Harris',
      contactPhone: '+1234567895',
      lastMessage: 'Image',
      lastMessageTime: '7h',
      unread: false,
      status: 'active',
      labels: []
    },
    {
      id: '8',
      contactName: 'Jon Doe',
      contactPhone: '+1234567896',
      lastMessage: 'May I know your name?',
      lastMessageTime: '8h',
      unread: false,
      status: 'active',
      labels: []
    },
    {
      id: '9',
      contactName: 'Jahlil Kyle',
      contactPhone: '+1234567897',
      lastMessage: 'Great! I will reach you when the package...',
      lastMessageTime: '9h',
      unread: false,
      status: 'active',
      labels: []
    }
  ])

  const [messages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hi Kendra! This is Home Haven Marketplace support. How can I help you today?',
      sender: 'agent',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '2',
      text: 'Hi! I placed an order a few days ago, and I wanted to check on the shipping status. Can you help me with that?',
      sender: 'customer',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '3',
      text: 'Of course, Kendra! Could you please provide your order number or the name of the product you purchased? I\'ll look it up right away.',
      sender: 'agent',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '4',
      text: 'Sure! The order number is HH12345678. I ordered the Rustic Ceramic Mug Set.',
      sender: 'customer',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '5',
      text: 'Thank you for the details! Let me check on that for you. One moment, please.',
      sender: 'agent',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '6',
      text: 'Got it! Your order was shipped on December 7th and it\'s scheduled to be delivered to your address by December 10th. Here\'s your tracking link: track.homehaven.com/HH12345678',
      sender: 'agent',
      timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      read: true
    },
    {
      id: '7',
      text: 'Hello! How can I help you today?',
      sender: 'agent',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
      type: 'internal'
    },
    {
      id: '8',
      text: 'Thank you for the heads up! I will pass your issue to the technical team.',
      sender: 'agent',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      read: true,
      type: 'internal'
    }
  ])

  const [contactDetails] = useState<ContactDetails>({
    name: 'Kendra Lord',
    phone: '+0123456789',
    email: 'kendralord@company.com',
    lastMessage: '17 hours ago',
    accountType: 'Personal account',
    country: 'United States',
    language: 'English',
    currency: 'United States Dollar',
    started: '17 hours ago',
    status: 'resolved',
    device: 'iPhone user',
    labels: ['Important'],
    address: '1234 Maple Street, Anytown, USA 12345',
    notes: 'Send invoice from the last 2 months'
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
              <Button
                variant="ghost"
                className={cn(
                  "relative px-4 py-2 rounded-none border-b-2 border-transparent hover:border-primary transition-colors",
                  darkMode ? "text-white hover:text-cyan-400" : "text-gray-700 hover:text-blue-600"
                )}
              >
                <span className="flex items-center gap-2">
                  Customer Service
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
                Sales
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "px-4 py-2 rounded-none border-b-2 border-transparent hover:border-primary transition-colors",
                  darkMode ? "text-gray-400 hover:text-cyan-400" : "text-gray-500 hover:text-blue-600"
                )}
              >
                Recruiting
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className={darkMode ? "text-gray-400" : "text-gray-600"}>
                <span className="text-sm font-semibold">32</span>
              </Button>
              <Button variant="ghost" size="icon" className={darkMode ? "text-gray-400" : "text-gray-600"}>
                <span className="text-sm font-semibold">24</span>
              </Button>
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
                placeholder="Contacts, message, @agent or label"
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
                  {filter === 'all' ? 'All' : filter === 'unread' ? 'Unread' : filter === 'resolved' ? 'Resolved' : 'Favorite'}
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
                        {conversation.isFavorite && (
                          <Star className={cn("w-3 h-3", darkMode ? "text-yellow-400 fill-yellow-400" : "text-yellow-500 fill-yellow-500")} />
                        )}
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
                    className={cn(
                      isResolved 
                        ? (darkMode ? "bg-green-600 hover:bg-green-700" : "bg-green-500 hover:bg-green-600")
                        : ""
                    )}
                  >
                    {isResolved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Resolve chat
                      </>
                    ) : (
                      'Resolve chat'
                    )}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" size="sm">
                    Reassign
                  </Button>
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
                      <DropdownMenuItem className={darkMode ? "text-white" : ""}>Mark as unread</DropdownMenuItem>
                      <DropdownMenuItem className={darkMode ? "text-white" : ""}>Export chat</DropdownMenuItem>
                      <DropdownMenuItem className={darkMode ? "text-white" : ""}>Pin chat</DropdownMenuItem>
                      <DropdownMenuItem className={darkMode ? "text-white" : ""}>Mute chat</DropdownMenuItem>
                      <DropdownMenuSeparator className={darkMode ? "bg-gray-700" : ""} />
                      <DropdownMenuItem className={darkMode ? "text-white" : ""}>Sync messages</DropdownMenuItem>
                      <DropdownMenuItem className={darkMode ? "text-white" : ""}>Lock chat</DropdownMenuItem>
                      <DropdownMenuItem className={darkMode ? "text-red-400" : "text-red-600"}>Block contact</DropdownMenuItem>
                      <DropdownMenuItem className={darkMode ? "text-red-400" : "text-red-600"}>Delete chat</DropdownMenuItem>
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
                            Internal Note
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
                          {new Date(message.timestamp).toLocaleTimeString('en-US', { 
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
                    Mark is typing on this chat...
                  </p>
                </div>
              )}

              {/* Chat Input */}
              <div className={cn(
                "p-4 border-t",
                darkMode ? "border-gray-800" : "border-gray-200"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  {['Reply', 'Note', 'Replies', 'Scheduled', 'AI Reply'].map((tab) => (
                    <Button
                      key={tab}
                      variant={tab === 'Reply' ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "text-xs",
                        tab === 'Reply' 
                          ? (darkMode ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700")
                          : (darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-600 hover:text-gray-800")
                      )}
                    >
                      {tab}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon">
                    <Paperclip className="w-5 h-5" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    className={cn(
                      "flex-1",
                      darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
                    )}
                  />
                  <Button variant="ghost" size="icon">
                    <Smile className="w-5 h-5" />
                  </Button>
                  <Button 
                    size="icon"
                    className={darkMode ? "bg-cyan-600 hover:bg-cyan-700" : "bg-blue-600 hover:bg-blue-700"}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
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
                      Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Last message:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.lastMessage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Account:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.accountType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Country:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.country}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Language:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.language}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Currency:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Started:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.started}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Status:</span>
                        <div className="flex items-center gap-1">
                          {contactDetails.status === 'resolved' && (
                            <CheckCircle2 className={cn("w-4 h-4", darkMode ? "text-green-400" : "text-green-600")} />
                          )}
                          <span className={cn(
                            "capitalize",
                            darkMode ? "text-gray-300" : "text-gray-900"
                          )}>
                            Chat is {contactDetails.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className={darkMode ? "text-gray-400" : "text-gray-600"}>Device:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.device}</span>
                      </div>
                    </div>
                  </div>

                  {/* Labels */}
                  {contactDetails.labels.length > 0 && (
                    <div>
                      <h4 className={cn(
                        "text-sm font-semibold mb-3",
                        darkMode ? "text-gray-300" : "text-gray-700"
                      )}>
                        Labels
                      </h4>
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
                            <X className="w-3 h-3 cursor-pointer" />
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact */}
                  <div>
                    <h4 className={cn(
                      "text-sm font-semibold mb-3",
                      darkMode ? "text-gray-300" : "text-gray-700"
                    )}>
                      Contact
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className={cn("block mb-1", darkMode ? "text-gray-400" : "text-gray-600")}>Name:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.name}</span>
                      </div>
                      <div>
                        <span className={cn("block mb-1", darkMode ? "text-gray-400" : "text-gray-600")}>Email:</span>
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.email}</span>
                      </div>
                      {contactDetails.address && (
                        <div>
                          <span className={cn("block mb-1", darkMode ? "text-gray-400" : "text-gray-600")}>Address:</span>
                          <span className={darkMode ? "text-gray-300" : "text-gray-900"}>{contactDetails.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {contactDetails.notes && (
                    <div>
                      <h4 className={cn(
                        "text-sm font-semibold mb-3",
                        darkMode ? "text-gray-300" : "text-gray-700"
                      )}>
                        Notes
                      </h4>
                      <p className={cn(
                        "text-sm p-3 rounded-lg",
                        darkMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-900"
                      )}>
                        {contactDetails.notes}
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>

        {/* Dark Theme Toggle Button - Fixed Position */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg shadow-lg border",
            darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          )}>
            <Label htmlFor="dark-mode-toggle" className={cn(
              "text-sm font-medium cursor-pointer flex items-center gap-2",
              darkMode ? "text-white" : "text-gray-900"
            )}>
              {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {darkMode ? 'Dark' : 'Light'}
            </Label>
            <Switch
              id="dark-mode-toggle"
              checked={darkMode}
              onCheckedChange={setDarkMode}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

