import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
} from '@/lib/database/queries/work-orders';
import { getOrganizationId } from '@/lib/auth/organization-server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { hasPermission, canAccessWorkOrder, UserRole } from '@/lib/auth/permissions';
import { createClient } from '@/lib/supabase/server';

// GET: Obtener una orden por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ Verificar que el organizationId esté disponible antes de obtener la orden
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }
    
    const organizationId = tenantContext.organizationId;
    console.log('🔍 [API GET /work-orders/[id]] Organization ID:', organizationId);
    
    // ✅ VALIDACIÓN: Obtener rol del usuario actual
    const supabase = await createClient();
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', tenantContext.userId)
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
    if (currentUserRole === 'mechanic') {
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
    // ✅ VALIDACIÓN: Obtener contexto y rol del usuario
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }
    
    const supabase = await createClient();
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', tenantContext.userId)
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
    if (currentUserRole === 'mechanic') {
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
    // ✅ VALIDACIÓN: Obtener contexto y rol del usuario
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: No se pudo obtener la organización',
        },
        { status: 403 }
      );
    }
    
    const supabase = await createClient();
    const { data: currentUser, error: userError } = await (supabase as any)
      .from('users')
      .select('role')
      .eq('auth_user_id', tenantContext.userId)
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
    
    // ✅ VALIDACIÓN: Verificar permisos para eliminar
    const currentUserRole = currentUser.role as UserRole;
    if (!hasPermission(currentUserRole, 'work_orders', 'delete')) {
      return NextResponse.json(
        {
          success: false,
          error: 'No tienes permisos para eliminar órdenes de trabajo',
        },
        { status: 403 }
      );
    }
    
    // ✅ VALIDACIÓN: Si es advisor, solo puede eliminar órdenes en 'reception' o 'cancelled'
    if (currentUserRole === 'advisor') {
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