import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'
import { 
  extractPaginationFromURL, 
  calculateOffset, 
  generatePaginationMeta 
} from '@/lib/utils/pagination'
import type { PaginatedResponse } from '@/types/pagination'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/suppliers - Iniciando...')
    
    // ✅ Obtener parámetros de paginación
    const url = new URL(request.url)
    const { page, pageSize, sortBy, sortOrder } = extractPaginationFromURL(url)
    const search = url.searchParams.get('search') || ''
    const status = url.searchParams.get('status') // 'active' | 'inactive'
    const filter_status = url.searchParams.get('filter_status') // También desde filters
    
    console.log('📊 Parámetros:', { page, pageSize, search, sortBy, sortOrder, status, filter_status })
    
    // ✅ Auth
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ Error de autenticación:', authError)
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado',
        data: { items: [], pagination: {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }}
      }, { status: 401 })
    }

    // ✅ Obtener organizationId
    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ Error obteniendo perfil:', profileError)
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener la organización del usuario',
        data: { items: [], pagination: {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }}
      }, { status: 403 })
    }

    const organizationId = userProfile.organization_id as string
    console.log('✅ Organization ID:', organizationId)
    
    // ✅ Construir query con paginación
    let query = supabaseAdmin
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
    
    // Filtro de búsqueda
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,` +
        `email.ilike.%${search}%,` +
        `contact_person.ilike.%${search}%,` +
        `tax_id.ilike.%${search}%`
      )
    }
    
    // Filtro de estado (priorizar filter_status si viene)
    const finalStatus = filter_status || status
    if (finalStatus === 'active') {
      query = query.eq('is_active', true)
    } else if (finalStatus === 'inactive') {
      query = query.eq('is_active', false)
    }
    
    // Ordenamiento
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy || 'name', { ascending })
    
    // Paginación
    const offset = calculateOffset(page, pageSize)
    query = query.range(offset, offset + pageSize - 1)

    // Ejecutar query
    const { data: suppliers, error, count } = await query

    if (error) {
      console.error('❌ Error obteniendo proveedores:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        data: { items: [], pagination: {
          page: 1,
          pageSize,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false
        }}
      }, { status: 500 })
    }

    // Calcular paginación
    const pagination = generatePaginationMeta(page, pageSize, count || 0)

    console.log('✅ Proveedores obtenidos:', {
      items: suppliers?.length || 0,
      total: count || 0,
      page,
      totalPages: pagination.totalPages
    })
    
    // ✅ Retornar estructura paginada
    return NextResponse.json({ 
      success: true, 
      data: {
        items: suppliers || [],
        pagination
      }
    })

  } catch (error: any) {
    console.error('💥 Error en GET /api/suppliers:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Error al obtener proveedores',
      data: { items: [], pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPreviousPage: false
      }}
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
