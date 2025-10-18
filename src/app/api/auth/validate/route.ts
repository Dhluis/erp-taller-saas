import { NextRequest, NextResponse } from 'next/server'
import { validateAccess, requireAuth, validateAccessWithAuth } from '@/lib/auth/validation'

// POST /api/auth/validate - Validar acceso de usuario
export async function POST(request: NextRequest) {
  try {
    const { userId, resource, action } = await request.json()

    if (!userId || !resource || !action) {
      return NextResponse.json(
        {
          data: null,
          error: 'userId, resource y action son requeridos'
        },
        { status: 400 }
      )
    }

    const hasAccess = await validateAccess(userId, resource, action)

    return NextResponse.json({
      data: {
        hasAccess,
        userId,
        resource,
        action,
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in POST /api/auth/validate:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al validar acceso'
      },
      { status: 500 }
    )
  }
}

// GET /api/auth/validate - Validar autenticación actual
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    return NextResponse.json({
      data: {
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id,
          is_active: user.is_active
        },
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        data: {
          authenticated: false,
          error: error.message || 'Usuario no autenticado'
        },
        error: null
      },
      { status: 401 }
    )
  }
}

