import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
} from '@/lib/database/queries/work-orders';
import { hasPermission, canAccessWorkOrder, UserRole } from '@/lib/auth/permissions';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

// GET: Obtener una orden por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [API GET /work-orders/[id]] Error de autenticación:', authError)
      return NextResponse.json(
        { error: 'No autorizado' },
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
      console.error('❌ [API GET /work-orders/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    const currentUserRole = userProfile.role as UserRole;
    console.log('🔍 [API GET /work-orders/[id]] Organization ID:', organizationId);
    
    // ✅ VALIDACIÓN: Si es mecánico, verificar que puede acceder a esta orden
    if (currentUserRole === 'MECANICO') {
      const canAccess = await canAccessWorkOrder(
        user.id,
        params.id,
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
    // Esto evita problemas con RLS y garantiza que solo se obtengan órdenes de la organización correcta
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
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null) // ✅ SOFT DELETE: Solo mostrar órdenes activas
      .single();

    if (orderError || !order) {
      console.error('❌ [API GET /work-orders/[id]] Error obteniendo orden:', orderError);
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de trabajo no encontrada o no autorizada',
          details: orderError?.message
        },
        { status: orderError ? 500 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Error fetching work order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener orden de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar una orden
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [API PUT /work-orders/[id]] Error de autenticación:', authError)
      return NextResponse.json(
        { error: 'No autorizado' },
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
      console.error('❌ [API PUT /work-orders/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;
    const currentUserRole = userProfile.role as UserRole;
    
    // ✅ VALIDACIÓN: Si es mecánico, verificar que puede acceder a esta orden
    if (currentUserRole === 'MECANICO') {
      const canAccess = await canAccessWorkOrder(
        user.id,
        params.id,
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
    
    const body = await request.json();

    // Validaciones opcionales
    if (body.description !== undefined && body.description.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'La descripción debe tener al menos 10 caracteres',
        },
        { status: 400 }
      );
    }

    if (body.estimated_completion) {
      const estimatedDate = new Date(body.estimated_completion);
      const now = new Date();
      
      if (estimatedDate < now) {
        return NextResponse.json(
          {
            success: false,
            error: 'La fecha estimada no puede ser en el pasado',
          },
          { status: 400 }
        );
      }
    }

    if (body.discount !== undefined && body.discount < 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'El descuento no puede ser negativo',
        },
        { status: 400 }
      );
    }

    // ✅ Actualizar directamente usando supabaseAdmin (no usar updateWorkOrder que usa funciones del cliente)
    // Primero validar que la orden pertenezca a la organización del usuario
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('work_orders')
      .select('id, organization_id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null) // ✅ SOFT DELETE: Solo actualizar órdenes activas
      .single();

    if (fetchError || !existingOrder) {
      console.error('❌ [API PUT /work-orders/[id]] Orden no encontrada o no autorizada:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Orden no encontrada o no autorizada',
        },
        { status: 404 }
      );
    }

    // Actualizar la orden
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('work_orders')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('organization_id', organizationId) // ✅ Validar multi-tenancy
      .is('deleted_at', null) // ✅ SOFT DELETE: Solo actualizar órdenes activas
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
      .single();

    if (updateError) {
      console.error('❌ [API PUT /work-orders/[id]] Error actualizando orden:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: updateError.message || 'Error al actualizar orden de trabajo',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Orden de trabajo actualizada exitosamente',
    });
  } catch (error) {
    console.error('Error updating work order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al actualizar orden de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una orden
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [API DELETE /work-orders/[id]] Error de autenticación:', authError)
      return NextResponse.json(
        { error: 'No autorizado' },
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
      console.error('❌ [API DELETE /work-orders/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
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
    
    // ✅ VALIDACIÓN: Verificar que la orden existe y pertenece a la organización
    const { data: existingOrder, error: orderError } = await supabaseAdmin
      .from('work_orders')
      .select('id, status, organization_id, deleted_at')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null) // Solo verificar órdenes activas
      .single();
    
    if (orderError || !existingOrder) {
      console.error('❌ [API DELETE /work-orders/[id]] Orden no encontrada:', orderError);
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de trabajo no encontrada o ya eliminada',
        },
        { status: 404 }
      );
    }
    
    // ✅ VALIDACIÓN: Si es asesor, solo puede eliminar órdenes en 'reception' o 'cancelled'
    if (currentUserRole === 'ASESOR') {
      const allowedStatuses = ['reception', 'cancelled'];
      if (!allowedStatuses.includes(existingOrder.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `No se puede eliminar una orden en estado "${existingOrder.status}". Solo se pueden eliminar órdenes en estado "reception" o "cancelled".`,
          },
          { status: 400 }
        );
      }
    }
    
    // ✅ SOFT DELETE: Usar Service Role Client para hacer soft delete directamente
    const { error: deleteError } = await supabaseAdmin
      .from('work_orders')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .is('deleted_at', null); // Solo eliminar si no está ya eliminada
    
    if (deleteError) {
      console.error('❌ [API DELETE /work-orders/[id]] Error al eliminar orden:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo eliminar la orden',
          details: deleteError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Orden de trabajo eliminada exitosamente',
    });
  } catch (error) {
    console.error('Error deleting work order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al eliminar orden de trabajo',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}