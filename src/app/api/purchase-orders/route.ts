import { NextRequest, NextResponse } from 'next/server'
import { 
  createPurchaseOrder 
} from '@/lib/database/queries/purchase-orders'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'

// GET /api/purchase-orders - Listar órdenes de compra con filtros
export async function GET(request: NextRequest) {
  try {
    // 1. Autenticación
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'No autorizado',
        data: null
      }, { status: 401 });
    }
    
    // 2. Get organization_id
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();
    
    if (!userProfile?.organization_id) {
      return NextResponse.json({ 
        success: false,
        error: 'No se pudo obtener organización',
        data: null
      }, { status: 403 });
    }
    
    // 3. Query params
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    // 4. Query purchase orders con JOIN a suppliers
    const { data: orders, error: ordersError, count } = await supabaseAdmin
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers (
          id,
          name,
          contact_name,
          email,
          phone
        )
      `, { count: 'exact' })
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (ordersError) {
      console.error('❌ Error querying orders:', ordersError);
      return NextResponse.json({ 
        success: false,
        error: ordersError.message,
        data: null
      }, { status: 500 });
    }
    
    // 5. Return con formato correcto
    return NextResponse.json({
      success: true,
      data: {
        items: orders || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      },
      error: null
    });
    
  } catch (error) {
    console.error('❌ Error in GET /api/purchase-orders:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      data: null
    }, { status: 500 });
  }
}

// POST /api/purchase-orders - Crear nueva orden de compra
export async function POST(request: NextRequest) {
  try {
    // ✅ Obtener organizationId SOLO del usuario autenticado
    const tenantContext = await getTenantContext(request)
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json(
        {
          data: null,
          error: 'No autorizado: organización no encontrada'
        },
        { status: 403 }
      )
    }
    const organizationId = tenantContext.organizationId

    const body = await request.json()

    // Validar datos requeridos
    const { supplier_id } = body
    if (!supplier_id) {
      return NextResponse.json(
        {
          data: null,
          error: 'Faltan datos requeridos: supplier_id'
        },
        { status: 400 }
      )
    }

    // ✅ FORZAR organization_id del usuario autenticado (ignorar el del body)
    body.organization_id = organizationId

    const newOrder = await createPurchaseOrder(body)

    return NextResponse.json(
      {
        data: newOrder,
        error: null
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Error in POST /api/purchase-orders:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al crear orden de compra'
      },
      { status: 500 }
    )
  }
}

