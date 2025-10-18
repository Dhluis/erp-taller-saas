import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/auth/example - Ejemplo de uso de validación con diferentes recursos
export async function GET(request: NextRequest) {
  try {
    // 1. Requerir autenticación
    const user = await requireAuth(request)
    
    // 2. Validar permisos para diferentes recursos
    const permissions = {
      customers: await validateAccess(user.id, 'customers', 'read'),
      quotations: await validateAccess(user.id, 'quotations', 'create'),
      invoices: await validateAccess(user.id, 'invoices', 'update'),
      reports: await validateAccess(user.id, 'reports', 'read'),
      settings: await validateAccess(user.id, 'settings', 'read')
    }
    
    return NextResponse.json({ 
      data: {
        message: 'Validación de permisos completada',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id
        },
        permissions,
        timestamp: new Date().toISOString()
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

    console.error('Error in GET /api/auth/example:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

