import { NextRequest, NextResponse } from 'next/server'

// GET /api/docs/info - Información del sistema de documentación
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      data: {
        message: 'Sistema de documentación Swagger/OpenAPI implementado exitosamente',
        system: {
          name: 'ERP API Documentation',
          version: '1.0.0',
          status: 'active'
        },
        features: {
          documentation_types: [
            {
              type: 'swagger_ui',
              description: 'Interfaz interactiva de Swagger UI',
              url: '/api-docs'
            },
            {
              type: 'openapi_json',
              description: 'Especificación OpenAPI en formato JSON',
              url: '/api/swagger.json'
            },
            {
              type: 'api_info',
              description: 'Información del sistema de documentación',
              url: '/api/docs/info'
            }
          ],
          capabilities: [
            'Documentación interactiva completa',
            'Pruebas de endpoints en tiempo real',
            'Esquemas de datos detallados',
            'Autenticación integrada',
            'Filtrado por tags',
            'Búsqueda de endpoints',
            'Exportación de especificaciones',
            'Validación de respuestas'
          ],
          documented_modules: [
            {
              module: 'Authentication',
              endpoints: 3,
              description: 'Autenticación y autorización'
            },
            {
              module: 'Customers',
              endpoints: 6,
              description: 'Gestión de clientes'
            },
            {
              module: 'Vehicles',
              endpoints: 6,
              description: 'Gestión de vehículos'
            },
            {
              module: 'Quotations',
              endpoints: 8,
              description: 'Gestión de cotizaciones'
            },
            {
              module: 'Work Orders',
              endpoints: 8,
              description: 'Gestión de órdenes de trabajo'
            },
            {
              module: 'Invoices',
              endpoints: 8,
              description: 'Gestión de facturas'
            },
            {
              module: 'Products',
              endpoints: 6,
              description: 'Gestión de productos e inventario'
            },
            {
              module: 'Suppliers',
              endpoints: 8,
              description: 'Gestión de proveedores'
            },
            {
              module: 'Purchase Orders',
              endpoints: 8,
              description: 'Gestión de órdenes de compra'
            },
            {
              module: 'Users',
              endpoints: 8,
              description: 'Gestión de usuarios del sistema'
            },
            {
              module: 'Reports',
              endpoints: 6,
              description: 'Reportes y métricas'
            },
            {
              module: 'Notifications',
              endpoints: 8,
              description: 'Sistema de notificaciones'
            },
            {
              module: 'Backups',
              endpoints: 8,
              description: 'Sistema de backup automático'
            }
          ]
        },
        endpoints: {
          documentation: [
            'GET /api-docs - Interfaz Swagger UI',
            'GET /api/swagger.json - Especificación OpenAPI',
            'GET /api/docs/info - Información del sistema'
          ],
          total_endpoints: 95,
          total_modules: 13,
          authentication_required: 'Bearer Token (Supabase Auth)'
        },
        schemas: {
          total_schemas: 15,
          main_entities: [
            'Customer',
            'Vehicle', 
            'Quotation',
            'WorkOrder',
            'Invoice',
            'Product',
            'Supplier',
            'PurchaseOrder',
            'User',
            'Notification',
            'Backup'
          ],
          common_schemas: [
            'Error',
            'Success',
            'Pagination'
          ]
        },
        swagger_ui: {
          features: [
            'Try it out functionality',
            'Request/Response examples',
            'Schema validation',
            'Authentication testing',
            'Parameter documentation',
            'Response codes',
            'Error handling'
          ],
          customization: {
            theme: 'Default Swagger UI',
            layout: 'List view',
            model_expansion: '1 level',
            try_it_out: 'Enabled'
          }
        },
        openapi_spec: {
          version: '3.0.0',
          format: 'JSON',
          size: '~50KB',
          servers: [
            'http://localhost:3000 (Development)',
            'https://api.erp-taller.com (Production)'
          ]
        },
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/docs/info:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

