import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient, createClientFromRequest } from '@/lib/supabase/server'
import { extractPaginationFromURL, calculateOffset, generatePaginationMeta } from '@/lib/utils/pagination'
import { createPaginatedResponse } from '@/types/pagination'

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
    console.log('🔄 GET /api/customers - Iniciando...')
    
    // Obtener usuario autenticado directamente usando el request
    // Esto es más confiable para usuarios nuevos que acaban de hacer login
    const supabase = createClientFromRequest(request)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('❌ [GET /api/customers] Usuario no autenticado')
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    // Obtener organizationId del perfil del usuario usando Service Role
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
    console.log('✅ [GET /api/customers] Auth User ID:', authUser.id)
    console.log('✅ [GET /api/customers] User Profile completo:', JSON.stringify(userProfile, null, 2))
    
    // ✅ Obtener parámetros de query
    const url = new URL(request.url)
    const { searchParams } = url
    
    // ✅ Extraer parámetros de paginación
    const paginationParams = extractPaginationFromURL(url)
    const { page, pageSize, sortBy, sortOrder } = paginationParams
    
    // Parámetros adicionales
    const idsParam = searchParams.getAll('ids') // Soporta múltiples IDs
    const search = searchParams.get('search') || undefined
    
    // ✅ LOGS DETALLADOS PARA DIAGNÓSTICO
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔌 API /customers - INICIANDO QUERY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Organization ID:', organizationId)
    console.log('Paginación:', { page, pageSize, sortBy, sortOrder })
    console.log('IDs solicitados:', idsParam.length > 0 ? idsParam : 'Todos')
    console.log('Búsqueda:', search || 'Ninguna')
    
    // ✅ Helper para crear timeout promise
    const createTimeoutPromise = () => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout después de 10 segundos')), 10000);
    });
    
    // Obtener clientes de la organización
    // Si se proporcionan IDs, filtrar por ellos
    let customers, error;
    try {
      const queryPromise = retryQuery(async () => {
        console.log('🔍 [GET /api/customers] Construyendo query con organizationId:', organizationId);
        let query = supabaseAdmin
          .from('customers')
          .select(`
            id,
            name,
            email,
            phone,
            address,
            organization_id,
            vehicles (
              id,
              brand,
              model,
              year,
              license_plate,
              color
            )
          `, { count: 'exact' })
          .eq('organization_id', organizationId)
        
        // Si se proporcionan IDs, filtrar por ellos
        if (idsParam.length > 0) {
          query = query.in('id', idsParam)
        }
        
        // Búsqueda por nombre, email o teléfono
        if (search) {
          query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
        }
        
        // Ordenamiento
        const orderColumn = sortBy || 'created_at'
        const ascending = sortOrder === 'asc' || (sortOrder !== 'desc' && orderColumn === 'created_at')
        query = query.order(orderColumn, { ascending })
        
        // Paginación
        const offset = calculateOffset(page, pageSize)
        query = query.range(offset, offset + pageSize - 1)
        
        const result = await query;
        console.log('🔍 [GET /api/customers] Query ejecutada, resultado:', {
          hasData: !!result.data,
          dataLength: result.data?.length || 0,
          error: result.error,
          // Log de los primeros 3 clientes para verificar organization_id
          firstCustomers: result.data?.slice(0, 3).map((c: any) => ({
            id: c.id,
            name: c.name,
            organization_id: c.organization_id
          })) || []
        });
        return result;
      }, 2, 500);
      
      // Race entre query y timeout
      const result = await Promise.race([queryPromise, createTimeoutPromise()]) as any;
      
      if (result && typeof result === 'object' && 'data' in result) {
        customers = result.data;
        error = result.error;
      } else {
        throw new Error('Resultado inesperado de la query');
      }
    } catch (retryError: any) {
      console.error('❌ [GET /api/customers] Falló después de reintentos:', retryError);
      console.error('❌ [GET /api/customers] Error message:', retryError?.message);
      console.error('❌ [GET /api/customers] Error stack:', retryError?.stack);
      
      // Si es timeout, retornar error específico
      if (retryError?.message?.includes('timeout')) {
        return NextResponse.json({ 
          success: false, 
          error: 'La consulta tardó demasiado. Por favor, intenta de nuevo.' 
        }, { status: 504 });
      }
      
      error = retryError;
    }

    // ✅ LOGS DETALLADOS DEL ERROR SI EXISTE
    if (error) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('❌ ERROR EN QUERY CON VEHICLES')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('Error code:', error.code)
      console.log('Error message:', error.message)
      console.log('Error details:', error.details)
      console.log('Error hint:', error.hint)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }

    // Si falla la query con vehicles, intentar sin el join
    if (error && (
      error.code === '42P01' || 
      error.code === 'PGRST301' ||
      error.code === '42703' ||
      error.message?.includes('relation') || 
      error.message?.includes('does not exist') ||
      error.message?.includes('permission denied') ||
      error.message?.includes('RLS')
    )) {
      console.warn('⚠️ [GET /api/customers] Error con vehicles, intentando sin join:', error.message)
      console.log('🔄 [GET /api/customers] Intentando query simple sin join con retry...')
      
      let customersSimple, errorSimple;
      try {
        const queryPromise = retryQuery(async () => {
          let query = supabaseAdmin
            .from('customers')
            .select('*', { count: 'exact' })
            .eq('organization_id', organizationId)
          
          // Búsqueda por nombre, email o teléfono
          if (search) {
            query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
          }
          
          // Ordenamiento
          const orderColumn = sortBy || 'created_at'
          const ascending = sortOrder === 'asc' || (sortOrder !== 'desc' && orderColumn === 'created_at')
          query = query.order(orderColumn, { ascending })
          
          // Paginación
          const offset = calculateOffset(page, pageSize)
          query = query.range(offset, offset + pageSize - 1)
          
          return await query
        }, 2, 500);
        
        // Race entre query y timeout
        const result = await Promise.race([queryPromise, createTimeoutPromise()]) as any;
        
        if (result && typeof result === 'object' && 'data' in result) {
          customersSimple = result.data;
          errorSimple = result.error;
        } else {
          throw new Error('Resultado inesperado de la query simple');
        }
      } catch (retryError: any) {
        console.error('❌ [GET /api/customers] Query simple falló después de reintentos:', retryError);
        
        // Si es timeout, retornar error específico
        if (retryError?.message?.includes('timeout')) {
          return NextResponse.json({ 
            success: false, 
            error: 'La consulta tardó demasiado. Por favor, intenta de nuevo.' 
          }, { status: 504 });
        }
        
        errorSimple = retryError;
      }
      
      if (errorSimple) {
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('❌ ERROR EN QUERY SIMPLE (SIN VEHICLES)')
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.error('Error code:', errorSimple.code)
        console.error('Error message:', errorSimple.message)
        console.error('Error details:', errorSimple.details)
        console.error('Error hint:', errorSimple.hint)
        console.error('Organization ID usado:', organizationId)
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        
        // Verificar si es un error de RLS o de permisos
        if (errorSimple.code === '42501' || errorSimple.message.includes('permission denied') || errorSimple.message.includes('RLS')) {
          return NextResponse.json({ 
            success: false, 
            error: 'Error de permisos: Verifique las políticas RLS de la tabla customers',
            code: errorSimple.code,
            hint: errorSimple.hint
          }, { status: 500 })
        }
        
        return NextResponse.json({ 
          success: false, 
          error: errorSimple.message || 'Error al obtener clientes',
          code: errorSimple.code,
          details: errorSimple.details,
          hint: errorSimple.hint
        }, { status: 500 })
      }
      
      customers = customersSimple
      console.log('✅ [GET /api/customers] Query simple exitosa, clientes obtenidos:', customers?.length || 0)
    } else if (error) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('❌ ERROR INESPERADO EN QUERY')
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      console.error('Organization ID usado:', organizationId)
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Error al obtener clientes',
        code: error.code,
        details: error.details,
        hint: error.hint
      }, { status: 500 })
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ API /customers - QUERY EXITOSA')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Clientes obtenidos:', customers?.length || 0)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    // ✅ Si se solicita paginación (pageSize > 0), devolver formato paginado
    // Si no (idsParam o sin paginación), devolver array simple
    if (pageSize > 0 && idsParam.length === 0) {
      // Obtener total para paginación (si no viene en el resultado)
      const total = (customers as any)?._count || customers?.length || 0
      
      return NextResponse.json(
        createPaginatedResponse(customers || [], page, pageSize, total)
      )
    } else {
      // ✅ DEVOLVER EN EL FORMATO SIMPLE (sin paginación)
      return NextResponse.json({ 
        success: true, 
        data: customers || [] 
      })
    }

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('💥 [GET /api/customers] ERROR INESPERADO')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('Error:', error)
    console.error('Message:', error?.message)
    console.error('Stack:', error?.stack)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Error desconocido al obtener clientes',
      details: error?.stack
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/customers - Iniciando...')
    
    // Obtener usuario autenticado directamente usando el request
    // Esto es más confiable para usuarios nuevos que acaban de hacer login
    const supabase = createClientFromRequest(request)
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !authUser) {
      console.error('❌ [POST /api/customers] Usuario no autenticado')
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    // Obtener organizationId del perfil del usuario usando Service Role
    const supabaseAdmin = getSupabaseServiceClient()
    
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', authUser.id)
      .single()
    
    if (profileError || !userProfile || !userProfile.organization_id) {
      console.error('❌ [POST /api/customers] Error obteniendo perfil:', profileError)
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario sin organización asignada. Por favor, contacta al administrador.' 
      }, { status: 403 })
    }
    
    const organizationId = userProfile.organization_id
    console.log('✅ [POST /api/customers] Organization ID:', organizationId)

    const body = await request.json();
    console.log('📝 Datos recibidos:', body);

    // ✅ VALIDACIÓN CRÍTICA: Si viene organization_id en el body, debe coincidir con el del usuario
    if (body.organization_id && body.organization_id !== organizationId) {
      console.error('❌ [POST /api/customers] Intento de crear cliente en otra organización:', {
        user_org: organizationId,
        body_org: body.organization_id
      });
      return NextResponse.json({ 
        success: false, 
        error: 'No se puede crear cliente en otra organización. El organization_id será asignado automáticamente.' 
      }, { status: 403 });
    }

    // ✅ FORZAR organization_id del usuario (ignorar el del body por seguridad)
    body.organization_id = organizationId;

    // Obtener workshop_id del usuario autenticado usando Service Role
    const supabaseAdminPost = getSupabaseServiceClient()
    
    const { data: userData, error: userDataError } = await supabaseAdminPost
      .from('users')
      .select('workshop_id')
      .eq('auth_user_id', authUser.id)
      .single()

    const workshopId = (userData && !userDataError) ? (userData as { workshop_id: string | null }).workshop_id : null
    
    // Crear nuevo cliente usando Service Role
    const { data: customer, error } = await supabaseAdminPost
      .from('customers')
      .insert({
        organization_id: organizationId,
        workshop_id: workshopId,
        name: body.name,
        email: body.email,
        phone: body.phone,
        address: body.address,
        notes: body.notes
      } as any)
      .select()
      .single()

    if (error) {
      console.error('❌ Error creando cliente:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 500 })
    }

    if (!customer) {
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo crear el cliente' 
      }, { status: 500 })
    }

    const customerData = customer as any
    console.log('✅ Cliente creado:', customerData.id)
    
    // ✅ DEVOLVER EN EL FORMATO CORRECTO
    return NextResponse.json({ 
      success: true, 
      data: customer 
    })
    
  } catch (error: any) {
    console.error('💥 Error en POST /api/customers:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 })
  }
}
