import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware'

// POST /api/auth/logout - Cerrar sesión
export async function POST(request: NextRequest) {
  // 🛡️ Rate limiting - OPCIONAL (fail-open si Redis no disponible)
  try {
    const rateLimitResponse = await rateLimitMiddleware.auth(request);
    if (rateLimitResponse) {
      console.warn('[Auth Logout] 🚫 Rate limit exceeded');
      return rateLimitResponse;
    }
  } catch (rateLimitError: any) {
    // ⚠️ Si rate limiting falla (Redis no disponible, etc.), continuar sin limitar
    const errorMsg = rateLimitError?.message || 'Unknown error';
    if (errorMsg.includes('REDIS_NOT_AVAILABLE') || errorMsg.includes('Missing')) {
      console.warn('[Auth Logout] ⚠️ Rate limiting no disponible, continuando sin límites (fail-open)');
    } else {
      console.warn('[Auth Logout] ⚠️ Error en rate limiting, continuando sin límites:', errorMsg);
    }
    // Continuar sin bloquear el request
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

