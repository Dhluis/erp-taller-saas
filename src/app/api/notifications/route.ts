import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getOrganizationId } from '@/lib/auth/organization-server'

// POST /api/notifications - Crear notificación de prueba
export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // ✅ Obtener organización usando el método robusto
    const organizationId = await getOrganizationId(request)

    const body = await request.json()
    const { title = 'Test', message = 'Test', type = 'info' } = body

    const supabaseAdmin = getSupabaseServiceClient()
    const { data, error } = await (supabaseAdmin as any)
      .from('notifications')
      .insert({ organization_id: organizationId, type, title, message, read: false })
      .select()
      .single()

    if (error) {
      console.error('[POST /api/notifications] Insert error:', error)
      return NextResponse.json({ success: false, error: error.message, code: error.code, details: error.details }, { status: 500 })
    }
    return NextResponse.json({ success: true, data })
  } catch (err: any) {
    console.error('[POST /api/notifications] Exception:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

// GET /api/notifications - Listar notificaciones
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/notifications - Iniciando...')
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [GET /api/notifications] Error de autenticación:', authError)
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // ✅ Obtener organizationId usando el método robusto unificado
    const organizationId = await getOrganizationId(request);

    console.log('🔍 [GET /api/notifications] Organization ID:', organizationId);

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const is_read = searchParams.get('is_read')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // ✅ Construir query usando supabaseAdmin (bypass RLS) con validación explícita
    let query = supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId) // ✅ Validación explícita de multi-tenancy

    // Filtrar por usuario específico o notificaciones generales (user_id null)
    if (userId) {
      query = query.eq('user_id', userId)
    } else {
      // Mostrar notificaciones del usuario o generales (user_id null)
      // ✅ FIX: Escapar el user.id para evitar problemas con UUIDs
      query = query.or(`user_id.eq."${user.id}",user_id.is.null`)
    }

    // Filtros opcionales
    if (type) {
      query = query.eq('type', type)
    }
    if (priority) {
      query = query.eq('priority', priority)
    }
    if (is_read !== null) {
      const isReadBool = is_read === 'true'
      // ✅ FIX: La columna en la BD es 'read', no 'is_read'
      query = query.eq('read', isReadBool)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`)
    }

    // Ordenar y paginar
    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: notifications, error: queryError, count } = await query

    if (queryError) {
      console.error('❌ [GET /api/notifications] Error en query:', queryError)
      return NextResponse.json(
        { error: 'Error al obtener notificaciones' },
        { status: 500 }
      )
    }

    // Normalizar campo read/is_read
    const normalized = (notifications || []).map((n: any) => ({
      ...n,
      read: n.read !== undefined ? n.read : n.is_read || false,
      is_read: n.is_read !== undefined ? n.is_read : n.read || false
    }))

    console.log('✅ [GET /api/notifications] Notificaciones obtenidas:', normalized.length)

    return NextResponse.json({
      data: normalized,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      },
      error: null
    })
  } catch (error: any) {
    console.error('❌ Error in GET /api/notifications:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

