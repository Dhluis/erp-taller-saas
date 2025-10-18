import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/services - Iniciando...')
    
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Obtener todos los servicios activos de la organización
    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) {
      console.error('❌ Error obteniendo servicios:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Servicios obtenidos:', services?.length || 0)
    return NextResponse.json(services || [])

  } catch (error: any) {
    console.error('💥 Error en GET /api/services:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/services - Iniciando...')
    
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    const supabase = await createClient()
    
    // Crear nuevo servicio
    const { data: service, error } = await supabase
      .from('services')
      .insert({
        organization_id: tenantContext.organizationId,
        workshop_id: tenantContext.workshopId,
        code: body.code,
        name: body.name,
        description: body.description,
        category: body.category,
        base_price: body.base_price,
        estimated_hours: body.estimated_hours || 1,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creando servicio:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Servicio creado:', service.id)
    return NextResponse.json(service)

  } catch (error: any) {
    console.error('💥 Error en POST /api/services:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}