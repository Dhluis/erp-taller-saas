import type { SupabaseClient } from '@supabase/supabase-js'

export interface LowStockAlert {
  name: string
  current_stock: number
  min_stock?: number
}

/**
 * Descuenta inventario al marcar la orden como completada.
 * Solo actúa sobre work_order_services con inventory_deducted = false.
 * NO bloquea si hay stock insuficiente; solo descuenta lo posible y marca.
 */
export async function deductInventoryOnOrderComplete(
  supabaseAdmin: SupabaseClient,
  orderId: string,
  organizationId: string
): Promise<{ lowStockAlerts: LowStockAlert[] }> {
  const lowStockAlerts: LowStockAlert[] = []

  const { data: services, error: fetchErr } = await supabaseAdmin
    .from('work_order_services')
    .select('id, line_type, quantity, service_package_id, inventory_item_id')
    .eq('work_order_id', orderId)
    .eq('organization_id', organizationId)
    .eq('inventory_deducted', false)

  if (fetchErr || !services?.length) {
    return { lowStockAlerts }
  }

  for (const svc of services) {
    if (svc.line_type === 'package' && svc.service_package_id) {
      const { data: items } = await supabaseAdmin
        .from('service_package_items')
        .select('inventory_item_id, quantity')
        .eq('service_package_id', svc.service_package_id)
        .eq('organization_id', organizationId)

      if (items) {
        const qtyMultiplier = Number(svc.quantity) || 1
        for (const it of items) {
          const deductQty = (Number(it.quantity) || 0) * qtyMultiplier
          if (deductQty <= 0) continue
          const { data: inv } = await supabaseAdmin
            .from('inventory')
            .select('id, name, current_stock, min_stock')
            .eq('id', it.inventory_item_id)
            .eq('organization_id', organizationId)
            .single()
          if (!inv) continue
          const current = Number(inv.current_stock ?? 0)
          const newStock = Math.max(0, current - deductQty)
          await supabaseAdmin
            .from('inventory')
            .update({
              current_stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', it.inventory_item_id)
            .eq('organization_id', organizationId)
          try {
            const { error: movErr } = await supabaseAdmin.from('inventory_movements').insert({
              organization_id: organizationId,
              inventory_id: it.inventory_item_id,
              movement_type: 'exit',
              quantity: Math.round(deductQty),
              previous_stock: current,
              new_stock: newStock,
              reference_type: 'work_order',
              reference_id: orderId,
              notes: 'Descuento automático al completar orden'
            })
            if (movErr) console.warn('[deduct-inventory] inventory_movements insert:', movErr.message)
          } catch (e) {
            console.warn('[deduct-inventory] inventory_movements insert:', e)
          }
          const minStock = inv.min_stock != null ? Number(inv.min_stock) : undefined
          if (minStock != null && newStock <= minStock) {
            lowStockAlerts.push({
              name: inv.name || 'Producto',
              current_stock: newStock,
              min_stock: minStock
            })
          }
        }
      }
    } else if (svc.line_type === 'loose_product' && svc.inventory_item_id) {
      const qty = Math.max(0, Math.floor(Number(svc.quantity) || 0))
      if (qty <= 0) continue
      const { data: inv } = await supabaseAdmin
        .from('inventory')
        .select('id, name, current_stock, min_stock')
        .eq('id', svc.inventory_item_id)
        .eq('organization_id', organizationId)
        .single()
      if (!inv) continue
      const current = Number(inv.current_stock ?? 0)
      const newStock = Math.max(0, current - qty)
      await supabaseAdmin
        .from('inventory')
        .update({
          current_stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', svc.inventory_item_id)
        .eq('organization_id', organizationId)
      try {
        const { error: movErr } = await supabaseAdmin.from('inventory_movements').insert({
          organization_id: organizationId,
          inventory_id: svc.inventory_item_id,
          movement_type: 'exit',
          quantity: qty,
          previous_stock: current,
          new_stock: newStock,
          reference_type: 'work_order',
          reference_id: orderId,
          notes: 'Descuento automático al completar orden'
        })
        if (movErr) console.warn('[deduct-inventory] inventory_movements insert:', movErr.message)
      } catch (e) {
        console.warn('[deduct-inventory] inventory_movements insert:', e)
      }
      const minStock = inv.min_stock != null ? Number(inv.min_stock) : undefined
      if (minStock != null && newStock <= minStock) {
        lowStockAlerts.push({
          name: inv.name || 'Producto',
          current_stock: newStock,
          min_stock: minStock
        })
      }
    }
  }

  await supabaseAdmin
    .from('work_order_services')
    .update({
      inventory_deducted: true,
      inventory_deducted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('work_order_id', orderId)
    .eq('organization_id', organizationId)
    .eq('inventory_deducted', false)

  return { lowStockAlerts }
}
