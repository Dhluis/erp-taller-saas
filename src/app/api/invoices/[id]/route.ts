/**
 * API Route para Notas de Venta por ID
 * Maneja operaciones GET, PUT, DELETE para notas de venta específicas
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  updateInvoice,
  updateInvoiceDiscount,
  updateInvoicePaidAmount,
  recalculateInvoiceTotals,
} from '@/lib/supabase/quotations-invoices';
import { getInvoiceById, updateInvoice as updateInvoiceDb } from '@/lib/database/queries/invoices';
import { logger, createLogContext } from '@/lib/core/logging';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { hasPermission, UserRole } from '@/lib/auth/permissions';
import { createClient } from '@/lib/supabase/server';

// =====================================================
// GET - Obtener nota de venta por ID
// =====================================================
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const context = createLogContext(
      organizationId,
      undefined,
      'invoices-api',
      'GET',
      { invoiceId: params.id }
    );
    logger.info('Obteniendo nota de venta por ID', context);

    const invoice = await getInvoiceById(params.id);

    if (!invoice) {
      logger.warn('Nota de venta no encontrada', context);
      return NextResponse.json(
        { success: false, error: 'Nota de venta no encontrada' },
        { status: 404 }
      );
    }

    if ((invoice as any).organization_id !== organizationId) {
      logger.warn('Intento de acceder a factura de otra organización', context);
      return NextResponse.json(
        { success: false, error: 'Nota de venta no encontrada' },
        { status: 404 }
      );
    }

    logger.info(`Nota de venta obtenida exitosamente: ${invoice.id}`, context);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Error al obtener nota de venta', undefined, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener nota de venta',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PUT - Actualizar nota de venta
// =====================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const context = createLogContext(
      organizationId,
      undefined,
      'invoices-api',
      'PUT',
      { invoiceId: params.id }
    );
    
    // Obtener rol del usuario actual
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
    
    const body = await request.json();
    logger.info('Actualizando nota de venta', context, { updateData: body });

    // ✅ VALIDACIÓN: Si se está marcando como pagada, solo admin puede hacerlo
    if (body.status === 'paid') {
      const currentUserRole = currentUser.role as UserRole;
      if (!hasPermission(currentUserRole, 'invoices', 'pay')) {
        logger.warn('Intento de marcar factura como pagada sin permisos', context);
        return NextResponse.json(
          {
            success: false,
            error: 'No tienes permisos para cobrar facturas. Solo administradores pueden hacerlo.',
          },
          { status: 403 }
        );
      }
    }

    // Validar datos de entrada
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos de actualización inválidos',
        },
        { status: 400 }
      );
    }

    const invoice = await updateInvoiceDb(params.id, body);

    // Si se actualizaron items, recalcular totales
    if (body.items || body.subtotal || body.tax || body.discount) {
      await recalculateInvoiceTotals(params.id);
      logger.info('Totales recalculados después de actualización', context);
    }

    logger.businessEvent('invoice_updated', 'invoice', params.id, context);

    return NextResponse.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Error al actualizar nota de venta', undefined, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar nota de venta',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// DELETE - Eliminar nota de venta
// =====================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const context = createLogContext(
      organizationId,
      undefined,
      'invoices-api',
      'DELETE',
      { invoiceId: params.id }
    );
    logger.info('Eliminando nota de venta', context);

    // Verificar que la nota de venta existe antes de eliminar
    const existingInvoice = await getInvoiceById(params.id);
    if (!existingInvoice) {
      logger.warn('Intento de eliminar nota de venta inexistente', context);
      return NextResponse.json(
        {
          success: false,
          error: 'Nota de venta no encontrada',
        },
        { status: 404 }
      );
    }

    // Verificar si la nota de venta puede ser eliminada (paid_amount se calcula de payments)
    if (existingInvoice.status === 'paid') {
      logger.warn('Intento de eliminar nota de venta con pagos', context);
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede eliminar una nota de venta que tiene pagos registrados',
        },
        { status: 400 }
      );
    }

    await deleteInvoice(params.id);

    logger.businessEvent('invoice_deleted', 'invoice', params.id, context);
    logger.info('Nota de venta eliminada exitosamente', context);

    return NextResponse.json({
      success: true,
      message: 'Nota de venta eliminada correctamente',
    });
  } catch (error) {
    logger.error('Error al eliminar nota de venta', undefined, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al eliminar nota de venta',
      },
      { status: 500 }
    );
  }
}

// =====================================================
// PATCH - Actualizaciones específicas
// =====================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const context = createLogContext(
      organizationId,
      undefined,
      'invoices-api',
      'PATCH',
      { invoiceId: params.id }
    );
    
    // Obtener rol del usuario actual
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
    
    const body = await request.json();
    const { action, ...data } = body;

    logger.info('Procesando actualización específica de nota de venta', context, { action, data });

    let result;

    switch (action) {
      case 'update_discount':
        if (typeof data.discount !== 'number') {
          return NextResponse.json(
            {
              success: false,
              error: 'Descuento debe ser un número válido',
            },
            { status: 400 }
          );
        }
        result = await updateInvoiceDiscount(params.id, data.discount);
        await recalculateInvoiceTotals(params.id);
        logger.businessEvent('invoice_discount_updated', 'invoice', params.id, context);
        break;

      case 'update_paid_amount':
        // ✅ VALIDACIÓN: Solo admin puede procesar pagos
        const currentUserRoleForPayment = currentUser.role as UserRole;
        if (!hasPermission(currentUserRoleForPayment, 'invoices', 'pay')) {
          logger.warn('Intento de procesar pago sin permisos', context);
          return NextResponse.json(
            {
              success: false,
              error: 'No tienes permisos para procesar pagos. Solo administradores pueden cobrar facturas.',
            },
            { status: 403 }
          );
        }
        
        if (typeof data.paid_amount !== 'number') {
          return NextResponse.json(
            {
              success: false,
              error: 'Monto pagado debe ser un número válido',
            },
            { status: 400 }
          );
        }
        result = await updateInvoicePaidAmount(params.id, data.paid_amount);
        logger.businessEvent('invoice_payment_updated', 'invoice', params.id, context);
        break;

      case 'recalculate_totals':
        await recalculateInvoiceTotals(params.id);
        result = await getInvoiceById(params.id);
        logger.info('Totales de nota de venta recalculados', context);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Acción no válida: ${action}`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error en actualización específica de nota de venta', undefined, error as Error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en actualización específica',
      },
      { status: 500 }
    );
  }
}