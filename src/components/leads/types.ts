// src/components/leads/types.ts
import type { LeadStatus } from '@/types/base'

export type { LeadStatus }

export interface CRMLead {
  id: string
  organization_id: string
  name: string
  phone: string
  email?: string | null
  company?: string | null
  status: LeadStatus
  lead_source?: string | null
  estimated_value?: number | null
  lead_score?: number | null
  notes?: string | null
  assigned_to?: string | null
  next_follow_up?: string | null
  lost_reason?: string | null
  customer_id?: string | null
  whatsapp_conversation_id?: string | null
  // Vehicle info
  vehicle_brand?: string | null
  vehicle_model?: string | null
  vehicle_year?: number | null
  vehicle_plate?: string | null
  fault_description?: string | null
  created_at: string
  updated_at?: string | null
  // Joined relations from API
  assigned_user?: { id: string; full_name: string; email: string } | null
  customer?: { id: string; name: string; phone?: string | null; email?: string | null } | null
  whatsapp_conversation?: {
    id: string
    customer_name: string | null
    customer_phone: string
    last_message?: string | null
    messages_count?: number | null
    last_message_at?: string | null
  } | null
}

export interface PipelineColumn {
  id: LeadStatus
  title: string
  color: string
  bgColor: string
  borderColor: string
  isTerminal: boolean
  leads: CRMLead[]
}

export const PIPELINE_COLUMNS: Omit<PipelineColumn, 'leads'>[] = [
  { id: 'new',         title: 'Nuevo',        color: 'text-slate-400',  bgColor: 'bg-slate-500/10',  borderColor: 'border-slate-500/30',  isTerminal: false },
  { id: 'contacted',   title: 'Contactado',    color: 'text-blue-400',   bgColor: 'bg-blue-500/10',   borderColor: 'border-blue-500/30',   isTerminal: false },
  { id: 'qualified',   title: 'Calificado',    color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30', isTerminal: false },
  { id: 'proposal',    title: 'Propuesta',     color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30', isTerminal: false },
  { id: 'negotiation', title: 'Negociación',   color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30', isTerminal: false },
  { id: 'won',         title: 'Ganado',        color: 'text-green-400',  bgColor: 'bg-green-500/10',  borderColor: 'border-green-500/30',  isTerminal: true  },
  { id: 'lost',        title: 'Perdido',       color: 'text-red-400',    bgColor: 'bg-red-500/10',    borderColor: 'border-red-500/30',    isTerminal: true  },
]
