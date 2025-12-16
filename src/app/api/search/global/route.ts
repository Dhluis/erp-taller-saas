import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export interface SearchResult {
  id: string;
  type: 'customer' | 'product' | 'order' | 'invoice' | 'supplier' | 'vehicle';
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

    // ✅ Obtener usuario autenticado y organization_id
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[GET /api/search/global] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          data: []
        },
        { status: 401 }
      );
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('[GET /api/search/global] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
          data: []
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;

    const results: SearchResult[] = [];

    // ✅ Buscar en clientes (FILTRADO POR ORGANIZACIÓN)
    const { data: customers } = await supabaseAdmin
      .from('customers')
      .select('id, name, email, phone, address')
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
        // ✅ Incluir campos directamente para que el componente pueda accederlos
        email: customer.email || null,
        phone: customer.phone || null,
        name: customer.name,
        metadata: { email: customer.email, phone: customer.phone, address: customer.address }
      });
    });

    // ✅ Buscar en productos/inventario (FILTRADO POR ORGANIZACIÓN)
    const { data: inventoryItems } = await supabaseAdmin
      .from('inventory_items')
      .select('id, name, sku, current_stock, min_stock, unit_price, category')
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .or(`name.ilike.%${query}%,sku.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(5);

    inventoryItems?.forEach(item => {
      results.push({
        id: item.id,
        type: 'product',
        title: item.name,
        description: `SKU: ${item.sku || 'N/A'} - Stock: ${item.current_stock || 0}`,
        url: `/inventarios`,
        // ✅ Incluir campos directamente
        name: item.name,
        sku: item.sku || null,
        current_stock: item.current_stock || 0,
        min_stock: item.min_stock || 0,
        category: item.category || null,
        metadata: { sku: item.sku, stock: item.current_stock, category: item.category }
      });
    });

    // ✅ Buscar en vehículos (FILTRADO POR ORGANIZACIÓN)
    const { data: vehicles } = await supabaseAdmin
      .from('vehicles')
      .select(`
        id,
        brand,
        model,
        year,
        license_plate,
        color,
        customer:customers(id, name)
      `)
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .or(`brand.ilike.%${query}%,model.ilike.%${query}%,license_plate.ilike.%${query}%`)
      .limit(5);

    vehicles?.forEach(vehicle => {
      results.push({
        id: vehicle.id,
        type: 'vehicle',
        title: `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim(),
        description: vehicle.license_plate || 'Sin placa',
        url: `/vehiculos`,
        // ✅ Incluir campos directamente para que el componente pueda accederlos
        brand: vehicle.brand || null,
        model: vehicle.model || null,
        year: vehicle.year || null,
        license_plate: vehicle.license_plate || null,
        color: vehicle.color || null,
        customer: (vehicle.customer as any)?.name || null,
        metadata: { 
          brand: vehicle.brand, 
          model: vehicle.model, 
          year: vehicle.year,
          license_plate: vehicle.license_plate,
          color: vehicle.color,
          customer: (vehicle.customer as any)?.name 
        }
      });
    });

    // ✅ Buscar en órdenes (FILTRADO POR ORGANIZACIÓN)
    const { data: orders } = await supabaseAdmin
      .from('work_orders')
      .select(`
        id,
        status,
        description,
        entry_date,
        estimated_cost,
        total_amount,
        customer:customers(id, name, phone, email),
        vehicle:vehicles(id, brand, model, year, license_plate)
      `)
      .eq('organization_id', organizationId) // ✅ FILTRO CRÍTICO
      .or(`id.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(5);

    orders?.forEach(order => {
      const customer = order.customer as any;
      const vehicle = order.vehicle as any;
      results.push({
        id: order.id,
        type: 'order',
        title: `Orden ${order.id.substring(0, 8)}...`,
        description: `${customer?.name || 'Sin cliente'} - ${vehicle?.brand || ''} ${vehicle?.model || ''}`,
        url: `/ordenes/${order.id}`,
        metadata: { 
          status: order.status, 
          amount: order.total_amount,
          customer: customer?.name,
          vehicle: vehicle ? `${vehicle.brand} ${vehicle.model}` : null
        }
      });
    });

    // ✅ Buscar en facturas (FILTRADO POR ORGANIZACIÓN)
    const { data: invoices } = await supabaseAdmin
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
    const { data: suppliers } = await supabaseAdmin
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

