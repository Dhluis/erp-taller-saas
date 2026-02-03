/**
 * API Route: Receive Purchase Order
 * POST /api/purchase-orders/[id]/receive - Recibir mercancía de orden de compra
 * 
 * CRÍTICO:
 * - Usa función SQL increment_product_stock() para actualizar stock de forma segura
 * - Crea inventory_movements para tracking
 * - Actualiza quantity_received en purchase_order_items
 * - El trigger update_purchase_order_status() actualiza el status automáticamente
 */

import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema de validación
const receiveOrderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid('ID de item debe ser un UUID válido'),
      product_id: z.string().uuid('ID de producto debe ser un UUID válido'),
      quantity_received: z.number().int().positive('La cantidad recibida debe ser mayor a 0'),
      notes: z.string().optional()
    })
  ).min(1, 'Debe incluir al menos un item para recibir'),
  notes: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Usar transacción manual con try-catch para rollback
  const supabaseAdmin = getSupabaseServiceClient()
  
  try {
    // 1. Autenticación y obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId || !tenantContext.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: organización o usuario no encontrado'
        },
        { status: 403 }
      )
    }

    const { organizationId, userId, workshopId } = tenantContext
    const orderId = params.id

    // 2. Validar body con Zod
    const body = await request.json()
    const validation = receiveOrderSchema.safeParse(body)

    if (!validation.success) {
      const { message } = validation.error.errors[0] || { message: 'Datos inválidos' }
      return NextResponse.json(
        {
          success: false,
          error: message,
          details: validation.error.errors
        },
        { status: 400 }
      )
    }

    const { items, notes: generalNotes } = validation.data

    // 3. Verificar que la orden existe y pertenece a la organización
    const { data: order, error: orderError } = await supabaseAdmin
      .from('purchase_orders')
      .select('id, order_number, status, organization_id')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de compra no encontrada o no pertenece a tu organización'
        },
        { status: 404 }
      )
    }

    // 4. Verificar que el status permite recepción
    if (order.status === 'cancelled') {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede recibir mercancía de una orden cancelada'
        },
        { status: 400 }
      )
    }

    if (order.status === 'received') {
      return NextResponse.json(
        {
          success: false,
          error: 'Esta orden ya fue completamente recibida'
        },
        { status: 400 }
      )
    }

    // 5. Verificar que todos los items pertenecen a la orden y organización
    const itemIds = items.map(item => item.id)
    const { data: orderItems, error: itemsError } = await supabaseAdmin
      .from('purchase_order_items')
      .select('id, product_id, quantity_ordered, quantity_received, unit_cost, organization_id')
      .eq('purchase_order_id', orderId)
      .eq('organization_id', organizationId)
      .in('id', itemIds)

    if (itemsError || !orderItems || orderItems.length !== items.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Uno o más items no pertenecen a esta orden o no existen'
        },
        { status: 400 }
      )
    }

    // Crear mapa de items para validación rápida
    const itemsMap = new Map(orderItems.map(item => [item.id, item]))

    // 6. Validar que los product_id coinciden y que los productos existen
    for (const item of items) {
      const orderItem = itemsMap.get(item.id)
      if (!orderItem) {
        return NextResponse.json(
          {
            success: false,
            error: `Item ${item.id} no encontrado en la orden`
          },
          { status: 400 }
        )
      }

      if (orderItem.product_id !== item.product_id) {
        return NextResponse.json(
          {
            success: false,
            error: `El product_id del item ${item.id} no coincide con el de la orden`
          },
          { status: 400 }
        )
      }

      // Validar que no se exceda la cantidad ordenada
      const newQuantityReceived = orderItem.quantity_received + item.quantity_received
      if (newQuantityReceived > orderItem.quantity_ordered) {
        return NextResponse.json(
          {
            success: false,
            error: `La cantidad recibida excede la cantidad ordenada para el item ${item.id}. Ordenado: ${orderItem.quantity_ordered}, Ya recibido: ${orderItem.quantity_received}, Intenta recibir: ${item.quantity_received}`
          },
          { status: 400 }
        )
      }

      // Verificar que el producto existe en inventory
      const { data: product, error: productError } = await supabaseAdmin
        .from('inventory')
        .select('id')
        .eq('id', item.product_id)
        .eq('organization_id', organizationId)
        .single()

      if (productError || !product) {
        return NextResponse.json(
          {
            success: false,
            error: `Producto ${item.product_id} no encontrado en inventario`
          },
          { status: 404 }
        )
      }
    }

    // 7. Ejecutar recepción en transacción (operaciones secuenciales con rollback manual)
    const receivedItems: Array<{ id: string; quantity_received: number }> = []
    const errors: string[] = []

    for (const item of items) {
      try {
        const orderItem = itemsMap.get(item.id)!

        // 7a. Obtener previous_stock ANTES de actualizar (CRÍTICO)
        const { data: currentProduct, error: productFetchError } = await supabaseAdmin
          .from('inventory')
          .select('current_stock')
          .eq('id', item.product_id)
          .eq('organization_id', organizationId)
          .single()

        if (productFetchError || !currentProduct) {
          errors.push(`Error obteniendo stock del producto ${item.product_id}: ${productFetchError?.message || 'Producto no encontrado'}`)
          continue
        }

        const previousStock = currentProduct.current_stock || 0
        const newStock = previousStock + item.quantity_received

        // 7b. Calcular costos si están disponibles
        const unitCost = orderItem.unit_cost || null
        const totalCost = unitCost ? (unitCost * item.quantity_received) : null

        // 7c. Actualizar quantity_received en purchase_order_items
        const { error: updateError } = await supabaseAdmin
          .from('purchase_order_items')
          .update({
            quantity_received: orderItem.quantity_received + item.quantity_received,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
          .eq('organization_id', organizationId)

        if (updateError) {
          errors.push(`Error actualizando item ${item.id}: ${updateError.message}`)
          continue
        }

        // 7d. Llamar función SQL para incrementar stock de forma atómica
        const { error: stockError } = await supabaseAdmin.rpc('increment_product_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity_received
        })

        if (stockError) {
          // Rollback: revertir quantity_received
          await supabaseAdmin
            .from('purchase_order_items')
            .update({
              quantity_received: orderItem.quantity_received,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
            .eq('organization_id', organizationId)

          errors.push(`Error actualizando stock para producto ${item.product_id}: ${stockError.message}`)
          continue
        }

        // 7e. Crear inventory_movement para tracking con estructura EXACTA
        const movementData: any = {
          organization_id: organizationId,
          workshop_id: workshopId || null, // ✅ Multi-tenant adicional (opcional)
          product_id: item.product_id,
          movement_type: 'entrada', // ✅ Tipo de movimiento (siempre 'entrada')
          quantity: item.quantity_received,
          unit_cost: unitCost, // ✅ Costo unitario (opcional)
          total_cost: totalCost, // ✅ Costo total (cantidad × unit_cost)
          previous_stock: previousStock, // ✅ Stock antes del movimiento
          new_stock: newStock, // ✅ Stock después del movimiento
          notes: item.notes || generalNotes || `Recepción de Orden de Compra #${order.order_number}`, // ✅ Descripción
          reference_id: orderId, // ✅ ID de la purchase_order
          reference_type: 'purchase_order', // ✅ Tipo de referencia (siempre 'purchase_order')
          created_by: userId // ✅ Usuario que recibió
        }

        const { error: movementError } = await supabaseAdmin
          .from('inventory_movements')
          .insert(movementData)

        if (movementError) {
          // Rollback: revertir stock y quantity_received
          await supabaseAdmin.rpc('increment_product_stock', {
            p_product_id: item.product_id,
            p_quantity: -item.quantity_received // Revertir
          })
          await supabaseAdmin
            .from('purchase_order_items')
            .update({
              quantity_received: orderItem.quantity_received,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.id)
            .eq('organization_id', organizationId)

          errors.push(`Error creando movimiento de inventario para producto ${item.product_id}: ${movementError.message}`)
          continue
        }

        receivedItems.push({
          id: item.id,
          quantity_received: item.quantity_received
        })

      } catch (itemError: any) {
        errors.push(`Error procesando item ${item.id}: ${itemError.message}`)
      }
    }

    // 8. Si hubo errores, retornar error parcial
    if (errors.length > 0 && receivedItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Error al recibir mercancía',
          details: errors
        },
        { status: 500 }
      )
    }

    if (errors.length > 0 && receivedItems.length > 0) {
      // Recepción parcial - algunos items se recibieron, otros no
      return NextResponse.json(
        {
          success: true,
          message: 'Mercancía recibida parcialmente',
          data: {
            items_received: receivedItems.length,
            total_items: items.length,
            errors: errors
          },
          warning: 'Algunos items no pudieron ser recibidos'
        },
        { status: 207 } // 207 Multi-Status
      )
    }

    // 9. Obtener estado actualizado de la orden (el trigger ya actualizó el status)
    const { data: updatedOrder } = await supabaseAdmin
      .from('purchase_orders')
      .select('status, received_date')
      .eq('id', orderId)
      .single()

    // 10. Si la orden está completamente recibida, actualizar received_by y received_date
    if (updatedOrder?.status === 'received' && !updatedOrder.received_date) {
      await supabaseAdmin
        .from('purchase_orders')
        .update({
          received_by: userId,
          received_date: new Date().toISOString().split('T')[0] // Solo fecha
        })
        .eq('id', orderId)
        .eq('organization_id', organizationId)
    }

    // 11. Retornar éxito
    return NextResponse.json({
      success: true,
      message: 'Mercancía recibida correctamente',
      data: {
        items_received: receivedItems.length,
        order_status: updatedOrder?.status || order.status,
        order_id: orderId,
        order_number: order.order_number
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error('Error in POST /api/purchase-orders/[id]/receive:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al recibir mercancía'
      },
      { status: 500 }
    )
  }
}
