import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * QUERIES PARA FACTURAS (INVOICES)
 * =====================================================
 * Sistema completo de gestión de facturas con numeración
 * automática, cálculo de totales y control de vencimientos
 */

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'check'

/**
 * Obtener todas las facturas con filtros
 */
export async function getAllInvoices(
  organizationId: string,
  filters?: {
    status?: InvoiceStatus
    customer_id?: string
    from_date?: string
    to_date?: string
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    let query = supabase
      .from('invoices')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        vehicles (
          id,
          brand,
          model,
          year,
          license_plate
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id)
    }

    if (filters?.from_date) {
      query = query.gte('created_at', filters.from_date)
    }

    if (filters?.to_date) {
      query = query.lte('created_at', filters.to_date)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }, { operation: 'getAllInvoices', table: 'invoices' })
}

/**
 * Obtener factura por ID con todos los detalles
 */
export async function getInvoiceById(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone,
          address
        ),
        vehicles (
          id,
          brand,
          model,
          year,
          license_plate,
          vin
        ),
        invoice_items (
          id,
          item_type,
          product_id,
          service_id,
          description,
          quantity,
          unit_price,
          discount_percent,
          discount_amount,
          tax_percent,
          tax_amount,
          total,
          products (
            id,
            name,
            sku
          ),
          services (
            id,
            name
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }, { operation: 'getInvoiceById', table: 'invoices' })
}

/**
 * Obtener facturas de un cliente específico
 */
export async function getInvoicesByCustomer(customerId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        vehicles (
          brand,
          model,
          license_plate
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }, { operation: 'getInvoicesByCustomer', table: 'invoices' })
}

/**
 * Obtener facturas vencidas
 */
export async function getOverdueInvoices(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        )
      `)
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'overdue'])
      .lt('due_date', today)
      .order('due_date', { ascending: true })

    if (error) throw error
    return data || []
  }, { operation: 'getOverdueInvoices', table: 'invoices' })
}

/**
 * Generar número de factura único
 */
async function getLastInvoiceNumber(organizationId: string, year: number) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('organization_id', organizationId)
      .like('invoice_number', `INV-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    
    if (data?.invoice_number) {
      const match = data.invoice_number.match(/INV-\d{4}-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    }
    
    return 0
  }, { operation: 'getLastInvoiceNumber', table: 'invoices' })
}

export async function generateInvoiceNumber(organizationId: string) {
  const year = new Date().getFullYear()
  const lastNumber = await getLastInvoiceNumber(organizationId, year)
  const nextNumber = (lastNumber || 0) + 1
  return `INV-${year}-${String(nextNumber).padStart(4, '0')}`
}

/**
 * Crear una nueva factura
 */
export async function createInvoice(data: {
  organization_id: string
  customer_id: string
  vehicle_id?: string
  work_order_id?: string
  description?: string
  due_date: string
  notes?: string
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Validar due_date es futura
    const dueDate = new Date(data.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (dueDate < today) {
      throw new Error('La fecha de vencimiento debe ser futura')
    }

    // Generar número de factura
    const invoiceNumber = await generateInvoiceNumber(data.organization_id)

    // Crear factura
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert({
        ...data,
        invoice_number: invoiceNumber,
        status: 'draft',
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        vehicles (
          id,
          brand,
          model,
          license_plate
        )
      `)
      .single()

    if (error) throw error
    return invoice
  }, { operation: 'createInvoice', table: 'invoices' })
}

/**
 * Crear factura desde orden de trabajo completada
 */
export async function createInvoiceFromWorkOrder(workOrderId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Obtener work_order con items
    const { data: workOrder, error: orderError } = await supabase
      .from('work_orders')
      .select(`
        *,
        order_items (
          item_type,
          product_id,
          service_id,
          description,
          quantity,
          unit_price,
          discount_percent,
          discount_amount,
          tax_percent,
          tax_amount,
          total
        )
      `)
      .eq('id', workOrderId)
      .single()

    if (orderError) throw new Error('Orden de trabajo no encontrada')
    if (!workOrder) throw new Error('Orden de trabajo no encontrada')

    // 2. Verificar que esté completada
    if (workOrder.status !== 'completed') {
      throw new Error('Solo se pueden facturar órdenes completadas')
    }

    // 3. Verificar que no tenga factura ya
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('work_order_id', workOrderId)
      .single()

    if (existingInvoice) {
      throw new Error('Esta orden ya tiene una factura asociada')
    }

    // 4. Generar número de factura
    const invoiceNumber = await generateInvoiceNumber(workOrder.organization_id)

    // 5. Calcular due_date (30 días desde hoy)
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)

    // 6. Crear factura
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        organization_id: workOrder.organization_id,
        customer_id: workOrder.customer_id,
        vehicle_id: workOrder.vehicle_id,
        work_order_id: workOrderId,
        invoice_number: invoiceNumber,
        status: 'draft',
        description: workOrder.description,
        due_date: dueDate.toISOString().split('T')[0],
        subtotal: workOrder.subtotal || 0,
        tax_amount: workOrder.tax_amount || 0,
        discount_amount: workOrder.discount_amount || 0,
        total: workOrder.total_amount || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        vehicles (
          id,
          brand,
          model,
          license_plate
        )
      `)
      .single()

    if (invoiceError) throw invoiceError

    // 7. Copiar order_items a invoice_items
    if (workOrder.order_items && workOrder.order_items.length > 0) {
      const invoiceItems = workOrder.order_items.map((item: any) => ({
        invoice_id: invoice.id,
        item_type: item.item_type,
        product_id: item.product_id,
        service_id: item.service_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        discount_amount: item.discount_amount || 0,
        tax_percent: item.tax_percent || 0,
        tax_amount: item.tax_amount || 0,
        total: item.total || 0
      }))

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems)

      if (itemsError) {
        // Rollback: eliminar factura creada
        await supabase.from('invoices').delete().eq('id', invoice.id)
        throw new Error('Error al copiar items de la orden: ' + itemsError.message)
      }
    }

    return invoice
  }, { operation: 'createInvoiceFromWorkOrder', table: 'invoices' })
}

/**
 * Actualizar factura
 */
export async function updateInvoice(id: string, data: any) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que la factura no esté pagada o cancelada
    const { data: current } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', id)
      .single()

    if (current?.status === 'paid') {
      throw new Error('No se puede editar una factura pagada')
    }

    if (current?.status === 'cancelled') {
      throw new Error('No se puede editar una factura cancelada')
    }

    // Validar due_date si se proporciona
    if (data.due_date) {
      const dueDate = new Date(data.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dueDate < today && current?.status === 'draft') {
        throw new Error('La fecha de vencimiento debe ser futura')
      }
    }

    const { data: updated, error } = await supabase
      .from('invoices')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        ),
        vehicles (
          id,
          brand,
          model,
          license_plate
        )
      `)
      .single()

    if (error) throw error
    return updated
  }, { operation: 'updateInvoice', table: 'invoices' })
}

/**
 * Actualizar estado de factura
 */
export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('invoices')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }, { operation: 'updateInvoiceStatus', table: 'invoices' })
}

/**
 * Marcar factura como pagada
 */
export async function markInvoiceAsPaid(
  id: string,
  paymentData: {
    payment_method: PaymentMethod
    paid_date?: string
    payment_reference?: string
    payment_notes?: string
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que la factura exista
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status, invoice_number')
      .eq('id', id)
      .single()

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    if (invoice.status === 'paid') {
      throw new Error('La factura ya está pagada')
    }

    if (invoice.status === 'cancelled') {
      throw new Error('No se puede marcar como pagada una factura cancelada')
    }

    const { data: updated, error } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        payment_method: paymentData.payment_method,
        paid_date: paymentData.paid_date || new Date().toISOString().split('T')[0],
        payment_reference: paymentData.payment_reference || null,
        payment_notes: paymentData.payment_notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        customers (
          id,
          name,
          email,
          phone
        )
      `)
      .single()

    if (error) throw error
    return updated
  }, { operation: 'markInvoiceAsPaid', table: 'invoices' })
}

/**
 * Obtener totales de facturas sin pagar
 */
export async function getUnpaidTotals(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('invoices')
      .select('total, status, due_date')
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'sent', 'overdue'])

    if (error) throw error

    const today = new Date().toISOString().split('T')[0]
    
    const totals = {
      total_unpaid: 0,
      total_overdue: 0,
      count_unpaid: 0,
      count_overdue: 0
    }

    data?.forEach(invoice => {
      totals.total_unpaid += invoice.total || 0
      totals.count_unpaid += 1

      if (invoice.due_date < today && invoice.status !== 'draft') {
        totals.total_overdue += invoice.total || 0
        totals.count_overdue += 1
      }
    })

    return totals
  }, { operation: 'getUnpaidTotals', table: 'invoices' })
}

/**
 * Verificar y actualizar facturas vencidas
 */
export async function checkAndUpdateOverdueInvoices(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Buscar facturas enviadas que ya vencieron
    const { data: overdueInvoices, error: searchError } = await supabase
      .from('invoices')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'sent')
      .lt('due_date', today)

    if (searchError) throw searchError

    if (overdueInvoices && overdueInvoices.length > 0) {
      const ids = overdueInvoices.map(inv => inv.id)
      
      const { data: updated, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'overdue',
          updated_at: new Date().toISOString()
        })
        .in('id', ids)
        .select()

      if (updateError) throw updateError
      return updated || []
    }

    return []
  }, { operation: 'checkAndUpdateOverdueInvoices', table: 'invoices' })
}
