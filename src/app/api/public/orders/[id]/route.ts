import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const supabase = getSupabaseServiceClient()

    // Obtener la orden de trabajo con datos limitados para el cliente público
    const { data: order, error: orderError } = await supabase
      .from('work_orders')
      .select(`
        id,
        order_number,
        status,
        description,
        estimated_completion,
        created_at,
        updated_at,
        customer:customers(
          first_name,
          last_name
        ),
        vehicle:vehicles(
          brand,
          model,
          year,
          color
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Obtener notas marcadas como 'customer' o 'general'
    // Como las notas están en un JSONB array en work_orders, filtramos en JS
    const { data: notesData } = await supabase
      .from('work_orders')
      .select('notes')
      .eq('id', id)
      .single()

    const publicNotes = (notesData?.notes || [])
      .filter((n: any) => n.category === 'customer' || n.category === 'general')
      .map((n: any) => ({
        id: n.id,
        text: n.text,
        createdAt: n.createdAt,
        category: n.category
      }))

    // Simular un historial de estados (podríamos derivarlo de las notas o una tabla de auditoría si existiera)
    // Por ahora enviamos la orden y sus notas públicas
    const publicOrder = {
      ...order,
      customer_name: `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
      notes: publicNotes
    }

    return NextResponse.json({ success: true, data: publicOrder })
  } catch (error: any) {
    console.error('❌ Error in GET /api/public/orders/[id]:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
