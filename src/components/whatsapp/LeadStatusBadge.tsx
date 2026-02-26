// src/components/whatsapp/LeadStatusBadge.tsx
import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  Phone,
  CheckCircle2,
  FileText,
  TrendingUp,
  Trophy,
  XCircle
} from 'lucide-react'
import type { LeadStatus } from '@/types/base'

export type { LeadStatus }

interface LeadStatusBadgeProps {
  status: LeadStatus | string | undefined | null
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: {
    label: 'Nuevo',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Sparkles,
  },
  contacted: {
    label: 'Contactado',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    icon: Phone,
  },
  qualified: {
    label: 'Calificado',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: CheckCircle2,
  },
  proposal: {
    label: 'Propuesta',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: FileText,
  },
  negotiation: {
    label: 'Negociación',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: TrendingUp,
  },
  won: {
    label: 'Ganado',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Trophy,
  },
  lost: {
    label: 'Perdido',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: XCircle,
  },
}

export function LeadStatusBadge({ 
  status, 
  showIcon = true,
  size = 'md' 
}: LeadStatusBadgeProps) {
  // Validar que el status sea válido
  if (!status || !statusConfig[status]) {
    return null
  }
  
  const config = statusConfig[status]
  const Icon = config.icon

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <Badge 
      variant="outline"
      className={`${config.color} ${sizeClasses[size]} font-medium inline-flex items-center gap-1.5`}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </Badge>
  )
}

// Exportar configuración para usar en otros componentes
export { statusConfig }

