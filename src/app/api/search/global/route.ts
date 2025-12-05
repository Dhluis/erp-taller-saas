import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationId } from '@/lib/auth/organization-server';
import { createServerClient } from '@/lib/supabase/server';

export interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'order' | 'invoice' | 'supplier';
  title: string;
  description: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * GET /api/search/global - Búsqueda global filtrada por organización
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query');
    const typeFilter = searchParams.get('type'); // Opcional: filtrar por tipo específico

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // ✅ Obtener organization_id del usuario autenticado
    let organizationId: string;
    try {
      organizationId = await getOrganizationId(request);
    } catch (error: any) {
      console.error('[GET /api/search/global] Error obteniendo organizationId:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario. Por favor, contacta al administrador.',
          data: []
        },
        { status: 403 }
      );
    }

    if (!organizationId) {
      console.error('[GET /api/search/global] organizationId es null o undefined');
      return NextResponse.json(
        {
          success: false,
          error: 'Usuario sin organización asignada. Por favor, contacta al administrador.',
          data: []
        },
        { status: 403 }
      );
    }

    const supabase = await createServerClient();

    const results: SearchResult[] = [];

    // ✅ Buscar en clientes (FILTRADO POR ORGANIZACIÓN)
    const { data: customers } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(5);

    customers?.forEach(customer => {
      results.push({
        id: customer.id,
        type: 'customer',
        title: customer.name,
        description: customer.email || customer.phone || 'Cliente',
        url: `/clientes/${customer.id}`,
        metadata: { email: customer.email, phone: customer.phone }
      });
    });

    // ✅ Buscar en productos (FILTRADO POR ORGANIZACIÓN)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, description, code')
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,code.ilike.%${query}%`)
      .limit(5);

    products?.forEach(product => {
      results.push({
        id: product.id,
        type: 'product',
        title: product.name,
        description: product.description || product.code || 'Producto',
        url: `/inventario/productos/${product.id}`,
        metadata: { code: product.code }
      });
    });

    // ✅ Buscar en órdenes (FILTRADO POR ORGANIZACIÓN)
    const { data: orders } = await supabase
      .from('work_orders')
      .select('id, order_number, status, total_amount, customer:customers(name)')
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .or(`order_number.ilike.%${query}%`)
      .limit(5);

    orders?.forEach(order => {
      results.push({
        id: order.id,
        type: 'order',
        title: `Orden ${order.order_number}`,
        description: `${(order.customer as any)?.name || 'Cliente'} - $${order.total_amount}`,
        url: `/ordenes/${order.id}`,
        metadata: { status: order.status, amount: order.total_amount }
      });
    });

    // ✅ Buscar en facturas (FILTRADO POR ORGANIZACIÓN)
    const { data: invoices } = await supabase
      .from('sales_invoices')
      .select('id, invoice_number, status, total_amount, customer:customers(name)')
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .or(`invoice_number.ilike.%${query}%`)
      .limit(5);

    invoices?.forEach(invoice => {
      results.push({
        id: invoice.id,
        type: 'invoice',
        title: `Factura ${invoice.invoice_number}`,
        description: `${(invoice.customer as any)?.name || 'Cliente'} - $${invoice.total_amount}`,
        url: `/ingresos/facturacion/${invoice.id}`,
        metadata: { status: invoice.status, amount: invoice.total_amount }
      });
    });

    // ✅ Buscar en proveedores (FILTRADO POR ORGANIZACIÓN)
    const { data: suppliers } = await supabase
      .from('suppliers')
      .select('id, name, email, phone')
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(5);

    suppliers?.forEach(supplier => {
      results.push({
        id: supplier.id,
        type: 'supplier',
        title: supplier.name,
        description: supplier.email || supplier.phone || 'Proveedor',
        url: `/proveedores/${supplier.id}`,
        metadata: { email: supplier.email, phone: supplier.phone }
      });
    });

    // Filtrar por tipo si se especificó
    const filteredResults = typeFilter 
      ? results.filter(r => r.type === typeFilter)
      : results;

    return NextResponse.json({
      success: true,
      data: filteredResults
    });
  } catch (error: any) {
    console.error('Error in global search:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al realizar búsqueda global',
        data: []
      },
      { status: 500 }
    );
  }
}

