import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/suppliers - Iniciando...')
    
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError)
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado',
        data: []
      }, { status: 401 })
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener la organización del usuario',
        data: []
      }, { status: 403 })
    }

    const organizationId = userProfile.organization_id;
    
    // ✅ Usar Service Role Client directamente para queries (bypass RLS)
    const { data: suppliers, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })

    if (error) {
      console.error('❌ Error obteniendo proveedores:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        data: []
      }, { status: 500 })
    }

    console.log('✅ Proveedores obtenidos:', suppliers?.length || 0)
    
    return NextResponse.json({ 
      success: true, 
      data: suppliers || [] 
    })

  } catch (error: any) {
    console.error('💥 Error en GET /api/suppliers:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error al obtener proveedores',
      data: []
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/suppliers - Iniciando...')
    
    // ✅ Obtener usuario autenticado y organization_id usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError)
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado'
      }, { status: 401 })
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener la organización del usuario'
      }, { status: 403 })
    }

    const organizationId = userProfile.organization_id;
    const body = await request.json()
    console.log('📝 Datos recibidos:', body)
    
    // Crear nuevo proveedor usando Service Role Client
    const { data: supplier, error } = await supabaseAdmin
      .from('suppliers')
      .insert({
        organization_id: organizationId,
        name: body.name,
        contact_person: body.contact_person,
        email: body.email,
        phone: body.phone,
        address: body.address,
        city: body.city,
        state: body.state,
        zip_code: body.postal_code || body.zip_code,
        country: body.country,
        tax_id: body.tax_id,
        is_active: body.is_active ?? true,
        notes: body.notes
      } as any)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creando proveedor:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    if (!supplier) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo crear el proveedor' 
      }, { status: 500 })
    }

    console.log('✅ Proveedor creado:', (supplier as any).id)
    
    return NextResponse.json({ 
      success: true, 
      data: supplier 
    })
    
  } catch (error: any) {
    console.error('💥 Error en POST /api/suppliers:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error al crear proveedor'
    }, { status: 500 })
  }
}
