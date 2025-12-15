import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

// Endpoint para obtener el perfil del usuario actual
// Usa Service Role para bypass RLS
export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/users/me] Iniciando...')
    
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      console.error('[GET /api/users/me] No hay contexto de tenant')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { userId } = tenantContext
    console.log('[GET /api/users/me] userId:', userId)
    
    if (!userId) {
      console.error('[GET /api/users/me] userId es null o undefined')
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    // Usar Service Role para bypass RLS
    const supabaseAdmin = getSupabaseServiceClient()
    console.log('[GET /api/users/me] Usando Service Role Client')
    
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id, email, full_name, role, phone, is_active, organization_id, created_at, updated_at')
      .eq('auth_user_id', userId)
      .single()
    
    if (error) {
      console.error('[GET /api/users/me] Error en query:', error)
      console.error('[GET /api/users/me] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (!user) {
      console.error('[GET /api/users/me] Usuario es null después de query exitosa')
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    console.log('[GET /api/users/me] Usuario encontrado:', user.email)
    
    // Mapear full_name a name para compatibilidad con SessionContext
    const mappedUser = {
      ...user,
      name: user.full_name || ''
    }
    
    return NextResponse.json({ 
      profile: mappedUser  // SessionContext espera 'profile', no 'user'
    })
  } catch (error: any) {
    console.error('[GET /api/users/me] Error catch:', error)
    console.error('[GET /api/users/me] Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Error al obtener perfil' },
      { status: 500 }
    )
  }
}

