import { createClient, type SupabaseServerClient } from '@/lib/supabase/server'
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
        customer:customers (
          id,
          name,
          email,
          phone
        ),
        vehicle:vehicles (
          id,
          brand,
          model,
          year,
          license_plate,
          vin
        ),
        invoice_items (
          id,
          description,
          quantity,
          unit_price,
          total_amount
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

export type CreateInvoiceWorkOrderData = {
  organization_id: string
  customer_id: string
  status: string
  vehicle_id?: string | null
  description?: string | null
  subtotal?: number | null
  tax_amount?: number | null
  discount_amount?: number | null
  order_items?: Array<any>
}

/**
 * Crear factura desde orden de trabajo completada
 * Usa work_order_services si existen, sino order_items como fallback
 */
export async function createInvoiceFromWorkOrder(
  workOrderId: string,
  supabaseClient: SupabaseServerClient,
  workOrderData?: CreateInvoiceWorkOrderData
) {
  return executeWithErrorHandling(async () => {
    const supabase = supabaseClient
    let workOrder: any

    if (workOrderData) {
      console.log('[Invoice] 🏢 workOrderData recibido:', workOrderData)
      // Usar datos pasados directamente, saltar query
      if (workOrderData.status !== 'completed') {
        throw new Error('Solo se pueden facturar órdenes completadas')
      }
      workOrder = {
        organization_id: workOrderData.organization_id,
        customer_id: workOrderData.customer_id,
        vehicle_id: workOrderData.vehicle_id ?? null,
        description: workOrderData.description ?? '',
        subtotal: workOrderData.subtotal ?? 0,
        tax_amount: workOrderData.tax_amount ?? 0,
        discount_amount: workOrderData.discount_amount ?? 0,
        order_items: workOrderData.order_items ?? [],
      }
    } else {
      // Fallback: query a work_orders
      console.log('[Invoice] 🏢 workOrderData recibido:', workOrderData)
      const { data, error: orderError } = await supabase
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
      if (!data) throw new Error('Orden de trabajo no encontrada')
      workOrder = data

      if (workOrder.status !== 'completed') {
        throw new Error('Solo se pueden facturar órdenes completadas')
      }
    }

    // 3. Verificar que no tenga factura ya (por notes, work_order_id no existe en invoices)
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('id')
      .ilike('notes', `%${workOrderId}%`)

    if (existingInvoices && existingInvoices.length > 0) {
      throw new Error('Esta orden ya tiene una factura asociada')
    }

    // 4. Buscar work_order_services de la orden
    const { data: workOrderServices } = await supabase
      .from('work_order_services')
      .select('*')
      .eq('work_order_id', workOrderId)
      .eq('organization_id', workOrder.organization_id)

    const useServices = workOrderServices && workOrderServices.length > 0

    // 5. Construir invoice_items y totales según la fuente
    let invoiceItems: Array<Record<string, unknown>>
    let itemsSubtotal = 0
    let itemsTaxAmount = 0
    let itemsDiscountAmount = 0
    let itemsTotal = 0

    if (useServices) {
      invoiceItems = workOrderServices.map((service: any) => {
        const total = Number(service.total_price ?? service.unit_price * service.quantity) || 0
        itemsTotal += total
        return {
          item_type: 'service',
          product_id: null,
          service_id: null,
          description: service.name || service.description || 'Servicio',
          quantity: service.quantity ?? 1,
          unit_price: service.unit_price ?? 0,
          discount_percent: 0,
          discount_amount: 0,
          tax_percent: 0,
          tax_amount: 0,
          total,
        }
      })
      itemsSubtotal = itemsTotal
    } else {
      // Fallback a order_items
      const orderItems = workOrder.order_items || []
      invoiceItems = orderItems.map((item: any) => {
        const total = Number(item.total_amount ?? item.total) || 0
        itemsTotal += total
        itemsTaxAmount += Number(item.tax_amount) || 0
        itemsDiscountAmount += Number(item.discount_amount) || 0
        return {
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
          total,
        }
      })
      itemsSubtotal = itemsTotal - itemsTaxAmount + itemsDiscountAmount
    }

    // 6. Generar número de factura
    const invoiceNumber = await generateInvoiceNumber(workOrder.organization_id)

    // 8. Crear factura
    const invoiceData = {
      organization_id: workOrder.organization_id,
      customer_id: workOrder.customer_id,
      vehicle_id: workOrder.vehicle_id,
      invoice_number: invoiceNumber,
      status: 'draft',
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal: itemsTotal,
      tax_amount: 0,
      discount_amount: 0,
      total: itemsTotal,
      notes: `Generado automáticamente desde orden ${workOrderId}`,
    }
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
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

    // 9. Mapear items a columnas válidas de invoice_items
    // (invoice_id, organization_id, description, quantity, unit_price, discount_percent, subtotal, tax_amount, total)
    const itemsToInsert = invoiceItems.map((it: any) => ({
      invoice_id: invoice.id,
      organization_id: workOrder.organization_id,
      description: it.description || 'Item',
      quantity: it.quantity ?? 1,
      unit_price: it.unit_price ?? 0,
      discount_percent: it.discount_percent ?? 0,
      subtotal: it.total ?? it.total_amount ?? 0,
      tax_amount: it.tax_amount ?? 0,
      total_amount: it.total ?? it.total_amount ?? 0,
    }))

    // 10. Insertar invoice_items
    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)

      if (itemsError) {
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
      .select('total_amount, status, due_date')
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
      totals.total_unpaid += invoice.total_amount ?? invoice.total ?? 0
      totals.count_unpaid += 1

      if (invoice.due_date < today && invoice.status !== 'draft') {
        totals.total_overdue += invoice.total_amount ?? invoice.total ?? 0
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

/**
 * Estadísticas para dashboard de ingresos
 * Usa columna total_amount
 */
export async function getIncomeStats(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('invoices')
      .select('status, total_amount, due_date, paid_date, created_at')
      .eq('organization_id', organizationId)

    if (error) throw error

    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    const amt = (i: { total_amount?: number; total?: number }) => Number(i.total_amount ?? i.total ?? 0)

    const paid = (data || []).filter((i) => i.status === 'paid')
    const pending = (data || []).filter((i) => i.status === 'draft' || i.status === 'sent')
    const overdue = (data || []).filter(
      (i) => i.status === 'overdue' || (i.due_date && String(i.due_date).slice(0, 10) < todayStr && i.status !== 'paid' && i.status !== 'cancelled')
    )

    const total_cobrado = paid.reduce((sum, i) => sum + amt(i), 0)
    const total_pendiente = pending.reduce((sum, i) => sum + amt(i), 0)
    const total_vencido = overdue.reduce((sum, i) => sum + amt(i), 0)
    const ingresos_este_mes = paid
      .filter((i) => (i.paid_date || i.created_at || '').toString().slice(0, 10) >= firstDayOfMonth)
      .reduce((sum, i) => sum + amt(i), 0)
    const facturas_pagadas = paid.length
    const facturas_pendientes = pending.length
    const facturas_vencidas = overdue.length
    const averageInvoiceValue = facturas_pagadas > 0 ? total_cobrado / facturas_pagadas : 0

    return {
      totalRevenue: total_cobrado,
      monthlyRevenue: ingresos_este_mes,
      total_cobrado,
      total_pendiente,
      total_vencido,
      facturas_pagadas,
      facturas_pendientes,
      facturas_vencidas,
      ingresos_este_mes,
      pendingInvoices: facturas_pendientes,
      paidInvoices: facturas_pagadas,
      overdueInvoices: facturas_vencidas,
      averageInvoiceValue,
    }
  }, { operation: 'getIncomeStats', table: 'invoices' })
}
