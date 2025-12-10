import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getOrganizationId } from '@/lib/auth/organization-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/customers - Iniciando...')
    
    // ✅ USAR HELPER CENTRALIZADO - igual que órdenes y citas
    let organizationId: string;
    try {
      organizationId = await getOrganizationId(request)
      console.log('✅ [GET /api/customers] Organization ID:', organizationId)
    } catch (orgError: any) {
      console.error('❌ [GET /api/customers] Error obteniendo organizationId:', orgError)
      console.error('❌ [GET /api/customers] Stack del error:', orgError?.stack)
      return NextResponse.json({ 
        success: false, 
        error: `Error obteniendo organización: ${orgError?.message || 'Error desconocido'}` 
      }, { status: 500 })
    }

    if (!organizationId) {
      console.error('❌ [GET /api/customers] organizationId es null o undefined')
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener el ID de la organización' 
      }, { status: 500 })
    }

    const supabase = await getSupabaseServerClient()
    
    // ✅ LOGS DETALLADOS PARA DIAGNÓSTICO - igual que orders/stats
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔌 API /customers - INICIANDO QUERY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Organization ID:', organizationId)
    
    // Obtener todos los clientes de la organización
    // Intentar primero con vehicles (join opcional)
    let { data: customers, error } = await supabase
      .from('customers')
      .select(`
        *,
        vehicles (
          id,
          brand,
          model,
          year,
          license_plate,
          color
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

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
      error.message.includes('relation') || 
      error.message.includes('does not exist') ||
      error.message.includes('permission denied') ||
      error.message.includes('RLS')
    )) {
      console.warn('⚠️ [GET /api/customers] Error con vehicles, intentando sin join:', error.message)
      console.log('🔄 [GET /api/customers] Intentando query simple sin join...')
      
      const { data: customersSimple, error: errorSimple } = await supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      
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
    
    // ✅ DEVOLVER EN EL FORMATO CORRECTO
    return NextResponse.json({ 
      success: true, 
      data: customers || [] 
    })

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
    
    // ✅ VALIDACIÓN: Obtener organization_id del usuario autenticado
    let organizationId: string;
    try {
      organizationId = await getOrganizationId(request);
      console.log('✅ [POST /api/customers] Organization ID:', organizationId);
    } catch (error: any) {
      console.error('❌ [POST /api/customers] Error obteniendo organizationId:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'No se pudo obtener la organización del usuario. Por favor, contacta al administrador.' 
      }, { status: 403 });
    }

    if (!organizationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario sin organización asignada. Por favor, contacta al administrador.' 
      }, { status: 403 });
    }

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

    const supabase = await getSupabaseServerClient()
    
    // ✅ Obtener workshop_id del usuario autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'No autorizado' 
      }, { status: 401 })
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('workshop_id')
      .eq('auth_user_id', user.id)
      .single()

    const workshopId = (userData && !userDataError) ? (userData as { workshop_id: string | null }).workshop_id : null
    
    // Crear nuevo cliente
    const { data: customer, error } = await supabase
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
