import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/auth/demo - Demostrar funciones de validación
export async function GET(request: NextRequest) {
  try {
    // Demostrar el patrón de uso directo
    const user = await requireAuth(request)
    
    if (!await validateAccess(user.id, 'customers', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Si llegamos aquí, el usuario está autenticado y tiene permisos
    return NextResponse.json({
      data: {
        message: 'Usuario autenticado y autorizado',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id
        },
        permissions: {
          resource: 'customers',
          action: 'read',
          granted: true
        },
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    // Manejar errores de autenticación y autorización
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        {
          data: null,
          error: 'Usuario no autenticado'
        },
        { status: 401 }
      )
    }

    if (error.message.includes('Forbidden') || error.message.includes('permisos')) {
      return NextResponse.json(
        {
          data: null,
          error: 'Acceso denegado'
        },
        { status: 403 }
      )
    }

    console.error('Error in GET /api/auth/demo:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error en demostración'
      },
      { status: 500 }
    )
  }
}
