import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth/auth-helpers'

/**
 * GET /api/auth/me - Obtener usuario autenticado con perfil
 * Alternativa ligera a /api/users/me para verificación de sesión
 */
export async function GET() {
  try {
    const authData = await getAuthenticatedUser()
    if (!authData?.isAuthenticated || !authData.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    return NextResponse.json({
      user: {
        id: authData.user.id,
        email: authData.user.email,
        user_metadata: authData.user.user_metadata,
      },
      profile: authData.profile ? {
        ...authData.profile,
        name: (authData.profile as { full_name?: string; name?: string }).full_name || (authData.profile as { full_name?: string; name?: string }).name,
      } : null,
    })
  } catch (error: unknown) {
    console.error('[GET /api/auth/me] Error:', error)
    return NextResponse.json(
      { error: (error as Error).message || 'Error al obtener sesión' },
      { status: 500 }
    )
  }
}
