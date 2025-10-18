import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/customers - Listar clientes (versión simplificada para desarrollo)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Para desarrollo, usar organización temporal
    const organizationId = '00000000-0000-0000-0000-000000000001';
    
    // ✅ CORRECTO: Join en la query principal
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

// POST /api/customers - Crear cliente (versión simplificada para desarrollo)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Validar campos requeridos
    if (!body.name || !body.email) {
      return NextResponse.json(
        { success: false, error: 'Nombre y email son requeridos' },
        { status: 400 }
      );
    }

    // Para desarrollo, usar organización temporal
    const organizationId = '00000000-0000-0000-0000-000000000001';
    
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        ...body,
        organization_id: organizationId
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

