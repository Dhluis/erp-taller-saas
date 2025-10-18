import { NextRequest, NextResponse } from 'next/server'
import { withAccessValidation, withRoleValidation, withOrganizationValidation } from '@/lib/auth/validation'

// GET /api/protected-example - Ejemplo de endpoint protegido con validación de acceso
export const GET = withAccessValidation('customers', 'read', async (request: NextRequest, user) => {
  try {
    return NextResponse.json({
      data: {
        message: 'Acceso autorizado',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id
        },
        resource: 'customers',
        action: 'read',
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error en endpoint protegido'
      },
      { status: 500 }
    )
  }
})

// POST /api/protected-example - Ejemplo de endpoint protegido con validación de rol
export const POST = withRoleValidation(['admin', 'manager'], async (request: NextRequest, user) => {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      data: {
        message: 'Operación autorizada para administradores y managers',
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        },
        body,
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error en endpoint protegido'
      },
      { status: 500 }
    )
  }
})

