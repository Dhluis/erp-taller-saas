'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { LeadPipelineColumn } from './LeadPipelineColumn'
import { LeadCard } from './LeadCard'
import { PIPELINE_COLUMNS, type CRMLead, type LeadStatus, type PipelineColumn } from './types'

interface LeadPipelineBoardProps {
  organizationId: string
  searchQuery?: string
  refreshKey?: number
  /** Si se proporciona, el board usa esta lista para renderizar (permite actualización inmediata al editar en el panel) */
  leads?: CRMLead[]
  onLeadsLoaded?: (leads: CRMLead[]) => void
  onLeadClick?: (leadId: string) => void
}

const VALID_STATUSES: LeadStatus[] = [
  'new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost',
]

export function LeadPipelineBoard({
  organizationId,
  searchQuery = '',
  refreshKey = 0,
  leads: leadsProp,
  onLeadsLoaded,
  onLeadClick,
}: LeadPipelineBoardProps) {
  const [columns, setColumns] = useState<PipelineColumn[]>([])
  const [activeLead, setActiveLead] = useState<CRMLead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  const loadLeads = useCallback(async () => {
    if (!organizationId) return
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/leads?pageSize=500', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      })

      if (!response.ok) {
        const errData = await response.json()
        throw new Error(errData.error || 'Error al cargar leads')
      }

      const result = await response.json()
      // Normalizar statuses legacy → canónicos
      const normalizeStatus = (s: string): LeadStatus => {
        if (s === 'appointment') return 'proposal'
        if (s === 'converted') return 'won'
        if (VALID_STATUSES.includes(s as LeadStatus)) return s as LeadStatus
        return 'new'
      }
      const allLeads: CRMLead[] = (Array.isArray(result.data) ? result.data : []).map(
        (l: CRMLead) => ({ ...l, status: normalizeStatus(l.status) })
      )

      // Filtrar por búsqueda
      const filteredLeads = searchQuery
        ? allLeads.filter((l) => {
            const q = searchQuery.toLowerCase()
            return (
              l.name?.toLowerCase().includes(q) ||
              l.phone?.includes(searchQuery) ||
              l.email?.toLowerCase().includes(q) ||
              l.company?.toLowerCase().includes(q)
            )
          })
        : allLeads

      // Organizar por columna
      const newColumns: PipelineColumn[] = PIPELINE_COLUMNS.map((col) => ({
        ...col,
        leads: filteredLeads.filter((l) => l.status === col.id),
      }))

      setColumns(newColumns)
      onLeadsLoaded?.(allLeads)
    } catch (err) {
      console.error('[LeadPipelineBoard] Error:', err)
      setError('Error al cargar los leads')
    } finally {
      setLoading(false)
    }
  }, [organizationId, searchQuery, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cuando el padre pasa una lista de leads actualizada (ej. tras editar en el panel), derivar columnas de ella para actualizar la UI al instante
  useEffect(() => {
    if (leadsProp && leadsProp.length > 0) {
      const normalizeStatus = (s: string): LeadStatus => {
        if (s === 'appointment') return 'proposal'
        if (s === 'converted') return 'won'
        if (VALID_STATUSES.includes(s as LeadStatus)) return s as LeadStatus
        return 'new'
      }
      const normalized = leadsProp.map((l) => ({ ...l, status: normalizeStatus(l.status) }))
      const filtered = searchQuery
        ? normalized.filter((l) => {
            const q = searchQuery.toLowerCase()
            return (
              l.name?.toLowerCase().includes(q) ||
              l.phone?.includes(searchQuery) ||
              l.email?.toLowerCase().includes(q) ||
              l.company?.toLowerCase().includes(q)
            )
          })
        : normalized
      const newColumns: PipelineColumn[] = PIPELINE_COLUMNS.map((col) => ({
        ...col,
        leads: filtered.filter((l) => l.status === col.id),
      }))
      setColumns(newColumns)
    }
  }, [leadsProp, searchQuery])

  useEffect(() => {
    if (organizationId) {
      loadLeads()
    }
  }, [organizationId, loadLeads])

  function handleDragStart(event: DragStartEvent) {
    const lead = columns.flatMap((c) => c.leads).find((l) => l.id === event.active.id)
    setActiveLead(lead || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveLead(null)

    if (!over) return

    const leadId = active.id as string
    const newStatus = over.id as LeadStatus

    if (!VALID_STATUSES.includes(newStatus)) return

    const currentColumn = columns.find((col) => col.leads.some((l) => l.id === leadId))
    if (!currentColumn || currentColumn.id === newStatus) return

    // Bloquear drag DESDE columnas terminales
    if (currentColumn.isTerminal) return

    // Guardar snapshot para revertir si falla
    const savedColumns = columns

    // Actualización optimista
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === currentColumn.id) {
          return { ...col, leads: col.leads.filter((l) => l.id !== leadId) }
        }
        if (col.id === newStatus) {
          const lead = currentColumn.leads.find((l) => l.id === leadId)
          if (lead) return { ...col, leads: [...col.leads, { ...lead, status: newStatus }] }
        }
        return col
      })
    )

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al actualizar')
      }

      // Si mueve a "won", abrir panel via callback
      if (newStatus === 'won') {
        onLeadClick?.(leadId)
      }
    } catch (err) {
      console.error('[LeadPipelineBoard] Error al mover lead:', err)
      toast.error('Error al actualizar el estado del lead')
      setColumns(savedColumns)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando pipeline...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 mb-3">{error}</p>
          <button
            onClick={loadLeads}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const totalLeads = columns.reduce((sum, c) => sum + c.leads.length, 0)

  return (
    <>
      {totalLeads === 0 && !loading && (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Sin leads todavía</h3>
            <p className="text-slate-400 text-sm">Crea tu primer lead con el botón "Nuevo Lead"</p>
          </div>
        </div>
      )}

      {totalLeads > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-4 min-h-[400px]">
            {columns.map((column) => (
              <LeadPipelineColumn
                key={column.id}
                column={column}
                onLeadClick={onLeadClick}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="rotate-2 scale-105 shadow-2xl shadow-blue-500/20 border-2 border-blue-500/50">
                <LeadCard lead={activeLead} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </>
  )
}
