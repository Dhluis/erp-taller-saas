import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
} from '@/lib/database/queries/work-orders';
import { createInvoiceFromWorkOrder } from '@/lib/database/queries/invoices';
import { hasPermission, canAccessWorkOrder, UserRole } from '@/lib/auth/permissions';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { deductInventoryOnOrderComplete } from '@/lib/work-orders/deduct-inventory-on-complete';

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
          phone,
          address
        ),
        vehicle:vehicles(
          id,
          brand,
          model,
          year,
          license_plate,
          color,
          mileage
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

    // ✅ Obtener datos de inspección si existen
    let inspection = null;
    if (order) {
      const { data: inspectionData, error: inspectionError } = await supabaseAdmin
        .from('vehicle_inspections')
        .select('*')
        .eq('order_id', params.id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (inspectionError) {
        console.error('❌ [API GET /work-orders/[id]] Error obteniendo inspección:', inspectionError);
      } else {
        inspection = inspectionData;
        if (inspection) {
          console.log('✅ [API GET /work-orders/[id]] Inspección encontrada:', {
            id: inspection.id,
            order_id: inspection.order_id,
            has_fluids_check: !!inspection.fluids_check,
            fluids_check: inspection.fluids_check,
            fuel_level: inspection.fuel_level,
            valuable_items: inspection.valuable_items,
            entry_reason: inspection.entry_reason,
            procedures: inspection.procedures,
          });
        } else {
          console.log('ℹ️ [API GET /work-orders/[id]] No se encontró inspección para esta orden');
        }
      }
    }

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

    // ✅ DEBUG: Log de datos que se están devolviendo
    console.log('📤 [API GET /work-orders/[id]] Datos devueltos:', {
      order_id: order.id,
      has_customer: !!order.customer,
      customer: order.customer ? {
        id: order.customer.id,
        name: order.customer.name,
        phone: order.customer.phone,
        email: order.customer.email,
      } : null,
      has_vehicle: !!order.vehicle,
      vehicle: order.vehicle ? {
        id: order.vehicle.id,
        brand: order.vehicle.brand,
        model: order.vehicle.model,
        year: order.vehicle.year,
        license_plate: order.vehicle.license_plate,
        color: order.vehicle.color,
        mileage: order.vehicle.mileage,
      } : null,
      has_inspection: !!inspection,
      description: order.description,
      estimated_cost: order.estimated_cost,
      assigned_to: order.assigned_to,
      has_assigned_user: !!(order as any).assigned_user,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        inspection // ✅ Incluir datos de inspección en la respuesta
      },
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
    console.log('📥 [API PUT /work-orders/[id]] Body recibido:', JSON.stringify({ ...body, description: body.description?.substring?.(0, 80) }));

    // ✅ VALIDACIÓN: Verificar permisos para reasignar órdenes
    if (body.assigned_to !== undefined) {
      // Si está intentando cambiar assigned_to, verificar que tenga permisos
      if (currentUserRole !== 'ADMIN' && currentUserRole !== 'ASESOR') {
        console.log('❌ [API PUT /work-orders/[id]] Intento de reasignación sin permisos:', {
          userId: user.id,
          userRole: currentUserRole,
          orderId: params.id,
          assignedTo: body.assigned_to
        })
        
        return NextResponse.json({ 
          success: false,
          error: 'No tienes permisos para reasignar órdenes',
          details: 'Solo administradores y asesores pueden reasignar órdenes de trabajo.'
        }, { status: 403 })
      }
    }

    // Validaciones opcionales
    // Permitir descripciones vacías/nulas (muchas órdenes existentes las tienen)
    // Solo validar si el usuario escribe algo y es muy corto (>0 y <10)
    if (body.description !== undefined && body.description !== null && body.description.trim().length > 0 && body.description.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'La descripción debe tener al menos 10 caracteres o estar vacía',
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
    // Capturar campos previos para historial de cambios
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
      .from('work_orders')
      .select(`
        id, organization_id, status, description, estimated_cost, assigned_to,
        assigned_user:users!work_orders_assigned_to_fkey(id, full_name)
      `)
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

    const prevOrder = existingOrder as any;
    let lowStockAlerts: Array<{ name: string; current_stock: number; min_stock?: number }> | undefined;

    if (body.status === 'completed' && prevOrder.status !== 'completed') {
      try {
        const result = await deductInventoryOnOrderComplete(supabaseAdmin, params.id, organizationId);
        if (result.lowStockAlerts.length > 0) {
          lowStockAlerts = result.lowStockAlerts;
        }
        const historyDesc = 'Inventario descontado automáticamente al completar la orden.';
        const { data: u } = await supabaseAdmin.from('users').select('id, full_name').eq('auth_user_id', user.id).single();
        await supabaseAdmin.from('work_order_history').insert({
          organization_id: organizationId,
          work_order_id: params.id,
          user_id: (u as any)?.id ?? null,
          user_name: (u as any)?.full_name || 'Sistema',
          action: 'field_update',
          description: historyDesc,
          old_value: null,
          new_value: null,
        } as any).then(({ error: he }) => { if (he) console.warn('⚠️ work_order_history insert:', he); });
      } catch (deductErr) {
        console.error('❌ [API PUT /work-orders/[id]] Error descontando inventario:', deductErr);
      }

      // Crear factura automáticamente si no existe
      try {
        console.log('[Invoice] 🔍 Buscando factura existente para orden:', params.id);
        const { data: existingInvoice } = await supabaseAdmin
          .from('invoices')
          .select('id')
          .eq('work_order_id', params.id)
          .maybeSingle();
        if (existingInvoice) {
          console.log('[Invoice] ⚠️ Ya existe factura:', existingInvoice.id, '- No se crea duplicado');
        } else {
          const { data: services } = await supabaseAdmin
            .from('work_order_services')
            .select('id, total_price')
            .eq('work_order_id', params.id);
          const servicesList = services || [];
          const total = servicesList.reduce((sum: number, s: any) => sum + (Number(s?.total_price) || 0), 0);
          console.log('[Invoice] 📋 Servicios encontrados:', servicesList.length);
          console.log('[Invoice] 💰 Total calculado:', total);
          const newInvoice = await createInvoiceFromWorkOrder(params.id, supabaseAdmin, {
            organization_id: (updatedOrder as any).organization_id,
            customer_id: (updatedOrder as any).customer_id,
            status: 'completed',
            vehicle_id: (updatedOrder as any).vehicle_id,
            description: (updatedOrder as any).description,
            subtotal: (updatedOrder as any).subtotal,
            tax_amount: (updatedOrder as any).tax_amount,
            discount_amount: (updatedOrder as any).discount_amount,
            order_items: (updatedOrder as any).order_items,
          });
          console.log('[Invoice] ✅ Factura creada:', (newInvoice as any)?.id, 'para orden:', params.id);
        }
      } catch (invoiceErr: any) {
        console.error('[Invoice] ❌ Error creando factura:', invoiceErr?.message ?? invoiceErr);
      }
    }

    // ✅ Registrar historial de cambios (fire-and-forget, no bloquea la respuesta)
    if (updatedOrder && existingOrder) {
      const historyEntries: Array<{
        organization_id: string;
        work_order_id: string;
        user_id: string | null;
        user_name: string;
        action: string;
        description: string;
        old_value: Record<string, unknown> | null;
        new_value: Record<string, unknown> | null;
      }> = [];

      // Obtener el user_id interno y nombre
      const { data: internalUser } = await supabaseAdmin
        .from('users')
        .select('id, full_name')
        .eq('auth_user_id', user.id)
        .single();

      const internalUserData = internalUser as any;
      const userName = internalUserData?.full_name || user.email || 'Usuario';
      const internalUserId = internalUserData?.id || null;

      const STATUS_LABELS: Record<string, string> = {
        reception: 'Recepción', diagnosis: 'Diagnóstico', initial_quote: 'Cotización Inicial',
        waiting_approval: 'Esperando Aprobación', disassembly: 'Desarme', waiting_parts: 'Espera de Piezas',
        assembly: 'Armado', testing: 'Pruebas', ready: 'Listo para Entrega',
        completed: 'Completada', cancelled: 'Cancelada', pending: 'Pendiente', in_progress: 'En Progreso',
      };

      // Cast para acceder a propiedades de la orden existente (prevOrder ya definido arriba)

      // Cambio de estado
      if (body.status && body.status !== prevOrder.status) {
        const oldLabel = STATUS_LABELS[prevOrder.status] || prevOrder.status;
        const newLabel = STATUS_LABELS[body.status] || body.status;
        historyEntries.push({
          organization_id: organizationId,
          work_order_id: params.id,
          user_id: internalUserId,
          user_name: userName,
          action: 'status_change',
          description: `Estado cambiado de "${oldLabel}" a "${newLabel}"`,
          old_value: { status: prevOrder.status },
          new_value: { status: body.status },
        });
      }

      // Cambio de asignación
      if (body.assigned_to !== undefined && body.assigned_to !== prevOrder.assigned_to) {
        const oldMechanicName = prevOrder.assigned_user?.full_name || null;
        
        // Obtener nombre del nuevo mecánico
        let newMechanicName = 'Sin asignar';
        if (body.assigned_to) {
          const { data: newMechanic } = await supabaseAdmin
            .from('users')
            .select('full_name')
            .eq('id', body.assigned_to)
            .single();
          newMechanicName = (newMechanic as any)?.full_name || 'Mecánico';
        }

        const description = oldMechanicName
          ? `Reasignado de "${oldMechanicName}" a "${newMechanicName}"`
          : `Asignado a "${newMechanicName}"`;

        historyEntries.push({
          organization_id: organizationId,
          work_order_id: params.id,
          user_id: internalUserId,
          user_name: userName,
          action: 'assignment',
          description,
          old_value: oldMechanicName ? { assigned_to: oldMechanicName } : null,
          new_value: { assigned_to: newMechanicName },
        });
      }

      // Insertar todas las entradas de historial (fire-and-forget)
      if (historyEntries.length > 0) {
        supabaseAdmin
          .from('work_order_history')
          .insert(historyEntries as any)
          .then(({ error: historyError }) => {
            if (historyError) {
              console.error('⚠️ [API PUT /work-orders/[id]] Error registrando historial:', historyError);
            } else {
              console.log(`✅ [API PUT /work-orders/[id]] ${historyEntries.length} entradas de historial registradas`);
            }
          });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Orden de trabajo actualizada exitosamente',
      ...(lowStockAlerts && lowStockAlerts.length > 0 && { low_stock_alerts: lowStockAlerts }),
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