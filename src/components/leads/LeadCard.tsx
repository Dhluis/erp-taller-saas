'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { User, DollarSign, GripVertical, MessageSquare, Building2, Clock } from 'lucide-react'
import type { CRMLead } from './types'

interface LeadCardProps {
  lead: CRMLead
  onClick?: () => void
  isTerminal?: boolean
}

export function LeadCard({ lead, onClick, isTerminal }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: { type: 'lead', lead },
    disabled: isTerminal,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
    })
  }

  const formatCurrency = (amount?: number | null) => {
    if (!amount) return null
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const isFollowUpOverdue = lead.next_follow_up
    ? new Date(lead.next_follow_up) < new Date()
    : false

  const sourceLabel =
    lead.lead_source === 'whatsapp'
      ? 'WhatsApp'
      : lead.lead_source === 'web'
      ? 'Web'
      : lead.lead_source === 'phone'
      ? 'Teléfono'
      : lead.lead_source || 'Manual'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isTerminal ? attributes : {})}
      {...(!isTerminal ? listeners : {})}
      className={`bg-slate-800/50 border border-slate-700/50 rounded-lg mb-3 overflow-hidden transition-all group ${
        isDragging
          ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/50 z-50'
          : 'hover:bg-slate-800/70 hover:border-blue-500/30'
      } ${isTerminal ? 'cursor-default' : 'cursor-grab active:cursor-grabbing touch-manipulation'}`}
      style={!isTerminal ? { touchAction: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } : undefined}
    >
      {/* Header con GripVertical (puntitos) - indicador visual de arrastre */}
      <div className="flex items-center justify-between px-4 py-3 min-h-[48px] bg-slate-900/30 border-b border-slate-700/50 transition-colors hover:bg-slate-800/50">
        <span className="text-xs text-slate-500 font-medium">
          {formatDate(lead.created_at)}
        </span>
        <div className="flex items-center gap-2">
          {lead.whatsapp_conversation_id && (
            <MessageSquare className="w-3 h-3 text-green-400 flex-shrink-0" />
          )}
          <span className="text-xs text-slate-500 hidden sm:inline">{sourceLabel}</span>
          {!isTerminal && (
            <GripVertical className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Contenido — tap abre el lead; stopPropagation evita que el touch inicie drag */}
      <div
        onClick={(e) => {
          e.stopPropagation()
          onClick?.()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className="p-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
      >
        {/* Nombre */}
        <div className="flex items-start gap-2 mb-2">
          <User className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{lead.name}</p>
            {lead.company && (
              <div className="flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-slate-500" />
                <p className="text-xs text-slate-400 truncate">{lead.company}</p>
              </div>
            )}
          </div>
        </div>

        {/* Lead score */}
        {lead.lead_score && lead.lead_score > 0 ? (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-slate-500">Score</span>
              <span className="text-xs text-slate-400 font-medium">{lead.lead_score}%</span>
            </div>
            <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
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
        ) : null}

        {/* Próximo seguimiento */}
        {lead.next_follow_up && (
          <div className={`flex items-center gap-1 mb-2 ${isFollowUpOverdue ? 'text-red-400' : 'text-slate-400'}`}>
            <Clock className="w-3 h-3" />
            <span className="text-xs">
              {isFollowUpOverdue ? 'Vencido: ' : 'Seguimiento: '}
              {formatDate(lead.next_follow_up)}
            </span>
          </div>
        )}

        {/* Footer: valor */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-700/50">
          {formatCurrency(lead.estimated_value) ? (
            <div className="flex items-center gap-1 text-sm font-semibold text-blue-400">
              <DollarSign className="w-3.5 h-3.5" />
              <span>{formatCurrency(lead.estimated_value)}</span>
            </div>
          ) : (
            <span className="text-xs text-slate-600">Sin valor estimado</span>
          )}
        </div>
      </div>
    </div>
  )
}
