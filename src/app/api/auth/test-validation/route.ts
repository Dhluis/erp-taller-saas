import { NextRequest, NextResponse } from 'next/server'
import { validateAccess } from '@/lib/auth/validation'

// GET /api/auth/test-validation - Probar validación de acceso
export async function GET(request: NextRequest) {
  try {
    // Simular validación de acceso para diferentes roles y recursos
    const testCases = [
      { userId: 'test-admin-id', resource: 'customers', action: 'read' },
      { userId: 'test-manager-id', resource: 'quotations', action: 'approve' },
      { userId: 'test-employee-id', resource: 'invoices', action: 'delete' },
      { userId: 'test-viewer-id', resource: 'reports', action: 'read' }
    ]

    const results = []

    for (const testCase of testCases) {
      try {
        const hasAccess = await validateAccess(
          testCase.userId,
          testCase.resource as any,
          testCase.action as any
        )
        
        results.push({
          ...testCase,
          hasAccess,
          status: 'success'
        })
      } catch (error: any) {
        results.push({
          ...testCase,
          hasAccess: false,
          status: 'error',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      data: {
        message: 'Sistema de validación de acceso funcionando',
        testResults: results,
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/auth/test-validation:', error)
    return NextResponse.json(
      {
        data: null,
        error: error.message || 'Error al probar validación'
      },
      { status: 500 }
    )
  }
}

