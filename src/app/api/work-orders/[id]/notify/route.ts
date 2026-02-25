import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { notifyOrderStatus } from '@/lib/orders/notifications'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await getTenantContext(request)

    if (!organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const orderId = params.id
    if (!orderId) {
      return NextResponse.json({ success: false, error: 'ID de orden requerido' }, { status: 400 })
    }

    // Verificar que la orden pertenece a esta organización
    const supabase = getSupabaseServiceClient()
    const { data: order, error } = await supabase
      .from('work_orders')
      .select('id')
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !order) {
      return NextResponse.json({ success: false, error: 'Orden no encontrada' }, { status: 404 })
    }

    const result = await notifyOrderStatus(organizationId, orderId, 'manual')

    return NextResponse.json({
      success: result.sent,
      channels: result.channels,
      errors: result.errors,
      message: result.sent
        ? `Notificación enviada por: ${result.channels.join(', ')}`
        : 'No se pudo enviar la notificación',
    })
  } catch (err: any) {
    console.error('[POST /api/work-orders/[id]/notify]', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
