/**
 * Esquemas de Validación con Zod
 * Define esquemas de validación para todas las entidades del sistema
 */

import { z } from 'zod'

/**
 * Esquemas base
 */
export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
})

export const baseCreateSchema = z.object({
  organization_id: z.string().uuid().optional()
})

export const baseUpdateSchema = z.object({
  updated_at: z.string().datetime().optional()
})

/**
 * Esquemas de validación comunes
 */
export const emailSchema = z.string().email('Email inválido').optional()
export const phoneSchema = z.string().min(10, 'Teléfono debe tener al menos 10 dígitos').optional()
export const rfcSchema = z.string().min(12, 'RFC debe tener al menos 12 caracteres').max(13, 'RFC debe tener máximo 13 caracteres').optional()
export const currencySchema = z.number().min(0, 'El monto debe ser positivo')
export const positiveIntegerSchema = z.number().int().min(0, 'Debe ser un número entero positivo')
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha debe estar en formato YYYY-MM-DD')
export const datetimeSchema = z.string().datetime('Fecha debe estar en formato ISO 8601')

/**
 * Esquemas de enums
 */
export const entityStatusSchema = z.enum(['active', 'inactive', 'pending', 'completed', 'cancelled'])
export const entityPrioritySchema = z.enum(['low', 'medium', 'high', 'urgent'])
export const paymentMethodSchema = z.enum(['cash', 'transfer', 'card', 'check'])
export const paymentStatusSchema = z.enum(['pending', 'completed', 'failed', 'cancelled', 'refunded'])
export const orderStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'])
export const quotationStatusSchema = z.enum(['draft', 'sent', 'approved', 'rejected', 'expired', 'converted'])
export const invoiceStatusSchema = z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
export const itemTypeSchema = z.enum(['service', 'product'])
export const appointmentStatusSchema = z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled'])
export const leadStatusSchema = z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
export const campaignTypeSchema = z.enum(['email', 'phone', 'social', 'event'])
export const campaignStatusSchema = z.enum(['active', 'paused', 'completed', 'cancelled'])
export const notificationTypeSchema = z.enum([
  'info', 'warning', 'success', 'error', 'stock_low', 
  'order_completed', 'quotation_created', 'payment_received', 'appointment_reminder'
])

/**
 * Esquemas de ubicación
 */
export const locationSchema = z.object({
  address: z.string().min(1, 'Dirección es requerida'),
  city: z.string().min(1, 'Ciudad es requerida'),
  state: z.string().min(1, 'Estado es requerido'),
  country: z.string().min(1, 'País es requerido'),
  postal_code: z.string().min(1, 'Código postal es requerido'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
})

/**
 * CLIENTES
 */
export const createCustomerSchema = baseCreateSchema.extend({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  email: emailSchema,
  phone: phoneSchema,
  address: locationSchema.optional(),
  rfc: rfcSchema,
  status: entityStatusSchema.default('active'),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updateCustomerSchema = baseUpdateSchema.extend({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo').optional(),
  email: emailSchema,
  phone: phoneSchema,
  address: locationSchema.optional(),
  rfc: rfcSchema,
  status: entityStatusSchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * VEHÍCULOS
 */
export const createVehicleSchema = baseCreateSchema.extend({
  customer_id: z.string().uuid('ID de cliente inválido'),
  make: z.string().min(1, 'Marca es requerida').max(50, 'Marca muy larga'),
  model: z.string().min(1, 'Modelo es requerido').max(50, 'Modelo muy largo'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  license_plate: z.string().max(20, 'Placa muy larga').optional(),
  vin: z.string().length(17, 'VIN debe tener 17 caracteres').optional(),
  color: z.string().max(30, 'Color muy largo').optional(),
  mileage: positiveIntegerSchema.optional(),
  status: entityStatusSchema.default('active'),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updateVehicleSchema = baseUpdateSchema.extend({
  customer_id: z.string().uuid('ID de cliente inválido').optional(),
  make: z.string().min(1, 'Marca es requerida').max(50, 'Marca muy larga').optional(),
  model: z.string().min(1, 'Modelo es requerido').max(50, 'Modelo muy largo').optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  license_plate: z.string().max(20, 'Placa muy larga').optional(),
  vin: z.string().length(17, 'VIN debe tener 17 caracteres').optional(),
  color: z.string().max(30, 'Color muy largo').optional(),
  mileage: positiveIntegerSchema.optional(),
  status: entityStatusSchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * PROVEEDORES
 */
export const createSupplierSchema = baseCreateSchema.extend({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  contact_person: z.string().max(100, 'Nombre de contacto muy largo').optional(),
  email: emailSchema,
  phone: phoneSchema,
  address: locationSchema.optional(),
  status: entityStatusSchema.default('active'),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updateSupplierSchema = baseUpdateSchema.extend({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo').optional(),
  contact_person: z.string().max(100, 'Nombre de contacto muy largo').optional(),
  email: emailSchema,
  phone: phoneSchema,
  address: locationSchema.optional(),
  status: entityStatusSchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * INVENTARIO
 */
export const createInventoryItemSchema = baseCreateSchema.extend({
  code: z.string().min(1, 'Código es requerido').max(50, 'Código muy largo'),
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  description: z.string().max(500, 'Descripción muy larga').optional(),
  quantity: positiveIntegerSchema,
  min_quantity: positiveIntegerSchema.min(1, 'Cantidad mínima debe ser al menos 1'),
  unit_price: currencySchema,
  category: z.string().min(1, 'Categoría es requerida').max(50, 'Categoría muy larga'),
  status: entityStatusSchema.default('active'),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updateInventoryItemSchema = baseUpdateSchema.extend({
  code: z.string().min(1, 'Código es requerido').max(50, 'Código muy largo').optional(),
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo').optional(),
  description: z.string().max(500, 'Descripción muy larga').optional(),
  quantity: positiveIntegerSchema.optional(),
  min_quantity: positiveIntegerSchema.min(1, 'Cantidad mínima debe ser al menos 1').optional(),
  unit_price: currencySchema.optional(),
  category: z.string().min(1, 'Categoría es requerida').max(50, 'Categoría muy larga').optional(),
  status: entityStatusSchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * MOVIMIENTOS DE INVENTARIO
 */
export const createInventoryMovementSchema = baseCreateSchema.extend({
  product_id: z.string().uuid('ID de producto inválido'),
  movement_type: z.enum(['in', 'out', 'adjustment']),
  quantity: z.number().int().min(1, 'Cantidad debe ser al menos 1'),
  reference_type: z.string().min(1, 'Tipo de referencia es requerido'),
  reference_id: z.string().optional(),
  notes: z.string().max(500, 'Notas muy largas').optional(),
  user_id: z.string().uuid('ID de usuario inválido').optional()
})

export const updateInventoryMovementSchema = baseUpdateSchema.extend({
  product_id: z.string().uuid('ID de producto inválido').optional(),
  movement_type: z.enum(['in', 'out', 'adjustment']).optional(),
  quantity: z.number().int().min(1, 'Cantidad debe ser al menos 1').optional(),
  reference_type: z.string().min(1, 'Tipo de referencia es requerido').optional(),
  reference_id: z.string().optional(),
  notes: z.string().max(500, 'Notas muy largas').optional(),
  user_id: z.string().uuid('ID de usuario inválido').optional()
})

/**
 * ÓRDENES DE TRABAJO
 */
export const createWorkOrderSchema = baseCreateSchema.extend({
  order_number: z.string().min(1, 'Número de orden es requerido').max(50, 'Número de orden muy largo'),
  customer_id: z.string().uuid('ID de cliente inválido'),
  vehicle_id: z.string().uuid('ID de vehículo inválido').optional(),
  status: orderStatusSchema.default('pending'),
  priority: entityPrioritySchema.default('medium'),
  estimated_hours: z.number().min(0, 'Horas estimadas deben ser positivas').optional(),
  actual_hours: z.number().min(0, 'Horas reales deben ser positivas').optional(),
  total_cost: currencySchema.default(0),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updateWorkOrderSchema = baseUpdateSchema.extend({
  order_number: z.string().min(1, 'Número de orden es requerido').max(50, 'Número de orden muy largo').optional(),
  customer_id: z.string().uuid('ID de cliente inválido').optional(),
  vehicle_id: z.string().uuid('ID de vehículo inválido').optional(),
  status: orderStatusSchema.optional(),
  priority: entityPrioritySchema.optional(),
  estimated_hours: z.number().min(0, 'Horas estimadas deben ser positivas').optional(),
  actual_hours: z.number().min(0, 'Horas reales deben ser positivas').optional(),
  total_cost: currencySchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * COBROS
 */
export const createCollectionSchema = baseCreateSchema.extend({
  client_id: z.string().min(1, 'ID de cliente es requerido'),
  invoice_id: z.string().min(1, 'ID de factura es requerido'),
  amount: currencySchema,
  collection_date: dateSchema,
  payment_method: paymentMethodSchema,
  reference: z.string().max(100, 'Referencia muy larga').optional(),
  status: paymentStatusSchema.default('pending'),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updateCollectionSchema = baseUpdateSchema.extend({
  client_id: z.string().min(1, 'ID de cliente es requerido').optional(),
  invoice_id: z.string().min(1, 'ID de factura es requerido').optional(),
  amount: currencySchema.optional(),
  collection_date: dateSchema.optional(),
  payment_method: paymentMethodSchema.optional(),
  reference: z.string().max(100, 'Referencia muy larga').optional(),
  status: paymentStatusSchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * PAGOS A PROVEEDORES
 */
export const createPaymentSchema = baseCreateSchema.extend({
  supplier_id: z.string().uuid('ID de proveedor inválido'),
  invoice_number: z.string().min(1, 'Número de factura es requerido').max(50, 'Número de factura muy largo'),
  amount: currencySchema,
  payment_date: dateSchema,
  payment_method: paymentMethodSchema,
  reference: z.string().max(100, 'Referencia muy larga').optional(),
  status: paymentStatusSchema.default('pending'),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updatePaymentSchema = baseUpdateSchema.extend({
  supplier_id: z.string().uuid('ID de proveedor inválido').optional(),
  invoice_number: z.string().min(1, 'Número de factura es requerido').max(50, 'Número de factura muy largo').optional(),
  amount: currencySchema.optional(),
  payment_date: dateSchema.optional(),
  payment_method: paymentMethodSchema.optional(),
  reference: z.string().max(100, 'Referencia muy larga').optional(),
  status: paymentStatusSchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * ÓRDENES DE COMPRA
 */
export const createPurchaseOrderSchema = baseCreateSchema.extend({
  supplier_id: z.string().uuid('ID de proveedor inválido'),
  order_number: z.string().min(1, 'Número de orden es requerido').max(50, 'Número de orden muy largo'),
  order_date: dateSchema,
  expected_delivery_date: dateSchema.optional(),
  status: orderStatusSchema.default('pending'),
  subtotal: currencySchema.default(0),
  tax_amount: currencySchema.default(0),
  total: currencySchema.default(0),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updatePurchaseOrderSchema = baseUpdateSchema.extend({
  supplier_id: z.string().uuid('ID de proveedor inválido').optional(),
  order_number: z.string().min(1, 'Número de orden es requerido').max(50, 'Número de orden muy largo').optional(),
  order_date: dateSchema.optional(),
  expected_delivery_date: dateSchema.optional(),
  status: orderStatusSchema.optional(),
  subtotal: currencySchema.optional(),
  tax_amount: currencySchema.optional(),
  total: currencySchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * CITAS
 */
export const createAppointmentSchema = baseCreateSchema.extend({
  customer_name: z.string().min(1, 'Nombre del cliente es requerido').max(100, 'Nombre muy largo'),
  customer_phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  customer_email: emailSchema,
  vehicle_info: z.string().min(1, 'Información del vehículo es requerida').max(200, 'Información muy larga'),
  service_type: z.string().min(1, 'Tipo de servicio es requerido').max(100, 'Tipo de servicio muy largo'),
  appointment_date: dateSchema,
  appointment_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora debe estar en formato HH:MM'),
  status: appointmentStatusSchema.default('scheduled'),
  notes: z.string().max(500, 'Notas muy largas').optional(),
  estimated_duration: z.number().int().min(15, 'Duración mínima es 15 minutos').max(480, 'Duración máxima es 8 horas').default(60)
})

export const updateAppointmentSchema = baseUpdateSchema.extend({
  customer_name: z.string().min(1, 'Nombre del cliente es requerido').max(100, 'Nombre muy largo').optional(),
  customer_phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos').optional(),
  customer_email: emailSchema,
  vehicle_info: z.string().min(1, 'Información del vehículo es requerida').max(200, 'Información muy larga').optional(),
  service_type: z.string().min(1, 'Tipo de servicio es requerido').max(100, 'Tipo de servicio muy largo').optional(),
  appointment_date: dateSchema.optional(),
  appointment_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Hora debe estar en formato HH:MM').optional(),
  status: appointmentStatusSchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional(),
  estimated_duration: z.number().int().min(15, 'Duración mínima es 15 minutos').max(480, 'Duración máxima es 8 horas').optional()
})

/**
 * LEADS
 */
export const createLeadSchema = baseCreateSchema.extend({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  company: z.string().max(100, 'Empresa muy larga').optional(),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos'),
  email: z.string().email('Email inválido'),
  source: z.string().min(1, 'Fuente es requerida').max(50, 'Fuente muy larga'),
  status: leadStatusSchema.default('new'),
  value: currencySchema,
  notes: z.string().max(500, 'Notas muy largas').optional(),
  last_contact: dateSchema.optional(),
  assigned_to: z.string().max(100, 'Asignado a muy largo').optional()
})

export const updateLeadSchema = baseUpdateSchema.extend({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo').optional(),
  company: z.string().max(100, 'Empresa muy larga').optional(),
  phone: z.string().min(10, 'Teléfono debe tener al menos 10 dígitos').optional(),
  email: z.string().email('Email inválido').optional(),
  source: z.string().min(1, 'Fuente es requerida').max(50, 'Fuente muy larga').optional(),
  status: leadStatusSchema.optional(),
  value: currencySchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional(),
  last_contact: dateSchema.optional(),
  assigned_to: z.string().max(100, 'Asignado a muy largo').optional()
})

/**
 * CAMPAÑAS
 */
export const createCampaignSchema = baseCreateSchema.extend({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  type: campaignTypeSchema,
  status: campaignStatusSchema.default('active'),
  leads_generated: z.number().int().min(0, 'Leads generados deben ser positivos').default(0),
  conversion_rate: z.number().min(0, 'Tasa de conversión debe ser positiva').max(100, 'Tasa de conversión no puede ser mayor a 100').default(0),
  budget: currencySchema,
  spent: currencySchema.default(0),
  start_date: dateSchema,
  end_date: dateSchema,
  notes: z.string().max(500, 'Notas muy largas').optional()
})

export const updateCampaignSchema = baseUpdateSchema.extend({
  name: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo').optional(),
  type: campaignTypeSchema.optional(),
  status: campaignStatusSchema.optional(),
  leads_generated: z.number().int().min(0, 'Leads generados deben ser positivos').optional(),
  conversion_rate: z.number().min(0, 'Tasa de conversión debe ser positiva').max(100, 'Tasa de conversión no puede ser mayor a 100').optional(),
  budget: currencySchema.optional(),
  spent: currencySchema.optional(),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  notes: z.string().max(500, 'Notas muy largas').optional()
})

/**
 * NOTIFICACIONES
 */
export const createNotificationSchema = baseCreateSchema.extend({
  user_id: z.string().uuid('ID de usuario inválido').optional(),
  type: notificationTypeSchema,
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo'),
  message: z.string().min(1, 'Mensaje es requerido').max(500, 'Mensaje muy largo'),
  data: z.any().optional(),
  read: z.boolean().default(false),
  action_url: z.string().url('URL de acción inválida').optional()
})

export const updateNotificationSchema = baseUpdateSchema.extend({
  user_id: z.string().uuid('ID de usuario inválido').optional(),
  type: notificationTypeSchema.optional(),
  title: z.string().min(1, 'Título es requerido').max(100, 'Título muy largo').optional(),
  message: z.string().min(1, 'Mensaje es requerido').max(500, 'Mensaje muy largo').optional(),
  data: z.any().optional(),
  read: z.boolean().optional(),
  action_url: z.string().url('URL de acción inválida').optional()
})

/**
 * Esquemas de búsqueda y filtros
 */
export const searchFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
})

export const paginationSchema = z.object({
  page: z.number().int().min(1, 'Página debe ser al menos 1').default(1),
  limit: z.number().int().min(1, 'Límite debe ser al menos 1').max(100, 'Límite máximo es 100').default(10),
  offset: z.number().int().min(0, 'Offset debe ser positivo').optional()
})

/**
 * Esquemas de respuesta
 */
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.string().datetime()
})

/**
 * Esquemas de formulario
 */
export const formDataSchema = z.object({
  values: z.any(),
  errors: z.record(z.string()),
  touched: z.record(z.boolean()),
  isSubmitting: z.boolean(),
  isValid: z.boolean()
})
