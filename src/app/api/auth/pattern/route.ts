import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, validateAccess } from '@/lib/auth/validation'

// GET /api/auth/pattern - Demostrar patrón completo de validación
export async function GET(request: NextRequest) {
  try {
    // PATRÓN 1: Autenticación básica
    const user = await requireAuth(request)
    
    // PATRÓN 2: Validación de permisos específicos
    const canReadCustomers = await validateAccess(user.id, 'customers', 'read')
    const canCreateQuotations = await validateAccess(user.id, 'quotations', 'create')
    const canUpdateInvoices = await validateAccess(user.id, 'invoices', 'update')
    const canViewReports = await validateAccess(user.id, 'reports', 'read')
    const canManageSettings = await validateAccess(user.id, 'settings', 'update')
    
    // PATRÓN 3: Lógica condicional basada en permisos
    const accessibleFeatures = []
    
    if (canReadCustomers) {
      accessibleFeatures.push('Ver clientes')
    }
    
    if (canCreateQuotations) {
      accessibleFeatures.push('Crear cotizaciones')
    }
    
    if (canUpdateInvoices) {
      accessibleFeatures.push('Actualizar facturas')
    }
    
    if (canViewReports) {
      accessibleFeatures.push('Ver reportes')
    }
    
    if (canManageSettings) {
      accessibleFeatures.push('Gestionar configuración')
    }
    
    return NextResponse.json({ 
      data: {
        message: 'Patrón de validación implementado correctamente',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          organization_id: user.organization_id
        },
        permissions: {
          customers_read: canReadCustomers,
          quotations_create: canCreateQuotations,
          invoices_update: canUpdateInvoices,
          reports_read: canViewReports,
          settings_update: canManageSettings
        },
        accessibleFeatures,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    // PATRÓN 4: Manejo de errores de autenticación
    if (error.message.includes('Token') || error.message.includes('autenticado')) {
      return NextResponse.json(
        { error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    console.error('Error in GET /api/auth/pattern:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

