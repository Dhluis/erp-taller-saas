import { NextRequest, NextResponse } from 'next/server'
import { getAllCustomers } from '@/lib/database/queries/customers'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organizationId')
    
    const customers = await getAllCustomers(organizationId || undefined)
    
    return NextResponse.json({ success: true, data: customers })
  } catch (error: any) {
    console.error('❌ API Error fetching customers:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/customers - Iniciando...')
    
    // Obtener contexto del tenant
    const tenantContext = await getTenantContext()
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    console.log('📝 Datos recibidos:', body)

    const supabase = await createClient()
    
    // Crear nuevo cliente
    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        organization_id: tenantContext.organizationId,
        workshop_id: tenantContext.workshopId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        notes: body.notes
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creando cliente:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('✅ Cliente creado:', customer.id)
    return NextResponse.json(customer)

  } catch (error: any) {
    console.error('💥 Error en POST /api/customers:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}