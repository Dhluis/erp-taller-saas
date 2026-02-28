"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Plus, Search, LayoutGrid, List } from "lucide-react"
import { useSession } from '@/lib/context/SessionContext'
import { toast } from 'sonner'
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal'

import { LeadPipelineBoard } from '@/components/leads/LeadPipelineBoard'
import { LeadTableView } from '@/components/leads/LeadTableView'
import { LeadStatsBar } from '@/components/leads/LeadStatsBar'
import { LeadSidePanel } from '@/components/leads/LeadSidePanel'
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog'
import { ConvertLeadDialog } from '@/components/leads/ConvertLeadDialog'
import type { CRMLead, LeadStatus } from '@/components/leads/types'

type ViewMode = 'kanban' | 'table'

export default function LeadsPage() {
  const { organizationId } = useSession()
  const [view, setView] = useState<ViewMode>('kanban')
  const [searchTerm, setSearchTerm] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  // Leads state — sincronizado desde el board via onLeadsLoaded
  const [leads, setLeads] = useState<CRMLead[]>([])

  // Side panel
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editLead, setEditLead] = useState<CRMLead | null>(null)
  const [convertModalLead, setConvertModalLead] = useState<CRMLead | null>(null)
  const [otLead, setOtLead] = useState<CRMLead | null>(null)
  const [showOTModal, setShowOTModal] = useState(false)

  const openLeadPanel = useCallback(
    async (leadId: string) => {
      const cached = leads.find((l) => l.id === leadId)
      if (cached) {
        setSelectedLead(cached)
        setIsPanelOpen(true)
      }
      try {
        const res = await fetch(`/api/leads/${leadId}`)
        const data = await res.json()
        if (data.success && data.data) {
          setSelectedLead(data.data)
          setIsPanelOpen(true)
        }
      } catch {
        // Si falla, el panel muestra datos del caché
      }
    },
    [leads]
  )

  const handleLeadsLoaded = useCallback((loadedLeads: CRMLead[]) => {
    setLeads(loadedLeads)
  }, [])

  const handleLeadUpdated = useCallback((updated: CRMLead) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
    setSelectedLead(updated)
  }, [])

  const handleLeadDeleted = useCallback((leadId: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== leadId))
    setIsPanelOpen(false)
    setSelectedLead(null)
    setRefreshKey((k) => k + 1)
  }, [])

  const handleLeadCreated = useCallback((lead: CRMLead) => {
    setLeads((prev) => [lead, ...prev])
    setRefreshKey((k) => k + 1)
  }, [])

  const handleConvertSuccess = useCallback(
    (updated: CRMLead) => {
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
      if (selectedLead?.id === updated.id) setSelectedLead(updated)
      setRefreshKey((k) => k + 1)
    },
    [selectedLead?.id]
  )

  const handleStatusChanged = useCallback(
    (leadId: string, status: LeadStatus) => {
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)))
      if (selectedLead?.id === leadId) setSelectedLead((s) => (s ? { ...s, status } : s))
    },
    [selectedLead?.id]
  )

  const handleOTCreated = useCallback(async () => {
    if (!otLead) return
    try {
      await fetch(`/api/leads/${otLead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'won' }),
      })
      handleStatusChanged(otLead.id, 'won')
    } catch {
      // Ignorar — la OT ya fue creada
    }
    setOtLead(null)
  }, [otLead, handleStatusChanged])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 px-4 sm:px-6 pt-4 pb-3 border-b border-slate-800">
        <StandardBreadcrumbs currentPage="CRM / Pipeline" />
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <h2 className="text-xl font-bold text-white flex-shrink-0">Pipeline CRM</h2>
          <div className="flex items-center gap-2 flex-1 justify-end flex-wrap">
            {/* Search */}
            <div className="relative w-48 sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-slate-800 border-slate-700 text-white h-9 text-sm"
              />
            </div>

            {/* View toggle */}
            <div className="flex rounded-lg border border-slate-700 overflow-hidden h-9">
              <button
                onClick={() => setView('kanban')}
                className={`px-3 flex items-center gap-1.5 text-sm transition-colors ${
                  view === 'kanban'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title="Vista Pipeline"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
              <button
                onClick={() => setView('table')}
                className={`px-3 flex items-center gap-1.5 text-sm border-l border-slate-700 transition-colors ${
                  view === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title="Vista Tabla"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </button>
            </div>

            {/* New Lead */}
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white h-9"
              onClick={() => {
                setEditLead(null)
                setIsCreateOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Lead
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {leads.length > 0 && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-3">
          <LeadStatsBar leads={leads} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-hidden px-4 sm:px-6 pb-4">
        {view === 'kanban' ? (
          <div className="h-full overflow-x-auto pt-2">
            <LeadPipelineBoard
              organizationId={organizationId || ''}
              searchQuery={searchTerm}
              refreshKey={refreshKey}
              leads={leads}
              onLeadsLoaded={handleLeadsLoaded}
              onLeadClick={openLeadPanel}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto pt-2">
            <LeadTableView
              leads={leads}
              onSelectLead={(lead) => {
                setSelectedLead(lead)
                setIsPanelOpen(true)
              }}
              onOpenConvertModal={setConvertModalLead}
              onOpenOTModal={(lead) => {
                setOtLead(lead)
                setShowOTModal(true)
              }}
              onLeadStatusChanged={handleStatusChanged}
            />
          </div>
        )}
      </div>

      {/* Side Panel */}
      <LeadSidePanel
        lead={selectedLead}
        open={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onLeadUpdated={handleLeadUpdated}
        onOpenConvert={setConvertModalLead}
        onOpenOT={(lead) => {
          setOtLead(lead)
          setShowOTModal(true)
        }}
        onLeadDeleted={handleLeadDeleted}
      />

      {/* Create / Edit Dialog */}
      <CreateLeadDialog
        open={isCreateOpen}
        onOpenChange={(v) => {
          setIsCreateOpen(v)
          if (!v) setEditLead(null)
        }}
        editLead={editLead}
        onSuccess={handleLeadCreated}
      />

      {/* Convert to Customer */}
      <ConvertLeadDialog
        lead={convertModalLead}
        onClose={() => setConvertModalLead(null)}
        onSuccess={handleConvertSuccess}
      />

      {/* Create Work Order */}
      <CreateWorkOrderModal
        open={showOTModal}
        onOpenChange={(v) => {
          setShowOTModal(v)
          if (!v) setOtLead(null)
        }}
        prefilledPhone={otLead?.phone ?? ''}
        onSuccess={handleOTCreated}
      />
    </div>
  )
}
