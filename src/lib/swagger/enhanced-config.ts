import swaggerJSDoc from 'swagger-jsdoc'
import path from 'path'

/**
 * =====================================================
 * CONFIGURACIÓN MEJORADA DE SWAGGER/OPENAPI
 * =====================================================
 * Sistema completo de documentación automática
 * con tipos TypeScript y configuración avanzada
 */

// Configuración principal de Swagger
export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Confia Drive API',
      version: '1.0.0',
      description: `
        # Confia Drive API
        
        API completa para el sistema ERP de taller automotriz con gestión integral de:
        
        ## 🚗 **Módulos Principales**
        - **Clientes**: Gestión completa de clientes y vehículos
        - **Cotizaciones**: Sistema de cotizaciones con numeración automática
        - **Órdenes de Trabajo**: Seguimiento de reparaciones y servicios
        - **Facturas**: Facturación y gestión de pagos
        - **Inventario**: Control de productos y stock
        - **Proveedores**: Gestión de proveedores y órdenes de compra
        - **Usuarios**: Sistema de usuarios y permisos
        - **Reportes**: Métricas y análisis del negocio
        - **Notificaciones**: Sistema de alertas y notificaciones
        - **Backups**: Respaldo automático de datos
        
        ## 🔐 **Autenticación**
        - Autenticación JWT con Supabase Auth
        - Control de acceso basado en roles (RBAC)
        - Permisos granulares por módulo
        
        ## 📊 **Características**
        - Numeración automática de documentos
        - Sistema de estados y flujos de trabajo
        - Integración con Supabase
        - Documentación automática con Swagger
        - Validación de datos en tiempo real
      `,
      contact: {
        name: 'ERP Support Team',
        email: 'support@erp-taller.com'
      },
      license: {
        name: 'MIT License',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desarrollo local'
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
          description: 'Token JWT de Supabase Auth. Obtener desde el endpoint de login.'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensaje de error detallado',
              example: 'Error interno del servidor'
            }
          },
          required: ['error']
        },
        Success: {
          type: 'object',
          properties: {
            data: {
              type: 'object',
              description: 'Datos de respuesta exitosa'
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
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 50 },
            total: { type: 'integer', example: 150 },
            pages: { type: 'integer', example: 3 }
          }
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Juan Pérez García' },
            email: { type: 'string', format: 'email', example: 'juan.perez@email.com' },
            phone: { type: 'string', example: '+52 55 1234 5678' },
            address: { type: 'string', example: 'Calle 123, Colonia Centro' },
            city: { type: 'string', example: 'Ciudad de México' },
            state: { type: 'string', example: 'CDMX' },
            zip_code: { type: 'string', example: '01000' },
            country: { type: 'string', example: 'México', default: 'México' },
            tax_id: { type: 'string', example: 'PERJ800101ABC' },
            notes: { type: 'string', example: 'Cliente preferencial' },
            is_active: { type: 'boolean', example: true, default: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          },
          required: ['id', 'organization_id', 'name', 'email', 'is_active']
        }
      }
    },
    tags: [
      { name: 'Authentication', description: '🔐 Endpoints de autenticación y autorización del sistema' },
      { name: 'Customers', description: '👥 Gestión completa de clientes y sus vehículos' },
      { name: 'Vehicles', description: '🚗 Administración de vehículos y su información técnica' },
      { name: 'Quotations', description: '📋 Sistema de cotizaciones con numeración automática' },
      { name: 'Work Orders', description: '🔧 Gestión de órdenes de trabajo y reparaciones' },
      { name: 'Invoices', description: '🧾 Facturación y gestión de pagos' },
      { name: 'Products', description: '📦 Control de inventario y productos' },
      { name: 'Suppliers', description: '🏢 Gestión de proveedores y relaciones comerciales' },
      { name: 'Purchase Orders', description: '🛒 Órdenes de compra y gestión de adquisiciones' },
      { name: 'Users', description: '👤 Administración de usuarios y permisos del sistema' },
      { name: 'Reports', description: '📊 Reportes, métricas y análisis del negocio' },
      { name: 'Notifications', description: '🔔 Sistema de notificaciones y alertas' },
      { name: 'Backups', description: '💾 Sistema de respaldo automático y restauración' }
    ]
  },
  apis: [
    path.join(process.cwd(), 'src/app/api/**/*.ts'),
    path.join(process.cwd(), 'src/app/api/**/*.js'),
    path.join(process.cwd(), 'src/lib/**/*.ts'),
    path.join(process.cwd(), 'src/lib/**/*.js')
  ]
}

// Generar especificación OpenAPI desde comentarios JSDoc
export const swaggerSpec = swaggerJSDoc(swaggerOptions)

// Configuración para Swagger UI
export const swaggerUIConfig = {
  docExpansion: 'list' as const,
  defaultModelsExpandDepth: 1,
  defaultModelExpandDepth: 1,
  tryItOutEnabled: true,
  filter: true,
  showExtensions: true,
  showCommonExtensions: true,
  displayRequestDuration: true,
  deepLinking: true,
  layout: 'StandaloneLayout' as const
}

// Función para obtener la configuración de Swagger
export function getSwaggerConfig() {
  return {
    spec: swaggerSpec,
    ui: swaggerUIConfig
  }
}

// Función para validar la especificación
export function validateSwaggerSpec() {
  try {
    if (!swaggerSpec || Object.keys(swaggerSpec).length === 0) {
      throw new Error('La especificación de Swagger está vacía')
    }
    
    if (!swaggerSpec.openapi) {
      throw new Error('Versión de OpenAPI no especificada')
    }
    
    if (!swaggerSpec.info) {
      throw new Error('Información de la API no especificada')
    }
    
    if (!swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
      console.warn('No se encontraron endpoints documentados')
    }
    
    return {
      valid: true,
      message: 'Especificación de Swagger válida',
      endpoints: Object.keys(swaggerSpec.paths || {}).length,
      schemas: Object.keys(swaggerSpec.components?.schemas || {}).length
    }
  } catch (error: any) {
    return {
      valid: false,
      message: error.message,
      endpoints: 0,
      schemas: 0
    }
  }
}

export default swaggerSpec


