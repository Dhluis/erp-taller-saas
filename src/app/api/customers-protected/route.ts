import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, validateAccess } from '@/lib/auth/validation'
import { getAllCustomers } from '@/lib/database/queries/customers'

// GET /api/customers-protected - Ejemplo de endpoint protegido con el patrón directo
export async function GET(request: NextRequest) {
  try {
    // 1. Requerir autenticación
    const user = await requireAuth(request)
    
    // 2. Validar permisos específicos
    if (!await validateAccess(user.id, 'customers', 'read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // 3. Filtrar por organization_id del usuario
    const data = await getAllCustomers(user.organization_id)
    
    return NextResponse.json({ 
      data,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organization_id: user.organization_id
      }
    })
  } catch (error: any) {
    // Manejar errores de autenticación
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/customers-protected:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

