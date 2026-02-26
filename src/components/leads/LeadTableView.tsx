'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeadStatusBadge } from '@/components/whatsapp/LeadStatusBadge'
import { Search, MessageSquare, UserPlus, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import type { CRMLead, LeadStatus } from './types'

interface LeadTableViewProps {
  leads: CRMLead[]
  onSelectLead: (lead: CRMLead) => void
  onOpenConvertModal: (lead: CRMLead) => void
  onOpenOTModal: (lead: CRMLead) => void
  onLeadStatusChanged?: (leadId: string, status: LeadStatus) => void
}

function OriginBadge({ lead }: { lead: CRMLead }) {
  const src = (lead.lead_source || '').toLowerCase()
  if (lead.whatsapp_conversation_id || src === 'whatsapp')
    return <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">WhatsApp</Badge>
  if (src === 'web' || src === 'landing')
    return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-xs">Web</Badge>
  if (src === 'phone' || src === 'teléfono')
    return <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/50 text-xs">Teléfono</Badge>
  return <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-slate-500/50 text-xs">Manual</Badge>
}

const CANONICAL_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'Nuevo' },
  { value: 'contacted', label: 'Contactado' },
  { value: 'qualified', label: 'Calificado' },
  { value: 'proposal', label: 'Propuesta' },
  { value: 'negotiation', label: 'Negociación' },
  { value: 'won', label: 'Ganado' },
  { value: 'lost', label: 'Perdido' },
]

export function LeadTableView({
  leads,
  onSelectLead,
  onOpenConvertModal,
  onOpenOTModal,
  onLeadStatusChanged,
}: LeadTableViewProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Estado actualizado')
      onLeadStatusChanged?.(leadId, newStatus)
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar estado')
    }
  }

  const filtered = leads.filter((l) => {
    const q = searchTerm.toLowerCase()
    const matchSearch =
      !searchTerm ||
      l.name?.toLowerCase().includes(q) ||
      l.phone?.includes(searchTerm) ||
      l.email?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  const formatCurrency = (v?: number | null) =>
    v != null
      ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }).format(v)
      : '-'

  return (
    <div className="space-y-3">
      {/* Filtros de tabla */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs">
              Todos ({leads.length})
            </TabsTrigger>
            {CANONICAL_STATUSES.map(({ value, label }) => {
              const count = leads.filter((l) => l.status === value).length
              if (count === 0) return null
              return (
                <TabsTrigger key={value} value={value} className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-400 text-xs">
                  {label} ({count})
                </TabsTrigger>
              )
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border border-slate-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-slate-800/50">
              <TableHead className="text-slate-400">Nombre</TableHead>
              <TableHead className="text-slate-400">Empresa</TableHead>
              <TableHead className="text-slate-400">Contacto</TableHead>
              <TableHead className="text-slate-400">Origen</TableHead>
              <TableHead className="text-slate-400">Estado</TableHead>
              <TableHead className="text-slate-400">Valor</TableHead>
              <TableHead className="text-right text-slate-400">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                  Sin leads que mostrar
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((lead) => (
                <TableRow
                  key={lead.id}
                  className="border-slate-700 hover:bg-slate-800/50 cursor-pointer"
                  onClick={() => onSelectLead(lead)}
                >
                  <TableCell className="font-medium text-white">{lead.name}</TableCell>
                  <TableCell className="text-slate-300 text-sm">{lead.company || '-'}</TableCell>
                  <TableCell>
                    <div className="text-sm text-white">{lead.phone}</div>
                    {lead.email && <div className="text-xs text-slate-400">{lead.email}</div>}
                  </TableCell>
                  <TableCell>
                    <OriginBadge lead={lead} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {lead.status === 'won' && lead.customer_id ? (
                      <div className="flex items-center gap-1.5">
                        <LeadStatusBadge status={lead.status} size="sm" />
                        <span className="text-xs text-green-500">✓ Cliente</span>
                      </div>
                    ) : (
                      <Select
                        value={lead.status}
                        onValueChange={(v) => handleUpdateStatus(lead.id, v as LeadStatus)}
                      >
                        <SelectTrigger className="w-[130px] h-7 text-xs bg-slate-800 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 text-white">
                          {CANONICAL_STATUSES.map(({ value, label }) => (
                            <SelectItem key={value} value={value} className="hover:bg-slate-700 text-xs">
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-white text-sm">
                    {formatCurrency(lead.estimated_value)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5 flex-wrap">
                      {lead.whatsapp_conversation_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-500/50 text-green-400 hover:bg-green-500/10 h-7 text-xs"
                          onClick={() => onSelectLead(lead)}
                        >
                          <MessageSquare className="h-3 h-3 mr-1" />
                          Chat
                        </Button>
                      )}
                      {['qualified', 'proposal', 'negotiation', 'won'].includes(lead.status) && !lead.customer_id && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                          onClick={() => onOpenConvertModal(lead)}
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Convertir
                        </Button>
                      )}
                      {!['won', 'lost'].includes(lead.status) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 h-7 text-xs"
                          onClick={() => onOpenOTModal(lead)}
                        >
                          <Wrench className="h-3 w-3 mr-1" />
                          OT
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
