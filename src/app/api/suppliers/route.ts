import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/suppliers - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener todos los proveedores de la organización
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .order('name', { ascending: true })

    if (error) {
      console.error('❌ Error obteniendo proveedores:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
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
      error: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/suppliers - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    const supabase = await createClient()
    
    // Crear nuevo proveedor
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        organization_id: tenantContext.organizationId,
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
      error: error.message 
    }, { status: 500 })
  }
}
