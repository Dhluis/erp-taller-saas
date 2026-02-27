'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Phone,
  Mail,
  Building2,
  MessageSquare,
  DollarSign,
  Calendar,
  Edit2,
  Check,
  Trash2,
  RotateCcw,
  Trophy,
  ExternalLink,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { LeadStatusBadge } from '@/components/whatsapp/LeadStatusBadge'
import { toast } from 'sonner'
import type { CRMLead } from './types'
import Link from 'next/link'

interface LeadSidePanelProps {
  lead: CRMLead | null
  open: boolean
  onClose: () => void
  onLeadUpdated?: (updated: CRMLead) => void
  onOpenConvert?: (lead: CRMLead) => void
  onOpenOT?: (lead: CRMLead) => void
  onLeadDeleted?: (leadId: string) => void
}

interface WhatsAppMessage {
  id: string
  direction: 'inbound' | 'outbound'
  content: string | null
  timestamp: string
  type: string
}

export function LeadSidePanel({
  lead,
  open,
  onClose,
  onLeadUpdated,
  onOpenConvert,
  onOpenOT,
  onLeadDeleted,
}: LeadSidePanelProps) {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  const [editingNotes, setEditingNotes] = useState(false)
  const [localNotes, setLocalNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const [editingValue, setEditingValue] = useState(false)
  const [localValue, setLocalValue] = useState('')
  const [savingValue, setSavingValue] = useState(false)

  const [editingContact, setEditingContact] = useState(false)
  const [localName, setLocalName] = useState('')
  const [localPhone, setLocalPhone] = useState('')
  const [localEmail, setLocalEmail] = useState('')
  const [localCompany, setLocalCompany] = useState('')
  const [savingContact, setSavingContact] = useState(false)

  const [deleting, setDeleting] = useState(false)

  // Reset state when lead changes
  useEffect(() => {
    if (lead) {
      setLocalNotes(lead.notes || '')
      setLocalValue(lead.estimated_value?.toString() || '')
      setLocalName(lead.name || '')
      setLocalPhone(lead.phone || '')
      setLocalEmail(lead.email || '')
      setLocalCompany(lead.company || '')
      setEditingNotes(false)
      setEditingValue(false)
      setEditingContact(false)
      setMessages([])
    }
  }, [lead?.id])

  // Cargar mensajes de WhatsApp
  const loadMessages = useCallback(async () => {
    if (!lead?.whatsapp_conversation_id) return
    setMessagesLoading(true)
    try {
      const res = await fetch(
        `/api/whatsapp/conversations/${lead.whatsapp_conversation_id}/messages?limit=5`
      )
      if (res.ok) {
        const data = await res.json()
        const items = data.data?.messages || data.data || []
        setMessages(Array.isArray(items) ? items.slice(0, 5) : [])
      }
    } catch {
      // Si falla, no mostrar error — simplemente sin mensajes
    } finally {
      setMessagesLoading(false)
    }
  }, [lead?.whatsapp_conversation_id])

  useEffect(() => {
    if (open && lead?.whatsapp_conversation_id) {
      loadMessages()
    }
  }, [open, lead?.whatsapp_conversation_id, loadMessages])

  const saveNotes = async () => {
    if (!lead) return
    setSavingNotes(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: localNotes }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onLeadUpdated?.({ ...lead, notes: localNotes })
      setEditingNotes(false)
      toast.success('Notas guardadas')
    } catch {
      toast.error('Error al guardar notas')
    } finally {
      setSavingNotes(false)
    }
  }

  const saveValue = async () => {
    if (!lead) return
    const parsed = parseFloat(localValue)
    if (isNaN(parsed)) { toast.error('Valor inválido'); return }
    setSavingValue(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimated_value: parsed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onLeadUpdated?.({ ...lead, estimated_value: parsed })
      setEditingValue(false)
      toast.success('Valor actualizado')
    } catch {
      toast.error('Error al actualizar valor')
    } finally {
      setSavingValue(false)
    }
  }

  const saveContact = async () => {
    if (!lead) return
    const name = localName.trim()
    const phone = localPhone.trim()
    if (!name) { toast.error('El nombre es obligatorio'); return }
    if (!phone) { toast.error('El teléfono es obligatorio'); return }
    setSavingContact(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email: localEmail.trim() || undefined,
          company: localCompany.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onLeadUpdated?.({
        ...lead,
        name,
        phone,
        email: localEmail.trim() || undefined,
        company: localCompany.trim() || undefined,
      })
      setEditingContact(false)
      toast.success('Contacto actualizado')
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar contacto')
    } finally {
      setSavingContact(false)
    }
  }

  const reactivateLead = async () => {
    if (!lead) return
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'new' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onLeadUpdated?.({ ...lead, status: 'new' })
      toast.success('Lead reactivado')
    } catch {
      toast.error('Error al reactivar lead')
    }
  }

  const deleteLead = async () => {
    if (!lead) return
    if (!confirm(`¿Eliminar el lead "${lead.name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Lead eliminado')
      onLeadDeleted?.(lead.id)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar lead')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

  const formatCurrency = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(v)
      : null

  const sourceLabel =
    lead?.lead_source === 'whatsapp' ? 'WhatsApp'
    : lead?.lead_source === 'web' ? 'Web'
    : lead?.lead_source === 'phone' ? 'Teléfono'
    : lead?.lead_source || 'Manual'

  if (!lead) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 flex flex-col shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <LeadStatusBadge status={lead.status} size="sm" />
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                {sourceLabel}
              </Badge>
            </div>
            <h2 className="text-lg font-bold text-white mt-1.5 truncate">{lead.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Creado: {formatDate(lead.created_at)}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Contacto */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</h3>
              {!editingContact && (
                <button
                  onClick={() => setEditingContact(true)}
                  className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
              )}
            </div>
            {editingContact ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Nombre</label>
                  <Input
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-8"
                    placeholder="Nombre del lead"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Teléfono</label>
                  <Input
                    value={localPhone}
                    onChange={(e) => setLocalPhone(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-8"
                    placeholder="Teléfono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Email</label>
                  <Input
                    type="email"
                    value={localEmail}
                    onChange={(e) => setLocalEmail(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-8"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Empresa (opcional)</label>
                  <Input
                    value={localCompany}
                    onChange={(e) => setLocalCompany(e.target.value)}
                    className="bg-slate-800 border-slate-600 text-white text-sm h-8"
                    placeholder="Empresa"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveContact}
                    disabled={savingContact}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
                  >
                    {savingContact ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingContact(false)
                      setLocalName(lead.name || '')
                      setLocalPhone(lead.phone || '')
                      setLocalEmail(lead.email || '')
                      setLocalCompany(lead.company || '')
                    }}
                    className="text-slate-400 h-7 text-xs"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
            <div className="space-y-2.5">
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-blue-400 transition-colors group"
              >
                <Phone className="w-4 h-4 text-slate-500 group-hover:text-blue-400 flex-shrink-0" />
                <span>{lead.phone}</span>
              </a>
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-2.5 text-sm text-slate-300 hover:text-blue-400 transition-colors group"
                >
                  <Mail className="w-4 h-4 text-slate-500 group-hover:text-blue-400 flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </a>
              )}
              {lead.company && (
                <div className="flex items-center gap-2.5 text-sm text-slate-300">
                  <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>{lead.company}</span>
                </div>
              )}
              {lead.assigned_user && (
                <div className="flex items-center gap-2.5 text-sm text-slate-300">
                  <User className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span>{lead.assigned_user.full_name}</span>
                </div>
              )}
            </div>
            )}
          </div>

          {/* Valor y Score */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Oportunidad</h3>
              {!editingValue && (
                <button
                  onClick={() => setEditingValue(true)}
                  className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
              )}
            </div>

            {/* Valor estimado */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Valor estimado</span>
              </div>
              {editingValue ? (
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    className="h-7 w-28 text-xs bg-slate-800 border-slate-600 text-white"
                    onKeyDown={(e) => e.key === 'Enter' && saveValue()}
                    autoFocus
                  />
                  <button
                    onClick={saveValue}
                    disabled={savingValue}
                    className="p-1 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingValue(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors group"
                >
                  <span>{formatCurrency(lead.estimated_value) || 'Sin valor'}</span>
                  <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>

            {/* Lead score */}
            {lead.lead_score != null && lead.lead_score > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-400">Score</span>
                  <span className="text-sm font-medium text-white">{lead.lead_score}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      lead.lead_score >= 70
                        ? 'bg-green-500'
                        : lead.lead_score >= 40
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${lead.lead_score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Próximo seguimiento */}
            {lead.next_follow_up && (
              <div className="flex items-center gap-2 mt-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-400">
                  Seguimiento: {formatDate(lead.next_follow_up)}
                </span>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Notas</h3>
              {!editingNotes && (
                <button
                  onClick={() => setEditingNotes(true)}
                  className="text-xs text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                  Editar
                </button>
              )}
            </div>
            {editingNotes ? (
              <div className="space-y-2">
                <Textarea
                  value={localNotes}
                  onChange={(e) => setLocalNotes(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white text-sm min-h-[80px] resize-none"
                  placeholder="Escribe notas sobre este lead..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
                  >
                    {savingNotes ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setEditingNotes(false); setLocalNotes(lead.notes || '') }}
                    className="text-slate-400 h-7 text-xs"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {lead.notes || <span className="text-slate-600 italic">Sin notas</span>}
              </p>
            )}
          </div>

          {/* Preview WhatsApp */}
          {lead.whatsapp_conversation_id && (
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-green-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Conversación WhatsApp
                  </h3>
                </div>
                <Link
                  href="/dashboard/whatsapp/conversaciones"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Ver completa
                </Link>
              </div>

              {messagesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-400" />
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                          msg.direction === 'outbound'
                            ? 'bg-cyan-700/60 text-white'
                            : 'bg-slate-700/60 text-slate-200'
                        }`}
                      >
                        <p className="leading-relaxed">
                          {msg.content || <span className="text-slate-500 italic">[Multimedia]</span>}
                        </p>
                        <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-cyan-300/70' : 'text-slate-500'}`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-600 italic text-center py-3">Sin mensajes recientes</p>
              )}

              {lead.whatsapp_conversation?.last_message_at && (
                <p className="text-xs text-slate-600 mt-2 text-center">
                  Último mensaje: {formatDate(lead.whatsapp_conversation.last_message_at)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Acciones — sticky footer */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0 space-y-2">
          {lead.status === 'won' && !lead.customer_id && (
            <>
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                onClick={() => { onOpenConvert?.(lead); onClose() }}
              >
                <Trophy className="w-4 h-4 mr-2" />
                Convertir a Cliente
              </Button>
              <Button
                variant="outline"
                className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                onClick={() => { onOpenOT?.(lead); onClose() }}
              >
                Crear Orden de Trabajo
              </Button>
            </>
          )}

          {lead.status === 'won' && lead.customer_id && (
            <>
              <div className="flex items-center justify-center gap-2 py-2 bg-green-900/20 rounded-lg border border-green-500/20">
                <Trophy className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400 font-medium">Ya es cliente</span>
              </div>
              <Button
                variant="outline"
                className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                onClick={() => { onOpenOT?.(lead); onClose() }}
              >
                Crear Orden de Trabajo
              </Button>
            </>
          )}

          {lead.status === 'lost' && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                onClick={reactivateLead}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reactivar
              </Button>
              <Button
                variant="ghost"
                className="flex-1 text-red-400 hover:bg-red-500/10"
                onClick={deleteLead}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          )}

          {lead.status !== 'won' && lead.status !== 'lost' && (
            <Button
              variant="ghost"
              className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={deleteLead}
              disabled={deleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleting ? 'Eliminando...' : 'Eliminar lead'}
            </Button>
          )}
        </div>
      </div>
    </>
  )
}
