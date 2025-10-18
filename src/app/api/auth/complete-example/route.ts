import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/auth/complete-example - Ejemplo completo del patrón de validación
export async function GET(request: NextRequest) {
  try {
    // PASO 1: Requerir autenticación
    const user = await requireAuth(request)
    
    // PASO 2: Validar permisos específicos
    if (!await validateAccess(user.id, 'customers', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // PASO 3: Lógica del endpoint (simulada)
    const customers = [
      { id: 1, name: 'Cliente 1', email: 'cliente1@example.com' },
      { id: 2, name: 'Cliente 2', email: 'cliente2@example.com' }
    ]
    
    // PASO 4: Retornar datos filtrados por organización
    return NextResponse.json({ 
      data: customers,
      meta: {
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
      }
    })
  } catch (error: any) {
    // PASO 5: Manejo de errores
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/auth/complete-example:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

