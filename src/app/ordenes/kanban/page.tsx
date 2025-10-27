'use client'

import { KanbanBoard } from '@/components/ordenes/KanbanBoard'
import { useAuth } from '@/contexts/AuthContext'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'

export default function KanbanPage() {
  const { organization } = useAuth()
  
  // Obtener organizationId del workshop/organización del contexto
  const organizationId = organization?.organization_id || null
  
  // Si no hay organizationId, no mostrar el Kanban
  if (!organizationId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Cargando organización...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Breadcrumbs */}
      <StandardBreadcrumbs
        currentPage="Kanban"
        parentPages={[
          { label: 'Órdenes', href: '/ordenes' }
        ]}
      />
      
      {/* Kanban Board */}
      <KanbanBoard organizationId={organizationId} />
    </div>
  )
}
