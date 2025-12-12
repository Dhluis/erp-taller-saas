import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';

// GET /api/customers - Listar clientes
export async function GET(request: NextRequest) {
  try {
    // ✅ SEGURIDAD: Obtener organizationId del usuario autenticado
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: No se pudo obtener la organización' },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId;
    const supabase = await createClient();
    
    // ✅ CORRECTO: Join en la query principal con filtro de seguridad
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (*)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      return NextResponse.json(
        { success: false, error: 'Error al obtener clientes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customers || []
    });
  } catch (error: any) {
    console.error('Error in GET /api/customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al obtener clientes' },
      { status: 500 }
    );
  }
}

// POST /api/customers - Crear cliente
export async function POST(request: NextRequest) {
  try {
    // ✅ SEGURIDAD: Obtener organizationId del usuario autenticado
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado: No se pudo obtener la organización' },
        { status: 403 }
      );
    }

    const organizationId = tenantContext.organizationId;
    const supabase = await createClient();
    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.name || !body.email) {
      return NextResponse.json(
        { success: false, error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    // ✅ SEGURIDAD: Forzar organization_id del usuario autenticado (ignorar si viene en body)
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        ...body,
        organization_id: organizationId // ✅ Siempre usar el del usuario autenticado
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      return NextResponse.json(
        { success: false, error: 'Error al crear cliente' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/customers:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear cliente' },
      { status: 500 }
    );
  }
}

