import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

const QUOTATION_ITEM_SELECT_STATEMENT = `
  *,
  services (
    id,
    name,
    category,
    base_price
  ),
  products (
    id,
    name,
    code,
    stock_quantity,
    price
  )
`

/**
 * Obtener items de una cotización específica
 */
export async function getQuotationItemsByQuotationId(quotationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data: items, error } = await supabase
      .from('quotation_items')
      .select(QUOTATION_ITEM_SELECT_STATEMENT)
      .eq('quotation_id', quotationId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return items || []
  }, { operation: 'getQuotationItemsByQuotationId', table: 'quotation_items' })
}

/**
 * Obtener un item específico por ID
 */
export async function getQuotationItemById(itemId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const { data: item, error } = await supabase
      .from('quotation_items')
      .select(QUOTATION_ITEM_SELECT_STATEMENT)
      .eq('id', itemId)
      .single()

    if (error) throw error
    return item
  }, { operation: 'getQuotationItemById', table: 'quotation_items' })
}

/**
 * Agregar un item a una cotización
 */
export async function addQuotationItem(quotationId: string, itemData: {
  service_id?: string | null
  product_id?: string | null
  item_type: string
  description: string
  quantity: number
  unit_price: number
  discount_percent?: number | null
  discount_amount?: number | null
  tax_percent?: number | null
  notes?: string | null
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Verificar que la cotización existe
    const { data: quotation, error: quotationError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('id', quotationId)
      .single()

    if (quotationError || !quotation) {
      throw new Error('Cotización no encontrada')
    }

    // 2. No permitir agregar items a cotizaciones convertidas o canceladas
    if (quotation.status === 'converted' || quotation.status === 'cancelled') {
      throw new Error(`No se pueden agregar items a una cotización ${quotation.status}`)
    }

    // 3. Calcular subtotal, tax y total
    const itemSubtotal = itemData.quantity * itemData.unit_price
    const itemDiscount = itemData.discount_percent 
      ? itemSubtotal * (itemData.discount_percent / 100)
      : (itemData.discount_amount || 0)
    const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount
    const itemTax = itemData.tax_percent
      ? itemSubtotalAfterDiscount * (itemData.tax_percent / 100)
      : 0
    const itemTotal = itemSubtotalAfterDiscount + itemTax

    // 4. Insertar el item
    const { data: newItem, error: createError } = await supabase
      .from('quotation_items')
      .insert({
        quotation_id: quotationId,
        service_id: itemData.service_id,
        product_id: itemData.product_id,
        item_type: itemData.item_type,
        description: itemData.description,
        quantity: itemData.quantity,
        unit_price: itemData.unit_price,
        discount_percent: itemData.discount_percent,
        discount_amount: itemDiscount,
        tax_percent: itemData.tax_percent,
        subtotal: itemSubtotal,
        tax_amount: itemTax,
        total: itemTotal,
        notes: itemData.notes
      })
      .select(QUOTATION_ITEM_SELECT_STATEMENT)
      .single()

    if (createError) throw createError

    // 5. Recalcular totales de la cotización
    await calculateQuotationTotals(quotationId)

    return newItem
  }, { operation: 'addQuotationItem', table: 'quotation_items' })
}

/**
 * Actualizar un item de cotización
 */
export async function updateQuotationItem(itemId: string, itemData: {
  description?: string
  quantity?: number
  unit_price?: number
  discount_percent?: number | null
  discount_amount?: number | null
  tax_percent?: number | null
  notes?: string | null
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Obtener item existente
    const { data: existingItem, error: fetchError } = await supabase
      .from('quotation_items')
      .select('*, quotations!inner(status)')
      .eq('id', itemId)
      .single()

    if (fetchError || !existingItem) {
      throw new Error('Item de cotización no encontrado')
    }

    // 2. No permitir actualizar items de cotizaciones convertidas o canceladas
    const quotationStatus = (existingItem.quotations as any)?.status
    if (quotationStatus === 'converted' || quotationStatus === 'cancelled') {
      throw new Error(`No se pueden actualizar items de una cotización ${quotationStatus}`)
    }

    // 3. Calcular nuevos totales
    const quantity = itemData.quantity !== undefined ? itemData.quantity : existingItem.quantity
    const unitPrice = itemData.unit_price !== undefined ? itemData.unit_price : existingItem.unit_price
    const discountPercent = itemData.discount_percent !== undefined ? itemData.discount_percent : existingItem.discount_percent

    const itemSubtotal = quantity * unitPrice
    const itemDiscount = discountPercent 
      ? itemSubtotal * (discountPercent / 100)
      : (itemData.discount_amount !== undefined ? itemData.discount_amount : existingItem.discount_amount) || 0
    const itemSubtotalAfterDiscount = itemSubtotal - itemDiscount
    const taxPercent = itemData.tax_percent !== undefined ? itemData.tax_percent : existingItem.tax_percent
    const itemTax = taxPercent ? itemSubtotalAfterDiscount * (taxPercent / 100) : 0
    const itemTotal = itemSubtotalAfterDiscount + itemTax

    // 4. Actualizar el item
    const { data: updatedItem, error: updateError } = await supabase
      .from('quotation_items')
      .update({
        ...itemData,
        subtotal: itemSubtotal,
        discount_amount: itemDiscount,
        tax_amount: itemTax,
        total: itemTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId)
      .select(QUOTATION_ITEM_SELECT_STATEMENT)
      .single()

    if (updateError) throw updateError

    // 5. Recalcular totales de la cotización
    await calculateQuotationTotals(existingItem.quotation_id)

    return updatedItem
  }, { operation: 'updateQuotationItem', table: 'quotation_items' })
}

/**
 * Eliminar un item de cotización
 */
export async function deleteQuotationItem(itemId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Obtener item existente
    const { data: existingItem, error: fetchError } = await supabase
      .from('quotation_items')
      .select('quotation_id, quotations!inner(status)')
      .eq('id', itemId)
      .single()

    if (fetchError || !existingItem) {
      throw new Error('Item de cotización no encontrado')
    }

    // 2. No permitir eliminar items de cotizaciones convertidas o canceladas
    const quotationStatus = (existingItem.quotations as any)?.status
    if (quotationStatus === 'converted' || quotationStatus === 'cancelled') {
      throw new Error(`No se pueden eliminar items de una cotización ${quotationStatus}`)
    }

    // 3. Eliminar el item
    const { error: deleteError } = await supabase
      .from('quotation_items')
      .delete()
      .eq('id', itemId)

    if (deleteError) throw deleteError

    // 4. Recalcular totales de la cotización
    await calculateQuotationTotals(existingItem.quotation_id)

    return { success: true }
  }, { operation: 'deleteQuotationItem', table: 'quotation_items' })
}

/**
 * Recalcular totales de una cotización
 */
export async function calculateQuotationTotals(quotationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener todos los items de la cotización
    const { data: items, error: itemsError } = await supabase
      .from('quotation_items')
      .select('quantity, unit_price, discount_percent, discount_amount, tax_percent, subtotal, tax_amount, total')
      .eq('quotation_id', quotationId)

    if (itemsError) throw itemsError

    if (!items || items.length === 0) {
      // Si no hay items, establecer totales en 0
      const { error: updateError } = await supabase
        .from('quotations')
        .update({
          subtotal: 0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', quotationId)

      if (updateError) throw updateError
      return { subtotal: 0, tax_amount: 0, discount_amount: 0, total_amount: 0 }
    }

    // Calcular totales detallados
    let subtotal = 0
    let totalDiscountAmount = 0
    let totalTaxAmount = 0
    let totalAmount = 0

    items.forEach(item => {
      const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0)
      
      let itemDiscountAmount = 0
      if (item.discount_percent && item.discount_percent > 0) {
        itemDiscountAmount = itemSubtotal * (item.discount_percent / 100)
      } else if (item.discount_amount && item.discount_amount > 0) {
        itemDiscountAmount = item.discount_amount
      }
      
      const itemSubtotalAfterDiscount = itemSubtotal - itemDiscountAmount
      
      let itemTaxAmount = 0
      if (item.tax_percent && item.tax_percent > 0) {
        itemTaxAmount = itemSubtotalAfterDiscount * (item.tax_percent / 100)
      }
      
      const itemTotal = itemSubtotalAfterDiscount + itemTaxAmount
      
      subtotal += itemSubtotal
      totalDiscountAmount += itemDiscountAmount
      totalTaxAmount += itemTaxAmount
      totalAmount += itemTotal
    })

    // Actualizar la cotización con los nuevos totales
    const { error: updateError } = await supabase
      .from('quotations')
      .update({
        subtotal,
        tax_amount: totalTaxAmount,
        discount_amount: totalDiscountAmount,
        total_amount: totalAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)

    if (updateError) throw updateError

    return {
      subtotal,
      tax_amount: totalTaxAmount,
      discount_amount: totalDiscountAmount,
      total_amount: totalAmount,
      items_count: items.length
    }
  }, { operation: 'calculateQuotationTotals', table: 'quotations' })
}


