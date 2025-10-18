import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * QUERIES PARA ITEMS DE FACTURAS
 * =====================================================
 * Gestión de items de facturas con cálculo automático
 * de totales (subtotal, descuentos, impuestos, total)
 */

/**
 * Obtener items de una factura
 */
export async function getInvoiceItems(invoiceId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('invoice_items')
      .select(`
        *,
        products (
          id,
          name,
          sku,
          price
        ),
        services (
          id,
          name,
          price
        )
      `)
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  }, { operation: 'getInvoiceItems', table: 'invoice_items' })
}

/**
 * Agregar item a factura
 */
export async function addInvoiceItem(invoiceId: string, itemData: {
  item_type: 'product' | 'service'
  product_id?: string
  service_id?: string
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number
  discount_amount?: number
  tax_percent?: number
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que la factura no esté pagada o cancelada
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      throw new Error('Factura no encontrada')
    }

    if (invoice.status === 'paid') {
      throw new Error('No se pueden agregar items a una factura pagada')
    }

    if (invoice.status === 'cancelled') {
      throw new Error('No se pueden agregar items a una factura cancelada')
    }

    // Calcular montos
    const subtotal = itemData.quantity * itemData.unit_price

    // Calcular descuento
    let discountAmount = itemData.discount_amount || 0
    if (itemData.discount_percent && itemData.discount_percent > 0) {
      discountAmount = subtotal * (itemData.discount_percent / 100)
    }

    const subtotalAfterDiscount = subtotal - discountAmount

    // Calcular impuestos
    const taxPercent = itemData.tax_percent || 0
    const taxAmount = subtotalAfterDiscount * (taxPercent / 100)

    const total = subtotalAfterDiscount + taxAmount

    // Insertar item
    const { data: newItem, error } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoiceId,
        item_type: itemData.item_type,
        product_id: itemData.product_id,
        service_id: itemData.service_id,
        description: itemData.description,
        quantity: itemData.quantity,
        unit_price: itemData.unit_price,
        discount_percent: itemData.discount_percent || 0,
        discount_amount: discountAmount,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        total: total
      })
      .select()
      .single()

    if (error) throw error

    // Recalcular totales de la factura
    await calculateInvoiceTotals(invoiceId)

    return newItem
  }, { operation: 'addInvoiceItem', table: 'invoice_items' })
}

/**
 * Actualizar item de factura
 */
export async function updateInvoiceItem(itemId: string, itemData: {
  description?: string
  quantity?: number
  unit_price?: number
  discount_percent?: number
  discount_amount?: number
  tax_percent?: number
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener el item actual para verificar la factura
    const { data: currentItem } = await supabase
      .from('invoice_items')
      .select('invoice_id, quantity, unit_price, discount_percent, discount_amount, tax_percent')
      .eq('id', itemId)
      .single()

    if (!currentItem) {
      throw new Error('Item no encontrado')
    }

    // Verificar estado de la factura
    const { data: invoice } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', currentItem.invoice_id)
      .single()

    if (invoice?.status === 'paid') {
      throw new Error('No se pueden editar items de una factura pagada')
    }

    if (invoice?.status === 'cancelled') {
      throw new Error('No se pueden editar items de una factura cancelada')
    }

    // Calcular nuevos montos
    const quantity = itemData.quantity ?? currentItem.quantity
    const unitPrice = itemData.unit_price ?? currentItem.unit_price
    const subtotal = quantity * unitPrice

    // Calcular descuento
    let discountAmount = itemData.discount_amount ?? currentItem.discount_amount
    const discountPercent = itemData.discount_percent ?? currentItem.discount_percent
    if (discountPercent && discountPercent > 0) {
      discountAmount = subtotal * (discountPercent / 100)
    }

    const subtotalAfterDiscount = subtotal - discountAmount

    // Calcular impuestos
    const taxPercent = itemData.tax_percent ?? currentItem.tax_percent
    const taxAmount = subtotalAfterDiscount * (taxPercent / 100)

    const total = subtotalAfterDiscount + taxAmount

    // Actualizar item
    const { data: updated, error } = await supabase
      .from('invoice_items')
      .update({
        ...itemData,
        discount_amount: discountAmount,
        tax_amount: taxAmount,
        total: total
      })
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    // Recalcular totales de la factura
    await calculateInvoiceTotals(currentItem.invoice_id)

    return updated
  }, { operation: 'updateInvoiceItem', table: 'invoice_items' })
}

/**
 * Eliminar item de factura
 */
export async function deleteInvoiceItem(itemId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener invoice_id antes de eliminar
    const { data: item } = await supabase
      .from('invoice_items')
      .select('invoice_id, invoices (status)')
      .eq('id', itemId)
      .single()

    if (!item) {
      throw new Error('Item no encontrado')
    }

    const invoice = item.invoices as any
    if (invoice?.status === 'paid') {
      throw new Error('No se pueden eliminar items de una factura pagada')
    }

    if (invoice?.status === 'cancelled') {
      throw new Error('No se pueden eliminar items de una factura cancelada')
    }

    const invoiceId = item.invoice_id

    // Eliminar item
    const { error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error

    // Recalcular totales
    await calculateInvoiceTotals(invoiceId)

    return { success: true }
  }, { operation: 'deleteInvoiceItem', table: 'invoice_items' })
}

/**
 * Calcular y actualizar totales de factura
 */
export async function calculateInvoiceTotals(invoiceId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener todos los items
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('quantity, unit_price, discount_amount, tax_amount, total')
      .eq('invoice_id', invoiceId)

    if (itemsError) throw itemsError

    // Si no hay items, establecer totales en 0
    if (!items || items.length === 0) {
      const { data: updated, error: updateError } = await supabase
        .from('invoices')
        .update({
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (updateError) throw updateError
      return {
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        total: 0,
        items_count: 0
      }
    }

    // Calcular totales
    let subtotal = 0
    let totalTax = 0
    let totalDiscount = 0
    let total = 0

    items.forEach(item => {
      const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0)
      subtotal += itemSubtotal
      totalDiscount += item.discount_amount || 0
      totalTax += item.tax_amount || 0
      total += item.total || 0
    })

    // Actualizar factura
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        subtotal: subtotal,
        tax_amount: totalTax,
        discount_amount: totalDiscount,
        total: total,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (updateError) throw updateError

    return {
      subtotal,
      tax_amount: totalTax,
      discount_amount: totalDiscount,
      total,
      items_count: items.length,
      invoice: updated
    }
  }, { operation: 'calculateInvoiceTotals', table: 'invoices' })
}


