/**
 * Utilidades para registrar historial de órdenes de trabajo
 * Eagles System - Work Order History Logger
 */

// ============================================================
// Tipos
// ============================================================
export type HistoryAction =
  | 'created'
  | 'status_change'
  | 'field_update'
  | 'assignment'
  | 'vehicle_update'
  | 'customer_update'
  | 'inspection_update'
  | 'item_added'
  | 'item_updated'
  | 'item_removed'
  | 'note_added'
  | 'document_uploaded'
  | 'document_deleted'
  | 'deleted'

export interface HistoryEntry {
  id: string
  organization_id: string
  work_order_id: string
  user_id: string | null
  user_name: string
  action: HistoryAction
  description: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  created_at: string
}

interface LogHistoryParams {
  workOrderId: string
  action: HistoryAction
  description: string
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
}

// ============================================================
// Mapeo de estados a etiquetas en español
// ============================================================
export const STATUS_LABELS: Record<string, string> = {
  reception: 'Recepción',
  diagnosis: 'Diagnóstico',
  initial_quote: 'Cotización Inicial',
  waiting_approval: 'Esperando Aprobación',
  disassembly: 'Desarme',
  waiting_parts: 'Espera de Piezas',
  assembly: 'Armado',
  testing: 'Pruebas',
  ready: 'Listo para Entrega',
  completed: 'Completada',
  cancelled: 'Cancelada',
  // Legacy
  pending: 'Pendiente',
  in_progress: 'En Progreso',
}

// ============================================================
// Mapeo de acciones a iconos y colores
// ============================================================
export const ACTION_CONFIG: Record<HistoryAction, { icon: string; color: string; label: string }> = {
  created: { icon: 'Plus', color: 'text-green-400', label: 'Creación' },
  status_change: { icon: 'ArrowRight', color: 'text-blue-400', label: 'Cambio de Estado' },
  field_update: { icon: 'Edit', color: 'text-yellow-400', label: 'Actualización' },
  assignment: { icon: 'UserCog', color: 'text-purple-400', label: 'Asignación' },
  vehicle_update: { icon: 'Car', color: 'text-cyan-400', label: 'Vehículo' },
  customer_update: { icon: 'User', color: 'text-orange-400', label: 'Cliente' },
  inspection_update: { icon: 'ClipboardCheck', color: 'text-teal-400', label: 'Inspección' },
  item_added: { icon: 'PlusCircle', color: 'text-green-400', label: 'Item Agregado' },
  item_updated: { icon: 'Edit2', color: 'text-yellow-400', label: 'Item Actualizado' },
  item_removed: { icon: 'MinusCircle', color: 'text-red-400', label: 'Item Eliminado' },
  note_added: { icon: 'MessageSquare', color: 'text-indigo-400', label: 'Nota' },
  document_uploaded: { icon: 'Upload', color: 'text-emerald-400', label: 'Documento' },
  document_deleted: { icon: 'Trash2', color: 'text-red-400', label: 'Documento Eliminado' },
  deleted: { icon: 'Trash', color: 'text-red-500', label: 'Eliminación' },
}

// ============================================================
// Función principal para registrar historial
// ============================================================
export async function logWorkOrderHistory({
  workOrderId,
  action,
  description,
  oldValue = null,
  newValue = null,
}: LogHistoryParams): Promise<boolean> {
  try {
    const response = await fetch(`/api/work-orders/${workOrderId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action,
        description,
        old_value: oldValue,
        new_value: newValue,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[WorkOrderHistory] Error registrando historial:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[WorkOrderHistory] Error registrando historial:', error)
    return false
  }
}

// ============================================================
// Helpers para cambios específicos
// ============================================================

/** Registrar cambio de estado */
export async function logStatusChange(
  workOrderId: string,
  oldStatus: string,
  newStatus: string
): Promise<boolean> {
  const oldLabel = STATUS_LABELS[oldStatus] || oldStatus
  const newLabel = STATUS_LABELS[newStatus] || newStatus

  return logWorkOrderHistory({
    workOrderId,
    action: 'status_change',
    description: `Estado cambiado de "${oldLabel}" a "${newLabel}"`,
    oldValue: { status: oldStatus },
    newValue: { status: newStatus },
  })
}

/** Registrar asignación de mecánico */
export async function logAssignment(
  workOrderId: string,
  mechanicName: string,
  previousMechanicName?: string
): Promise<boolean> {
  const description = previousMechanicName
    ? `Reasignado de "${previousMechanicName}" a "${mechanicName}"`
    : `Asignado a "${mechanicName}"`

  return logWorkOrderHistory({
    workOrderId,
    action: 'assignment',
    description,
    oldValue: previousMechanicName ? { assigned_to: previousMechanicName } : null,
    newValue: { assigned_to: mechanicName },
  })
}

/** Registrar actualización de campos generales */
export async function logFieldUpdate(
  workOrderId: string,
  changedFields: Record<string, { old: unknown; new: unknown }>
): Promise<boolean> {
  const fieldLabels: Record<string, string> = {
    description: 'Descripción',
    estimated_cost: 'Costo Estimado',
    status: 'Estado',
    assigned_to: 'Asignado a',
  }

  const changes = Object.entries(changedFields)
    .map(([key, val]) => `${fieldLabels[key] || key}: "${val.old || '—'}" → "${val.new || '—'}"`)
    .join(', ')

  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(changedFields)) {
    oldValue[key] = val.old
    newValue[key] = val.new
  }

  return logWorkOrderHistory({
    workOrderId,
    action: 'field_update',
    description: `Campos actualizados: ${changes}`,
    oldValue,
    newValue,
  })
}

/** Registrar actualización de vehículo */
export async function logVehicleUpdate(
  workOrderId: string,
  changedFields: Record<string, { old: unknown; new: unknown }>
): Promise<boolean> {
  const fieldLabels: Record<string, string> = {
    brand: 'Marca',
    model: 'Modelo',
    year: 'Año',
    license_plate: 'Placa',
    color: 'Color',
    mileage: 'Kilometraje',
    vin: 'VIN',
  }

  const changes = Object.entries(changedFields)
    .map(([key, val]) => `${fieldLabels[key] || key}: "${val.old || '—'}" → "${val.new || '—'}"`)
    .join(', ')

  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(changedFields)) {
    oldValue[key] = val.old
    newValue[key] = val.new
  }

  return logWorkOrderHistory({
    workOrderId,
    action: 'vehicle_update',
    description: `Vehículo actualizado: ${changes}`,
    oldValue,
    newValue,
  })
}

/** Registrar actualización de cliente */
export async function logCustomerUpdate(
  workOrderId: string,
  changedFields: Record<string, { old: unknown; new: unknown }>
): Promise<boolean> {
  const fieldLabels: Record<string, string> = {
    name: 'Nombre',
    phone: 'Teléfono',
    email: 'Email',
    address: 'Dirección',
  }

  const changes = Object.entries(changedFields)
    .map(([key, val]) => `${fieldLabels[key] || key}: "${val.old || '—'}" → "${val.new || '—'}"`)
    .join(', ')

  const oldValue: Record<string, unknown> = {}
  const newValue: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(changedFields)) {
    oldValue[key] = val.old
    newValue[key] = val.new
  }

  return logWorkOrderHistory({
    workOrderId,
    action: 'customer_update',
    description: `Cliente actualizado: ${changes}`,
    oldValue,
    newValue,
  })
}
