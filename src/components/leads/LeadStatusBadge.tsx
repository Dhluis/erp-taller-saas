'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  new:          { label: 'Nuevo',        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  contacted:    { label: 'Contactado',   className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  qualified:    { label: 'Calificado',   className: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  proposal:     { label: 'Propuesta',    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  negotiation:  { label: 'Negociación',  className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  won:          { label: 'Ganado',       className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  lost:         { label: 'Perdido',      className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  inactive:     { label: 'Inactivo',     className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
}

interface LeadStatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
  className?: string
}

export function LeadStatusBadge({ status, size = 'md', className }: LeadStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-500/20 text-slate-400 border-slate-500/30' }

  return (
    <Badge
      variant="outline"
      className={cn(
        'border font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}
