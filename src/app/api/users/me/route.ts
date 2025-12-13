import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

// Endpoint para obtener el perfil del usuario actual
// Usa Service Role para bypass RLS
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getTenantContext(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }
    
    // Usar Service Role para bypass RLS
    const supabaseAdmin = getSupabaseServiceClient()
    
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', userId)
      .single()
    
    if (error) {
      console.error('[GET /api/users/me] Error:', error)
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }
    
    // Mapear full_name a name para compatibilidad
    const mappedProfile = {
      ...profile,
      name: profile.full_name || ''
    }
    
    return NextResponse.json({ profile: mappedProfile })
  } catch (error: any) {
    console.error('[GET /api/users/me] Error:', error)
    return NextResponse.json(
      { error: 'Error al obtener perfil' },
      { status: 500 }
    )
  }
}

