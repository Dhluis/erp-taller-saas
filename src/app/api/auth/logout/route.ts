import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware'

// POST /api/auth/logout - Cerrar sesión
export async function POST(request: NextRequest) {
  // 🛡️ Rate limiting - DEBE SER LO PRIMERO
  const rateLimitResponse = await rateLimitMiddleware.auth(request);
  if (rateLimitResponse) {
    console.warn('[Auth Logout] 🚫 Rate limit exceeded');
    return rateLimitResponse;
  }

  try {
    const supabase = await createClient()

    // Cerrar sesión en Supabase
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        {
          data: null,
          error: 'Error al cerrar sesión'
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { message: 'Sesión cerrada exitosamente' },
      error: null
    })
  } catch (error: any) {
    console.error('Error in POST /api/auth/logout:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al cerrar sesión'
      },
      { status: 500 }
    )
  }
}

