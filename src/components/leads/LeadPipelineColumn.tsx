'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Lock, DollarSign } from 'lucide-react'
import { LeadCard } from './LeadCard'
import type { PipelineColumn } from './types'

interface LeadPipelineColumnProps {
  column: PipelineColumn
  onLeadClick?: (leadId: string) => void
}

export function LeadPipelineColumn({ column, onLeadClick }: LeadPipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const totalValue = column.leads.reduce((sum, l) => sum + (l.estimated_value || 0), 0)
  const formattedValue =
    totalValue > 0
      ? new Intl.NumberFormat('es-MX', {
          style: 'currency',
          currency: 'MXN',
          minimumFractionDigits: 0,
        }).format(totalValue)
      : null

  return (
    <div className="flex-shrink-0 w-[260px] sm:w-72">
      {/* Header */}
      <div className={`${column.bgColor} ${column.borderColor} border rounded-lg p-3 mb-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {column.isTerminal && <Lock className={`w-3.5 h-3.5 ${column.color}`} />}
            <h3 className={`font-semibold text-sm ${column.color}`}>{column.title}</h3>
          </div>
          <span className={`${column.bgColor} ${column.color} px-2 py-0.5 rounded-full text-xs font-medium border ${column.borderColor}`}>
            {column.leads.length}
          </span>
        </div>
        {formattedValue && (
          <div className={`flex items-center gap-1 mt-1.5 ${column.color} opacity-70`}>
            <DollarSign className="w-3 h-3" />
            <span className="text-xs font-medium">{formattedValue}</span>
          </div>
        )}
      </div>

      {/* Zona de drop */}
      <div
        ref={setNodeRef}
        className={`min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent rounded-lg border-2 border-dashed transition-all duration-200 p-2 ${
          isOver
            ? 'border-blue-500/70 bg-blue-500/10 shadow-lg shadow-blue-500/20'
            : 'border-transparent hover:border-slate-600/50'
        }`}
      >
        <SortableContext
          items={column.leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.leads.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isTerminal={column.isTerminal}
              onClick={() => onLeadClick?.(lead.id)}
            />
          ))}
        </SortableContext>

        {/* Empty state */}
        {column.leads.length === 0 && (
          <div
            className={`text-center py-8 text-sm border-2 border-dashed rounded-lg transition-all duration-200 ${
              isOver
                ? 'border-blue-500/70 bg-blue-500/10 text-blue-400'
                : 'border-slate-600/30 bg-slate-800/20 text-slate-500'
            }`}
          >
            <div className="mb-2 text-lg">{isOver ? '🎯' : column.isTerminal ? '📦' : '📋'}</div>
            <p className="font-medium">
              {isOver
                ? 'Suelta aquí'
                : column.isTerminal
                ? `Sin leads ${column.title.toLowerCase()}`
                : 'Vacío'}
            </p>
            {!column.isTerminal && (
              <p className={`text-xs mt-1 ${isOver ? 'text-blue-300' : 'text-slate-600'}`}>
                {isOver ? 'El lead se moverá aquí' : 'Arrastra leads aquí'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
