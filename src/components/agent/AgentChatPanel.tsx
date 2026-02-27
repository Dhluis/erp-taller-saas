'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from '@/lib/context/SessionContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { X, Send, Loader2, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  links?: Array<{ label: string; url: string }>
}

interface AgentChatPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SUGGESTIONS = [
  '¿En qué fecha ingresó el Kia K3 de Alfonso Hernández?',
  'Quiero acceder a la orden de trabajo de Juan Pérez',
  '¿Cuántas órdenes hay en diagnóstico?',
  'Dame el teléfono del cliente María García',
]

export function AgentChatPanel({ open, onOpenChange }: AgentChatPanelProps) {
  const { organizationId } = useSession()
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            'Hola. Soy el asistente del ERP. Puedes preguntar en lenguaje natural, por ejemplo: fechas de ingreso de vehículos, órdenes de trabajo por cliente, teléfonos de clientes, estado de órdenes, etc. Escribe tu pregunta abajo.',
        },
      ])
    }
  }, [open, messages.length])

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
    setMessages((prev) => [...prev, userMsg])
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
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar al agente')
      }

      const assistantMsg: AgentMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'No pude generar una respuesta.',
        links: data.links,
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      setError(msg)
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `No pude procesar tu pregunta: ${msg}`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
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
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-cyan-500/50 flex items-center justify-center">
              <Image src="/logo-icon.svg" alt="EAGLES" width={20} height={20} className="object-contain" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Asistente Eagles</p>
              <p className="text-xs text-text-muted">Pregunta sobre órdenes, clientes, vehículos</p>
            </div>
          </div>
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

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px] max-h-[60vh]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
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
        {messages.length <= 1 && (
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
            <Button type="submit" size="icon" disabled={loading} className="rounded-xl shrink-0 bg-cyan-600 hover:bg-cyan-700">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
