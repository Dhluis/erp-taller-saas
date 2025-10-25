export type NoteCategory = 'general' | 'important' | 'customer' | 'internal'

export interface WorkOrderNote {
  id: string
  text: string
  createdAt: string
  createdBy: string
  userName: string
  isPinned?: boolean
  category?: NoteCategory
}

// Re-exportar otros tipos si existen
export interface WorkOrder {
  id: string
  order_number: string
  status: string
  customer_id: string
  vehicle_id: string
  organization_id: string
  workshop_id: string
  created_at: string
  updated_at: string
  entry_date?: string
  images?: any[]
  notes?: WorkOrderNote[]
  // Agregar otros campos según tu esquema actual
}







