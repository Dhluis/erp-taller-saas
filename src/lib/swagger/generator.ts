import swaggerJsdoc from 'swagger-jsdoc'
import path from 'path'

/**
 * =====================================================
 * GENERADOR DE SWAGGER SIMPLE Y ROBUSTO
 * =====================================================
 * Generador de documentación OpenAPI desde comentarios JSDoc
 * con configuración optimizada para Next.js
 */

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Eagles System API',
      version: '1.0.0',
      description: 'API completa para el sistema ERP de taller automotriz con gestión de clientes, vehículos, cotizaciones, órdenes, facturas, inventario, proveedores, notificaciones y backups.',
      contact: {
        name: 'ERP Support',
        email: 'support@erp-taller.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo'
      },
      {
        url: 'https://api.erp-taller.com',
        description: 'Servidor de producción'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT de Supabase Auth'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Datos de respuesta'
            },
            error: {
              type: 'null',
              description: 'Sin errores'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            pages: { type: 'integer' }
          }
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip_code: { type: 'string' },
            country: { type: 'string' },
            tax_id: { type: 'string' },
            notes: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'name', 'email', 'is_active']
        },
        Vehicle: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            customer_id: { type: 'string', format: 'uuid' },
            brand: { type: 'string' },
            model: { type: 'string' },
            year: { type: 'integer' },
            license_plate: { type: 'string' },
            vin: { type: 'string' },
            color: { type: 'string' },
            mileage: { type: 'integer' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'customer_id', 'brand', 'model', 'year']
        },
        Quotation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            customer_id: { type: 'string', format: 'uuid' },
            vehicle_id: { type: 'string', format: 'uuid' },
            quotation_number: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'sent', 'approved', 'rejected', 'converted'] },
            subtotal: { type: 'number' },
            tax_amount: { type: 'number' },
            total: { type: 'number' },
            valid_until: { type: 'string', format: 'date' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'customer_id', 'vehicle_id', 'quotation_number', 'status']
        },
        WorkOrder: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            customer_id: { type: 'string', format: 'uuid' },
            vehicle_id: { type: 'string', format: 'uuid' },
            order_number: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
            description: { type: 'string' },
            estimated_cost: { type: 'number' },
            total_amount: { type: 'number' },
            entry_date: { type: 'string', format: 'date' },
            estimated_completion: { type: 'string', format: 'date' },
            completed_at: { type: 'string', format: 'date' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'customer_id', 'vehicle_id', 'order_number', 'status']
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            customer_id: { type: 'string', format: 'uuid' },
            vehicle_id: { type: 'string', format: 'uuid' },
            invoice_number: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] },
            subtotal: { type: 'number' },
            tax_amount: { type: 'number' },
            total: { type: 'number' },
            due_date: { type: 'string', format: 'date' },
            paid_date: { type: 'string', format: 'date' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'customer_id', 'vehicle_id', 'invoice_number', 'status']
        },
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            code: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            price: { type: 'number' },
            cost: { type: 'number' },
            stock_quantity: { type: 'integer' },
            min_stock: { type: 'integer' },
            max_stock: { type: 'integer' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'name', 'price', 'stock_quantity']
        },
        Supplier: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            contact_person: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip_code: { type: 'string' },
            country: { type: 'string' },
            tax_id: { type: 'string' },
            payment_terms: { type: 'string' },
            notes: { type: 'string' },
            is_active: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'name', 'email']
        },
        PurchaseOrder: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            supplier_id: { type: 'string', format: 'uuid' },
            order_number: { type: 'string' },
            order_date: { type: 'string', format: 'date' },
            expected_delivery_date: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] },
            subtotal: { type: 'number' },
            tax_amount: { type: 'number' },
            total: { type: 'number' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'supplier_id', 'order_number', 'status']
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'employee', 'viewer'] },
            organization_id: { type: 'string', format: 'uuid' },
            is_active: { type: 'boolean' },
            last_login: { type: 'string', format: 'date-time' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'email', 'name', 'role', 'organization_id']
        },
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            user_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', enum: ['low_stock', 'invoice_overdue', 'quotation_approved', 'order_completed', 'payment_received', 'supplier_order_received', 'system_alert', 'user_activity'] },
            title: { type: 'string' },
            message: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
            is_read: { type: 'boolean' },
            metadata: { type: 'object' },
            created_at: { type: 'string', format: 'date-time' },
            read_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'type', 'title', 'message', 'priority']
        },
        Backup: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            filename: { type: 'string' },
            size: { type: 'integer' },
            organization_id: { type: 'string', format: 'uuid' },
            tables: { type: 'array', items: { type: 'string' } },
            record_count: { type: 'integer' },
            status: { type: 'string', enum: ['completed', 'failed', 'in_progress'] },
            error: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'filename', 'size', 'organization_id', 'status']
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'Endpoints de autenticación y autorización' },
      { name: 'Customers', description: 'Gestión de clientes' },
      { name: 'Vehicles', description: 'Gestión de vehículos' },
      { name: 'Quotations', description: 'Gestión de cotizaciones' },
      { name: 'Work Orders', description: 'Gestión de órdenes de trabajo' },
      { name: 'Invoices', description: 'Gestión de facturas' },
      { name: 'Products', description: 'Gestión de productos e inventario' },
      { name: 'Suppliers', description: 'Gestión de proveedores' },
      { name: 'Purchase Orders', description: 'Gestión de órdenes de compra' },
      { name: 'Users', description: 'Gestión de usuarios del sistema' },
      { name: 'Reports', description: 'Reportes y métricas' },
      { name: 'Notifications', description: 'Sistema de notificaciones' },
      { name: 'Backups', description: 'Sistema de backup automático' }
    ]
  },
  apis: [
    // Rutas específicas para evitar problemas de compilación
    path.join(process.cwd(), 'src/app/api/customers/route.ts'),
    path.join(process.cwd(), 'src/app/api/vehicles/route.ts'),
    path.join(process.cwd(), 'src/app/api/quotations/route.ts'),
    path.join(process.cwd(), 'src/app/api/orders/route.ts'),
    path.join(process.cwd(), 'src/app/api/invoices/route.ts'),
    path.join(process.cwd(), 'src/app/api/products/route.ts'),
    path.join(process.cwd(), 'src/app/api/suppliers/route.ts'),
    path.join(process.cwd(), 'src/app/api/purchase-orders/route.ts'),
    path.join(process.cwd(), 'src/app/api/users/route.ts'),
    path.join(process.cwd(), 'src/app/api/reports/**/*.ts'),
    path.join(process.cwd(), 'src/app/api/notifications/route.ts'),
    path.join(process.cwd(), 'src/app/api/backups/route.ts'),
    path.join(process.cwd(), 'src/app/api/auth/**/*.ts')
  ]
}

// Función para generar la especificación de manera segura
export function generateSwaggerSpec() {
  try {
    const spec = swaggerJsdoc(options)
    
    // Validar que la especificación se generó correctamente
    if (!spec || Object.keys(spec).length === 0) {
      throw new Error('La especificación de Swagger está vacía')
    }
    
    return spec
  } catch (error: any) {
    console.error('Error generando especificación Swagger:', error)
    
    // Retornar una especificación básica en caso de error
    return {
      openapi: '3.0.0',
      info: {
        title: 'Eagles System API',
        version: '1.0.0',
        description: 'API del sistema ERP de taller automotriz'
      },
      servers: [
        {
          url: 'http://localhost:3000',
          description: 'Servidor de desarrollo'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      paths: {},
      tags: []
    }
  }
}

// Exportar la especificación generada
export const swaggerSpec = generateSwaggerSpec()

export default swaggerSpec

