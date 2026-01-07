// src/components/whatsapp/LeadStatusBadge.tsx
import React from 'react'
import { Badge } from '@/components/ui/badge'
import { 
  Sparkles, 
  Phone, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  XCircle 
} from 'lucide-react'

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'appointment' | 'converted' | 'lost'

interface LeadStatusBadgeProps {
  status: LeadStatus
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig = {
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
  appointment: {
    label: 'Cita Agendada',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Calendar,
  },
  converted: {
    label: 'Convertido',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: UserCheck,
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

