'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/context/SessionContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X, Send, Loader2, AlertCircle, History, MessageSquarePlus, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  links?: Array<{ label: string; url: string }>
}

export interface SavedConversation {
  id: string
  title: string
  messages: AgentMessage[]
  createdAt: string
}

const STORAGE_KEY = 'eagles_agent_conversations'
const MAX_CONVERSATIONS = 50

interface AgentChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Llamado cuando la API responde 403 por plan (solo Premium). Muestra modal de upgrade. */
  onLimitReached?: (err: { message: string; feature?: string; upgrade_url?: string }) => void
}

const WELCOME_MESSAGE: AgentMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Hola! Soy Eagles Assistance, puedes preguntarme por ejemplo: fechas de ingreso de vehículos, órdenes de trabajo por cliente, teléfonos de clientes, estado de órdenes, inventario, finanzas, etc. Escribe tu pregunta abajo.',
}

const SUGGESTIONS = [
  '¿En qué fecha ingresó el Kia K3 de Alfonso Hernández?',
  'Quiero acceder a la orden de trabajo de Juan Pérez',
  '¿Cuántas órdenes hay en diagnóstico?',
  'Dame el teléfono del cliente María García',
]

function loadConversations(): SavedConversation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedConversation[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveConversations(conversations: SavedConversation[]) {
  if (typeof window === 'undefined') return
  try {
    const toSave = conversations.slice(-MAX_CONVERSATIONS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  } catch {
    // ignore
  }
}

export function AgentChatPanel({ open, onOpenChange, onLimitReached }: AgentChatPanelProps) {
  const { organizationId } = useSession()
  const [view, setView] = useState<'chat' | 'history'>('chat')
  const [messages, setMessages] = useState<AgentMessage[]>([WELCOME_MESSAGE])
  const [conversations, setConversations] = useState<SavedConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoSrc, setLogoSrc] = useState('/eagles-logo-new.png')
  const scrollRef = useRef<HTMLDivElement>(null)

  const isNewChat = messages.length <= 1 && messages[0]?.id === 'welcome'

  const persistConversation = useCallback(
    (msgs: AgentMessage[], id?: string) => {
      if (msgs.length <= 1) return
      const firstUser = msgs.find((m) => m.role === 'user')
      const title = firstUser ? (firstUser.content.slice(0, 50) + (firstUser.content.length > 50 ? '…' : '')) : 'Conversación'
      const convId = id || `conv-${Date.now()}`
      setConversations((prev) => {
        const without = prev.filter((c) => c.id !== convId)
        const updated: SavedConversation[] = [
          ...without,
          { id: convId, title, messages: msgs, createdAt: new Date().toISOString() },
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        saveConversations(updated)
        return updated
      })
      setActiveId(convId)
    },
    []
  )

  useEffect(() => {
    if (open) {
      setConversations(loadConversations())
    }
  }, [open])

  useEffect(() => {
    if (open && view === 'chat' && messages.length === 0) {
      setMessages([WELCOME_MESSAGE])
      setActiveId(null)
    }
  }, [open, view, messages.length])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !organizationId) return

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    }
    let newMessages = [...messages, userMsg]
    if (isNewChat) {
      newMessages = [userMsg]
    }
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 403 && (data as { limit_reached?: boolean }).limit_reached && onLimitReached) {
          onLimitReached({
            message: (data as { error?: string }).error || 'El Asistente de IA es solo para plan Premium.',
            feature: (data as { feature?: string }).feature,
            upgrade_url: (data as { upgrade_url?: string }).upgrade_url,
          })
          setLoading(false)
          return
        }
        throw new Error((data as { error?: string }).error || 'Error al consultar al agente')
      }

      const assistantMsg: AgentMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: (data as { response?: string }).response || 'No pude generar una respuesta.',
        links: (data as { links?: Array<{ label: string; url: string }> }).links,
      }
      newMessages = [...newMessages, assistantMsg]
      setMessages(newMessages)
      persistConversation(newMessages, activeId ?? undefined)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      setError(msg)
      newMessages = [
        ...newMessages,
        { id: `error-${Date.now()}`, role: 'assistant' as const, content: `No pude procesar tu pregunta: ${msg}` },
      ]
      setMessages(newMessages)
      persistConversation(newMessages, activeId ?? undefined)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const startNewConversation = () => {
    setMessages([WELCOME_MESSAGE])
    setActiveId(null)
    setView('chat')
    setError(null)
  }

  const openConversation = (c: SavedConversation) => {
    setMessages(c.messages)
    setActiveId(c.id)
    setView('chat')
    setError(null)
  }

  const deleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setConversations((prev) => {
      const next = prev.filter((x) => x.id !== id)
      saveConversations(next)
      return next
    })
    if (activeId === id) {
      startNewConversation()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
        aria-hidden
      />
      <div
        className={cn(
          'relative w-full max-w-md flex flex-col bg-bg-secondary border-l border-border',
          'shadow-2xl'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-tertiary">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/50 flex items-center justify-center overflow-hidden shrink-0">
              <Image
                src={logoSrc}
                alt="EAGLES"
                width={20}
                height={20}
                className="object-contain"
                unoptimized
                onError={() => setLogoSrc('/favicon.svg')}
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">Asistente Eagles</p>
              <p className="text-xs text-text-muted">Pregunta sobre órdenes, clientes, vehículos</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setView(view === 'chat' ? 'history' : 'chat')}
              className="rounded-full"
              aria-label={view === 'chat' ? 'Ver historial' : 'Volver al chat'}
              title={view === 'chat' ? 'Historial' : 'Chat'}
            >
              <History className="h-5 w-5" />
            </Button>
            {view === 'chat' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={startNewConversation}
                className="rounded-full"
                aria-label="Nueva conversación"
                title="Nueva conversación"
              >
                <MessageSquarePlus className="h-5 w-5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="rounded-full"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {view === 'history' ? (
          /* Historial */
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <History className="h-4 w-4" />
              Historial de conversaciones
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={startNewConversation}
              className="w-full mb-4 gap-2"
            >
              <MessageSquarePlus className="h-4 w-4" />
              Nueva conversación
            </Button>
            {conversations.length === 0 ? (
              <p className="text-sm text-text-muted">Aún no hay conversaciones guardadas.</p>
            ) : (
              <ul className="space-y-2">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openConversation(c)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg border border-border bg-bg-tertiary',
                        'hover:border-cyan-500/50 hover:bg-bg-quaternary transition-colors',
                        'flex items-center justify-between gap-2 group'
                      )}
                    >
                      <span className="text-sm text-text-primary truncate flex-1">{c.title}</span>
                      <span className="text-xs text-text-muted shrink-0">
                        {new Date(c.createdAt).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-60 hover:opacity-100 hover:text-destructive"
                        onClick={(e) => deleteConversation(e, c.id)}
                        aria-label="Eliminar conversación"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[60vh]">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-bg-tertiary text-text-primary border border-border'
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.links && msg.links.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {msg.links.map((link) => (
                          <Link
                            key={link.url}
                            href={link.url}
                            className="text-cyan-400 hover:text-cyan-300 underline text-xs"
                            onClick={() => onOpenChange(false)}
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-bg-tertiary border border-border rounded-2xl px-4 py-2.5 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                    <span className="text-sm text-text-muted">Buscando...</span>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Suggestions */}
            {isNewChat && (
              <div className="px-4 pb-2">
                <p className="text-xs text-text-muted mb-2">Sugerencias:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="text-left text-xs px-3 py-2 rounded-lg bg-bg-tertiary border border-border hover:border-cyan-500/50 hover:bg-bg-quaternary transition-colors"
                    >
                      {s.length > 45 ? s.slice(0, 45) + '…' : s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-bg-tertiary">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregunta sobre órdenes, clientes, vehículos..."
                  className="flex-1 rounded-xl border border-border bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  disabled={loading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={loading}
                  className="rounded-xl shrink-0 bg-cyan-600 hover:bg-cyan-700"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
