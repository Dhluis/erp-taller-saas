import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient, createClientFromRequest } from '@/lib/supabase/server'
import { updateWorkOrder, updateWorkOrderStatus, deleteWorkOrder } from '@/lib/database/queries/work-orders'
import { hasPermission, canAccessWorkOrder, UserRole } from '@/lib/auth/permissions'
import type { WorkOrder } from '@/types/orders'

// GET /api/orders/[id] - Obtener detalles de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🔄 GET /api/orders/[id] - Iniciando...', id)
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [GET /api/orders/[id]] Error de autenticación:', authError)
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener organization_id y rol del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [GET /api/orders/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    const currentUserRole = userProfile.role as UserRole;
    console.log('🔍 [GET /api/orders/[id]] Organization ID:', organizationId);
    
    // ✅ VALIDACIÓN: Si es mecánico, verificar que puede acceder a esta orden
    if (currentUserRole === 'MECANICO') {
      const canAccess = await canAccessWorkOrder(
        user.id,
        id,
        currentUserRole,
        supabaseAdmin
      );
      
      if (!canAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'No tienes permisos para acceder a esta orden. Solo puedes ver órdenes asignadas a ti.',
          },
          { status: 403 }
        );
      }
    }
    
    // ✅ Obtener orden directamente usando supabaseAdmin (bypass RLS)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('work_orders')
      .select(`
        *,
        customer:customers(
          id,
          name,
          email,
          phone
        ),
        vehicle:vehicles(
          id,
          brand,
          model,
          year,
          license_plate
        ),
        assigned_user:users!work_orders_assigned_to_fkey(
          id,
          full_name,
          role,
          email
        ),
        order_items(*)
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single();

    if (orderError || !order) {
      console.error('❌ [GET /api/orders/[id]] Error obteniendo orden:', orderError);
      if (orderError?.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Orden no encontrada' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Orden no encontrada o no autorizada',
          details: orderError?.message
        },
        { status: orderError ? 500 : 404 }
      );
    }

    return NextResponse.json({ success: true, data: order })
  } catch (error: any) {
    console.error('❌ Error in GET /api/orders/[id]:', error)
    console.error('❌ Error message:', error?.message)
    console.error('❌ Error stack:', error?.stack)
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

// PATCH /api/orders/[id] - Actualizar una orden
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🔄 PATCH /api/orders/[id] - Iniciando...', id)
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PATCH /api/orders/[id]] Error de autenticación:', authError)
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener organization_id y rol del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [PATCH /api/orders/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    const currentUserRole = userProfile.role as UserRole;
    
    // ✅ VALIDACIÓN: Si es mecánico, verificar que puede acceder a esta orden
    if (currentUserRole === 'MECANICO') {
      const canAccess = await canAccessWorkOrder(
        user.id,
        id,
        currentUserRole,
        supabaseAdmin
      );
      
      if (!canAccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'No tienes permisos para editar esta orden. Solo puedes editar órdenes asignadas a ti.',
          },
          { status: 403 }
        );
      }
    }

    const body = await request.json()
    console.log('🔄 [PATCH /api/orders/[id]] Actualizando orden:', id)
    console.log('🔄 [PATCH /api/orders/[id]] Datos recibidos:', body)
    console.log('🔄 [PATCH /api/orders/[id]] Organization ID:', organizationId)
    
    // Si solo se está actualizando el status, usar función específica
    if (body.status && Object.keys(body).length === 1) {
      const order = await updateWorkOrderStatus(id, body.status)
      return NextResponse.json({ success: true, data: order })
    }
    
    // Actualización completa
    const order = await updateWorkOrder(id, body)
    console.log('✅ [PATCH /api/orders/[id]] Orden actualizada exitosamente')
    return NextResponse.json({ success: true, data: order })
  } catch (error: any) {
    console.error('❌ [PATCH /api/orders/[id]] Error:', error)
    console.error('❌ [PATCH /api/orders/[id]] Error message:', error?.message)
    console.error('❌ [PATCH /api/orders/[id]] Error stack:', error?.stack)
    
    // Si es error de autenticación, retornar 401
    if (error?.message?.includes('no autenticado') || error?.message?.includes('autenticado')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuario no autenticado' 
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/orders/[id] - Eliminar una orden
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log('🔄 DELETE /api/orders/[id] - Iniciando...', id)
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [DELETE /api/orders/[id]] Error de autenticación:', authError)
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener organization_id y rol del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [DELETE /api/orders/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { success: false, error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    const currentUserRole = userProfile.role as UserRole;
    
    // ✅ VALIDACIÓN: Verificar permisos para eliminar
    if (!hasPermission(currentUserRole, 'work_orders', 'delete')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permisos para eliminar órdenes de trabajo',
        },
        { status: 403 }
      );
    }

    await deleteWorkOrder(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('❌ Error in DELETE /api/orders/[id]:', error)
    console.error('❌ Error message:', error?.message)
    console.error('❌ Error stack:', error?.stack)
    
    // Si es error de autenticación, retornar 401
    if (error?.message?.includes('no autenticado') || error?.message?.includes('autenticado')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Usuario no autenticado' 
        },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

