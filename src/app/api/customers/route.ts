import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient, createClientFromRequest } from '@/lib/supabase/server'
import { 
  extractPaginationFromURL, 
  calculateOffset, 
  generatePaginationMeta 
} from '@/lib/utils/pagination'
import type { PaginatedResponse } from '@/types/pagination'

// ✅ Función helper para retry logic
async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 500
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries) {
        console.warn(`⚠️ [Retry] Intento ${i + 1} falló, reintentando en ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/customers - Iniciando con paginación...')
    
    // ✅ PASO 1: Autenticación
    const supabase = createClientFromRequest(request)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('❌ [GET /api/customers] Usuario no autenticado')
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    // ✅ PASO 2: Obtener organizationId
    const supabaseAdmin = getSupabaseServiceClient()
    
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', authUser.id)
      .single()
    
    if (profileError || !userProfile || !userProfile.organization_id) {
      console.error('❌ [GET /api/customers] Error obteniendo perfil:', profileError)
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener el ID de la organización' 
      }, { status: 403 })
    }
    
    const organizationId = userProfile.organization_id
    console.log('✅ [GET /api/customers] Organization ID:', organizationId)
    
    // ✅ PASO 3: Extraer parámetros de URL
    const url = new URL(request.url)
    const { page, pageSize, sortBy, sortOrder } = extractPaginationFromURL(url)
    
    // Parámetros adicionales
    const search = url.searchParams.get('search') || undefined
    const status = url.searchParams.get('status') || undefined
    const idsParam = url.searchParams.getAll('ids') // Soporte legacy para múltiples IDs
    
    console.log('📄 [GET /api/customers] Parámetros de paginación:', {
      page,
      pageSize,
      sortBy,
      sortOrder,
      search,
      status,
      hasIds: idsParam.length > 0
    })
    
    // ✅ Helper para crear timeout promise
    const createTimeoutPromise = () => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout después de 10 segundos')), 10000);
    });
    
    // ✅ PASO 4: Construir y ejecutar query con paginación
    let customers, count, error;
    
    try {
      const queryPromise = retryQuery(async () => {
        console.log('🔍 [GET /api/customers] Construyendo query paginada...');
        
        // Base query
        let query = supabaseAdmin
          .from('customers')
          .select(`
            id,
            name,
            email,
            phone,
            address,
            organization_id,
            created_at,
            updated_at,
            vehicles (
              id,
              brand,
              model,
              year,
              license_plate,
              color
            )
          `, { count: 'exact' }) // ✅ IMPORTANTE: count para paginación
          .eq('organization_id', organizationId)
        
        // ✅ Filtros
        
        // Si hay búsqueda, buscar en nombre, email o teléfono
        if (search) {
          query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        }
        
        // Si hay status filter
        if (status) {
          query = query.eq('status', status)
        }
        
        // Si se proporcionan IDs específicos (soporte legacy)
        if (idsParam.length > 0) {
          query = query.in('id', idsParam)
        }
        
        // ✅ Ordenamiento
        const orderColumn = sortBy || 'created_at'
        const orderDirection = sortOrder === 'asc'
        query = query.order(orderColumn, { ascending: orderDirection })
        
        // ✅ Paginación - CLAVE PARA PERFORMANCE
        const offset = calculateOffset(page, pageSize)
        query = query.range(offset, offset + pageSize - 1)
        
        console.log('🔍 [GET /api/customers] Query configurada:', {
          offset,
          limit: pageSize,
          orderBy: `${orderColumn} ${orderDirection ? 'ASC' : 'DESC'}`
        })
        
        // Ejecutar query
        const result = await query
        
        console.log('✅ [GET /api/customers] Query ejecutada:', {
          itemsReturned: result.data?.length || 0,
          totalCount: result.count,
          hasError: !!result.error
        });
        
        return result;
      }, 2, 500);
      
      // Race entre query y timeout
      const result = await Promise.race([queryPromise, createTimeoutPromise()]) as any;
      
      if (result && typeof result === 'object' && 'data' in result) {
        customers = result.data;
        count = result.count;
        error = result.error;
      } else {
        throw new Error('Resultado inesperado de la query');
      }
      
    } catch (retryError: any) {
      console.error('❌ [GET /api/customers] Falló después de reintentos:', retryError);
      
      // Si es timeout, retornar error específico
      if (retryError?.message?.includes('timeout')) {
        return NextResponse.json({ 
          success: false, 
          error: 'La consulta tardó demasiado. Por favor, intenta de nuevo.' 
        }, { status: 504 });
      }
      
      error = retryError;
      customers = null;
      count = null;
    }
    
    // ✅ PASO 5: Manejar errores
    if (error) {
      console.error('❌ [GET /api/customers] Error en query:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Error al obtener clientes' 
      }, { status: 500 })
    }

    if (!customers) {
      console.warn('⚠️ [GET /api/customers] No se obtuvieron clientes')
      customers = []
    }
    
    // ✅ PASO 6: Generar metadata de paginación
    const pagination = generatePaginationMeta(page, pageSize, count || 0)
    
    console.log('✅ [GET /api/customers] Respuesta preparada:', {
      itemsCount: customers.length,
      pagination
    })
    
    // ✅ PASO 7: Retornar respuesta paginada
    const response: PaginatedResponse<any> = {
      success: true,
      data: {
        items: customers,
        pagination
      }
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ [GET /api/customers] Error general:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor',
      details: error?.message 
    }, { status: 500 })
  }
}

// ✅ POST - Crear nuevo cliente (sin cambios)
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/customers - Iniciando...')
    
    // Obtener usuario autenticado
    const supabase = createClientFromRequest(request)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('❌ Usuario no autenticado')
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    // Obtener organizationId
    const supabaseAdmin = getSupabaseServiceClient()
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', authUser.id)
      .single()
    
    if (profileError || !userProfile || !userProfile.organization_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener el ID de la organización' 
      }, { status: 403 })
    }
    
    const organizationId = userProfile.organization_id

    // ✅ VERIFICAR LÍMITES ANTES DE CREAR
    const { checkResourceLimit } = await import('@/lib/billing/check-limits')
    const limitCheck = await checkResourceLimit(authUser.id, 'customer')
    
    if (!limitCheck.canCreate) {
      console.log('❌ Límite de clientes alcanzado:', limitCheck.error?.message)
      return NextResponse.json({ 
        success: false, 
        error: limitCheck.error?.message || 'Límite de clientes alcanzado',
        limit_reached: true,
        current: limitCheck.current,
        limit: limitCheck.limit,
        upgrade_url: limitCheck.error?.upgrade_url || '/dashboard/billing'
      }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    console.log('📦 Datos recibidos:', body)

    // Validar datos requeridos
    if (!body.name || !body.email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nombre y email son requeridos' 
      }, { status: 400 })
    }

    // Insertar cliente
    const { data: customer, error: insertError } = await supabaseAdmin
      .from('customers')
      .insert({
        ...body,
        organization_id: organizationId
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error al insertar cliente:', insertError)
      return NextResponse.json({ 
        success: false, 
        error: 'Error al crear cliente' 
      }, { status: 500 })
    }

    console.log('✅ Cliente creado:', customer?.id)

    return NextResponse.json({
      success: true,
      data: customer
    })

  } catch (error: any) {
    console.error('❌ Error general:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
