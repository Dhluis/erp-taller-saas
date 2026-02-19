import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * SERVICIO DE NOTIFICACIONES
 * =====================================================
 * Sistema completo de notificaciones para el ERP
 * usando la tabla notifications existente
 */

export type NotificationType = 
  | 'low_stock'
  | 'invoice_overdue'
  | 'quotation_approved'
  | 'order_completed'
  | 'payment_received'
  | 'supplier_order_received'
  | 'system_alert'
  | 'user_activity'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface NotificationData {
  id: string
  organization_id: string
  user_id?: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  is_read: boolean
  metadata?: Record<string, any>
  created_at: string
  read_at?: string
}

/**
 * Crear notificación genérica
 */
export async function createNotification(data: {
  organization_id: string
  user_id?: string
  type: NotificationType
  title: string
  message: string
  priority?: NotificationPriority
  metadata?: Record<string, any>
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        ...data,
        priority: data.priority || 'medium',
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return notification
  }, { operation: 'createNotification', table: 'notifications' })
}

/**
 * Notificar stock bajo
 */
export async function notifyLowStock(productId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener información del producto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        code,
        stock_quantity,
        min_stock,
        organization_id
      `)
      .eq('id', productId)
      .single()

    if (productError || !product) {
      throw new Error('Producto no encontrado')
    }

    // Verificar si ya existe una notificación reciente para este producto
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('organization_id', product.organization_id)
      .eq('type', 'low_stock')
      .eq('metadata->product_id', productId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24 horas
      .single()

    if (existingNotification) {
      return { message: 'Notificación ya existe para este producto' }
    }

    // Crear notificación
    const notification = await createNotification({
      organization_id: product.organization_id,
      type: 'low_stock',
      title: 'Stock Bajo - Producto',
      message: `El producto ${product.name} (${product.code}) tiene stock bajo. Stock actual: ${product.stock_quantity}, Mínimo: ${product.min_stock}`,
      priority: product.stock_quantity === 0 ? 'urgent' : 'high',
      metadata: {
        product_id: productId,
        product_name: product.name,
        product_code: product.code,
        current_stock: product.stock_quantity,
        min_stock: product.min_stock
      }
    })

    return notification
  }, { operation: 'notifyLowStock', table: 'notifications' })
}

/**
 * Notificar factura vencida
 */
export async function notifyInvoiceOverdue(invoiceId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener información de la factura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total,
        due_date,
        status,
        organization_id,
        customers!inner(name, email)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Factura no encontrada')
    }

    // Verificar si ya existe una notificación reciente para esta factura
    const { data: existingNotification } = await supabase
      .from('notifications')
      .select('id')
      .eq('organization_id', invoice.organization_id)
      .eq('type', 'invoice_overdue')
      .eq('metadata->invoice_id', invoiceId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 7 días
      .single()

    if (existingNotification) {
      return { message: 'Notificación ya existe para esta factura' }
    }

    // Crear notificación
    const notification = await createNotification({
      organization_id: invoice.organization_id,
      type: 'invoice_overdue',
      title: 'Factura Vencida',
      message: `La factura ${invoice.invoice_number} del cliente ${invoice.customers.name} está vencida. Monto: $${invoice.total_amount ?? invoice.total}`,
      priority: 'high',
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customers.name,
        customer_email: invoice.customers.email,
        total: invoice.total_amount ?? invoice.total,
        due_date: invoice.due_date
      }
    })

    return notification
  }, { operation: 'notifyInvoiceOverdue', table: 'notifications' })
}

/**
 * Notificar cotización aprobada
 */
export async function notifyQuotationApproved(quotationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener información de la cotización
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        total_amount,
        status,
        organization_id,
        customers!inner(name, email)
      `)
      .eq('id', quotationId)
      .single()

    if (quotationError || !quotation) {
      throw new Error('Cotización no encontrada')
    }

    // Crear notificación
    const notification = await createNotification({
      organization_id: quotation.organization_id,
      type: 'quotation_approved',
      title: 'Cotización Aprobada',
      message: `La cotización ${quotation.quotation_number} del cliente ${quotation.customers.name} ha sido aprobada. Monto: $${quotation.total_amount ?? (quotation as any).total ?? 0}`,
      priority: 'medium',
      metadata: {
        quotation_id: quotationId,
        quotation_number: quotation.quotation_number,
        customer_name: quotation.customers.name,
        customer_email: quotation.customers.email,
        total: quotation.total_amount ?? (quotation as any).total ?? 0,
        status: quotation.status
      }
    })

    return notification
  }, { operation: 'notifyQuotationApproved', table: 'notifications' })
}

/**
 * Notificar orden completada
 */
export async function notifyOrderCompleted(orderId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener información de la orden
    const { data: order, error: orderError } = await supabase
      .from('work_orders')
      .select(`
        id,
        order_number,
        total_amount,
        status,
        completed_at,
        organization_id,
        customers!inner(name, email)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Orden no encontrada')
    }

    // Crear notificación
    const notification = await createNotification({
      organization_id: order.organization_id,
      type: 'order_completed',
      title: 'Orden Completada',
      message: `La orden ${order.order_number} del cliente ${order.customers.name} ha sido completada. Monto: $${order.total_amount}`,
      priority: 'medium',
      metadata: {
        order_id: orderId,
        order_number: order.order_number,
        customer_name: order.customers.name,
        customer_email: order.customers.email,
        total_amount: order.total_amount,
        completed_at: order.completed_at
      }
    })

    return notification
  }, { operation: 'notifyOrderCompleted', table: 'notifications' })
}

/**
 * Notificar pago recibido
 */
export async function notifyPaymentReceived(invoiceId: string, amount: number) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener información de la factura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        organization_id,
        customers!inner(name, email)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Factura no encontrada')
    }

    // Crear notificación
    const notification = await createNotification({
      organization_id: invoice.organization_id,
      type: 'payment_received',
      title: 'Pago Recibido',
      message: `Se ha recibido un pago de $${amount} para la factura ${invoice.invoice_number} del cliente ${invoice.customers.name}`,
      priority: 'medium',
      metadata: {
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customers.name,
        customer_email: invoice.customers.email,
        payment_amount: amount,
        invoice_total: invoice.total_amount ?? invoice.total
      }
    })

    return notification
  }, { operation: 'notifyPaymentReceived', table: 'notifications' })
}

/**
 * Notificar orden de compra recibida
 */
export async function notifySupplierOrderReceived(orderId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener información de la orden de compra
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        total_amount,
        status,
        organization_id,
        suppliers!inner(name, contact_person)
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Orden de compra no encontrada')
    }

    // Crear notificación
    const notification = await createNotification({
      organization_id: order.organization_id,
      type: 'supplier_order_received',
      title: 'Orden de Compra Recibida',
      message: `La orden de compra ${order.order_number} del proveedor ${order.suppliers.name} ha sido recibida. Monto: $${order.total_amount ?? (order as any).total ?? 0}`,
      priority: 'medium',
      metadata: {
        order_id: orderId,
        order_number: order.order_number,
        supplier_name: order.suppliers.name,
        supplier_contact: order.suppliers.contact_person,
        total: order.total_amount ?? (order as any).total ?? 0,
        status: order.status
      }
    })

    return notification
  }, { operation: 'notifySupplierOrderReceived', table: 'notifications' })
}

/**
 * Notificar alerta del sistema
 */
export async function notifySystemAlert(
  organizationId: string,
  title: string,
  message: string,
  priority: NotificationPriority = 'medium',
  metadata?: Record<string, any>
) {
  return executeWithErrorHandling(async () => {
    const notification = await createNotification({
      organization_id: organizationId,
      type: 'system_alert',
      title,
      message,
      priority,
      metadata
    })

    return notification
  }, { operation: 'notifySystemAlert', table: 'notifications' })
}

/**
 * Notificar actividad del usuario
 */
export async function notifyUserActivity(
  organizationId: string,
  userId: string,
  activity: string,
  metadata?: Record<string, any>
) {
  return executeWithErrorHandling(async () => {
    const notification = await createNotification({
      organization_id: organizationId,
      user_id: userId,
      type: 'user_activity',
      title: 'Actividad del Usuario',
      message: activity,
      priority: 'low',
      metadata
    })

    return notification
  }, { operation: 'notifyUserActivity', table: 'notifications' })
}

/**
 * Verificar y crear notificaciones automáticas
 */
export async function checkAndCreateAutomaticNotifications(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const notifications = []

    // 1. Verificar productos con stock bajo
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('id, name, code, stock_quantity, min_stock')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .filter('stock_quantity', 'lte', supabase.raw('min_stock'))

    for (const product of lowStockProducts || []) {
      const notification = await notifyLowStock(product.id)
      notifications.push(notification)
    }

    // 2. Verificar facturas vencidas
    const today = new Date().toISOString().split('T')[0]
    const { data: overdueInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, due_date, status')
      .eq('organization_id', organizationId)
      .eq('status', 'sent')
      .lt('due_date', today)

    for (const invoice of overdueInvoices || []) {
      const notification = await notifyInvoiceOverdue(invoice.id)
      notifications.push(notification)
    }

    return {
      message: 'Notificaciones automáticas verificadas',
      notifications_created: notifications.length,
      details: notifications
    }
  }, { operation: 'checkAndCreateAutomaticNotifications', table: 'notifications' })
}

