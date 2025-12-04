/**
 * Mensajes del Sistema - Órdenes de Trabajo
 * Centraliza todos los mensajes de toast y notificaciones
 */

export const TOAST_MESSAGES = {
  // Órdenes
  order: {
    createSuccess: 'Orden creada exitosamente',
    createError: 'Error al crear orden',
    updateSuccess: 'Orden actualizada correctamente',
    updateError: 'Error al actualizar orden',
    deleteSuccess: 'Orden eliminada correctamente',
    deleteError: 'Error al eliminar orden',
    notFound: 'Orden no encontrada',
    loading: 'Cargando órdenes...',
    creating: 'Creando orden...',
    updating: 'Actualizando orden...',
    deleting: 'Eliminando orden...'
  },
  
  // Clientes
  customer: {
    found: 'Cliente encontrado',
    created: 'Cliente creado correctamente',
    updated: 'Cliente actualizado correctamente',
    deleted: 'Cliente eliminado correctamente',
    duplicate: 'Este cliente ya está registrado',
    notFound: 'Cliente no encontrado',
    createError: 'Error al crear cliente',
    updateError: 'Error al actualizar cliente',
    deleteError: 'Error al eliminar cliente',
    loading: 'Cargando clientes...',
    autoFilled: 'Datos del cliente autocompletados'
  },
  
  // Vehículos
  vehicle: {
    found: 'Vehículo encontrado',
    created: 'Vehículo registrado correctamente',
    updated: 'Vehículo actualizado correctamente',
    deleted: 'Vehículo eliminado correctamente',
    duplicate: 'Esta placa ya está registrada',
    notFound: 'Vehículo no encontrado',
    createError: 'Error al registrar vehículo',
    updateError: 'Error al actualizar vehículo',
    deleteError: 'Error al eliminar vehículo',
    loading: 'Cargando vehículos...',
    autoFilled: 'Datos del vehículo autocompletados'
  },
  
  // Inspección
  inspection: {
    created: 'Inspección guardada correctamente',
    updated: 'Inspección actualizada correctamente',
    deleted: 'Inspección eliminada correctamente',
    createError: 'Error al guardar inspección',
    updateError: 'Error al actualizar inspección',
    deleteError: 'Error al eliminar inspección'
  },
  
  // Validación
  validation: {
    required: 'Por favor completa todos los campos requeridos',
    invalidEmail: 'Email inválido',
    invalidPhone: 'Teléfono inválido',
    invalidData: 'Los datos ingresados no son válidos',
    checkFields: 'Revisa los campos marcados en rojo'
  },
  
  // Red/Conexión
  network: {
    offline: 'Sin conexión a internet',
    timeout: 'La solicitud tardó demasiado',
    error: 'Error de conexión',
    retrying: 'Reintentando...'
  },
  
  // Permisos
  permissions: {
    denied: 'No tienes permisos para esta acción',
    insufficientRole: 'Tu rol no permite esta operación',
    organizationMismatch: 'No puedes acceder a datos de otra organización'
  },
  
  // Borrador/Draft
  draft: {
    saved: 'Borrador guardado automáticamente',
    loaded: 'Se recuperó un borrador guardado',
    cleared: 'Borrador eliminado',
    saveError: 'Error al guardar borrador'
  },
  
  // Generales
  general: {
    success: 'Operación exitosa',
    error: 'Ocurrió un error',
    loading: 'Cargando...',
    saving: 'Guardando...',
    deleting: 'Eliminando...',
    processing: 'Procesando...',
    noChanges: 'No hay cambios para guardar',
    unsavedChanges: '¿Descartar cambios sin guardar?',
    confirmDelete: '¿Estás seguro de eliminar?',
    actionCancelled: 'Acción cancelada'
  }
} as const

/**
 * Plantillas de mensajes con interpolación
 */
export const MESSAGE_TEMPLATES = {
  order: {
    created: (orderNumber: string) => 
      `Orden #${orderNumber} creada exitosamente`,
    
    updated: (orderNumber: string) => 
      `Orden #${orderNumber} actualizada`,
    
    deleted: (orderNumber: string) => 
      `Orden #${orderNumber} eliminada`,
    
    assignedTo: (orderNumber: string, mechanicName: string) => 
      `Orden #${orderNumber} asignada a ${mechanicName}`,
    
    statusChanged: (orderNumber: string, status: string) => 
      `Orden #${orderNumber} cambió a estado: ${status}`
  },
  
  customer: {
    created: (name: string) => 
      `Cliente "${name}" creado correctamente`,
    
    updated: (name: string) => 
      `Cliente "${name}" actualizado`,
    
    hasOrders: (name: string, count: number) => 
      `${name} tiene ${count} orden${count !== 1 ? 'es' : ''}`
  },
  
  vehicle: {
    created: (brand: string, model: string, plate: string) => 
      `${brand} ${model} (${plate}) registrado`,
    
    updated: (plate: string) => 
      `Vehículo ${plate} actualizado`,
    
    hasOrders: (plate: string, count: number) => 
      `${plate} tiene ${count} orden${count !== 1 ? 'es' : ''}`
  },
  
  validation: {
    fieldTooShort: (field: string, min: number) => 
      `${field} debe tener al menos ${min} caracteres`,
    
    fieldTooLong: (field: string, max: number) => 
      `${field} debe tener máximo ${max} caracteres`,
    
    fieldRequired: (field: string) => 
      `${field} es requerido`,
    
    valueTooLow: (field: string, min: number) => 
      `${field} debe ser mayor o igual a ${min}`,
    
    valueTooHigh: (field: string, max: number) => 
      `${field} debe ser menor o igual a ${max}`
  }
} as const

/**
 * Helper para obtener mensaje con descripción
 */
export const getToastMessage = (
  category: keyof typeof TOAST_MESSAGES,
  key: string,
  description?: string
) => {
  const message = TOAST_MESSAGES[category]?.[key as keyof typeof TOAST_MESSAGES[typeof category]]
  
  if (description) {
    return { message, description }
  }
  
  return message
}

/**
 * Status labels en español
 */
export const STATUS_LABELS = {
  reception: 'Recepción',
  diagnostic: 'Diagnóstico',
  approved: 'Aprobado',
  in_progress: 'En Progreso',
  completed: 'Completado',
  delivered: 'Entregado',
  cancelled: 'Cancelado'
} as const

/**
 * Priority labels
 */
export const PRIORITY_LABELS = {
  low: 'Baja',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente'
} as const

