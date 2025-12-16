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
    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single();
    
    if (userError || !currentUser || !currentUser.role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario no encontrado',
        },
        { status: 404 }
      );
    }
    
    // ✅ VALIDACIÓN: Si es mecánico, verificar que puede acceder a esta orden
    const currentUserRole = currentUser.role as UserRole;
    if (currentUserRole === 'MECANICO') {
      const canAccess = await canAccessWorkOrder(
        tenantContext.userId,
        params.id,
        currentUserRole,
        supabase
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
    
    const order = await getWorkOrderById(params.id);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Orden de trabajo no encontrada',
        },
        { status: 404 }
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

    const order = await updateWorkOrder(params.id, body);

    return NextResponse.json({
      success: true,
      data: order,
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
    
    // ✅ VALIDACIÓN: Si es asesor, solo puede eliminar órdenes en 'reception' o 'cancelled'
    if (currentUserRole === 'ASESOR') {
      const order = await getWorkOrderById(params.id);
      
      if (!order) {
        return NextResponse.json(
          {
            success: false,
            error: 'Orden de trabajo no encontrada',
          },
          { status: 404 }
        );
      }
      
      const allowedStatuses = ['reception', 'cancelled'];
      if (!allowedStatuses.includes(order.status)) {
        return NextResponse.json(
          {
            success: false,
            error: `No se puede eliminar una orden en estado "${order.status}". Solo se pueden eliminar órdenes en estado "reception" o "cancelled".`,
          },
          { status: 400 }
        );
      }
    }
    
    await deleteWorkOrder(params.id);

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