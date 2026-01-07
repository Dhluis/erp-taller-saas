// src/components/whatsapp/LeadIndicator.tsx
import React from 'react'
import { Sparkles } from 'lucide-react'
import { LeadStatusBadge, type LeadStatus } from './LeadStatusBadge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface LeadIndicatorProps {
  isLead: boolean
  leadStatus?: LeadStatus
  estimatedValue?: number
  variant?: 'icon' | 'badge' | 'full'
}

export function LeadIndicator({ 
  isLead, 
  leadStatus,
  estimatedValue,
  variant = 'icon'
}: LeadIndicatorProps) {
  if (!isLead || !leadStatus) return null

  // Variante: Solo icono con tooltip
  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p className="font-semibold">Lead Activo</p>
              <LeadStatusBadge status={leadStatus} size="sm" />
              {estimatedValue && (
                <p className="text-muted-foreground">
                  Valor: ${estimatedValue.toLocaleString()}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Variante: Badge simple
  if (variant === 'badge') {
    return <LeadStatusBadge status={leadStatus} size="sm" />
  }

  // Variante: Completa con icono y badge
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
        <Sparkles className="h-3 w-3 text-white" />
      </div>
      <LeadStatusBadge status={leadStatus} size="sm" showIcon={false} />
    </div>
  )
}

