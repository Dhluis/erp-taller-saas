import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

// ============================================================
// GET: Obtener historial de una orden de trabajo
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseServiceClient()

    // Obtener organization_id del usuario
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id

    // Verificar que la orden existe y pertenece a la organización
    const { data: order, error: orderError } = await supabaseAdmin
      .from('work_orders')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      )
    }

    // Obtener historial ordenado por fecha descendente
    const { data: history, error: historyError } = await supabaseAdmin
      .from('work_order_history')
      .select('*')
      .eq('work_order_id', params.id)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (historyError) {
      console.error('❌ [API GET /work-orders/[id]/history] Error:', historyError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener historial' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: history || [],
    })
  } catch (error) {
    console.error('❌ [API GET /work-orders/[id]/history] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ============================================================
// POST: Registrar nueva entrada en el historial
// ============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseServiceClient()

    // Obtener perfil del usuario
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, full_name, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id

    // Verificar que la orden existe y pertenece a la organización
    const { data: order, error: orderError } = await supabaseAdmin
      .from('work_orders')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validar campos requeridos
    if (!body.action || !body.description) {
      return NextResponse.json(
        { success: false, error: 'Se requieren los campos action y description' },
        { status: 400 }
      )
    }

    // Validar tipo de acción
    const validActions = [
      'created', 'status_change', 'field_update', 'assignment',
      'vehicle_update', 'customer_update', 'inspection_update',
      'item_added', 'item_updated', 'item_removed',
      'note_added', 'document_uploaded', 'document_deleted', 'deleted'
    ]

    if (!validActions.includes(body.action)) {
      return NextResponse.json(
        { success: false, error: `Acción inválida: ${body.action}` },
        { status: 400 }
      )
    }

    // Obtener el user_id interno (no auth_user_id)
    const { data: internalUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    // Insertar entrada en historial
    const { data: historyEntry, error: insertError } = await supabaseAdmin
      .from('work_order_history')
      .insert({
        organization_id: organizationId,
        work_order_id: params.id,
        user_id: internalUser?.id || null,
        user_name: userProfile.full_name || user.email || 'Usuario',
        action: body.action,
        description: body.description,
        old_value: body.old_value || null,
        new_value: body.new_value || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ [API POST /work-orders/[id]/history] Error:', insertError)
      return NextResponse.json(
        { success: false, error: 'Error al registrar historial' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: historyEntry,
    })
  } catch (error) {
    console.error('❌ [API POST /work-orders/[id]/history] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
