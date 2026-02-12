/**
 * =====================================================
 * CONFIGURACIÓN SWAGGER/OPENAPI
 * =====================================================
 * Documentación completa de la API del ERP
 * con todos los endpoints y esquemas
 */

export const swaggerConfig = {
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
  tags: [
    {
      name: 'Authentication',
      description: 'Endpoints de autenticación y autorización'
    },
    {
      name: 'Customers',
      description: 'Gestión de clientes'
    },
    {
      name: 'Vehicles',
      description: 'Gestión de vehículos'
    },
    {
      name: 'Quotations',
      description: 'Gestión de cotizaciones'
    },
    {
      name: 'Work Orders',
      description: 'Gestión de órdenes de trabajo'
    },
    {
      name: 'Invoices',
      description: 'Gestión de facturas'
    },
    {
      name: 'Products',
      description: 'Gestión de productos e inventario'
    },
    {
      name: 'Suppliers',
      description: 'Gestión de proveedores'
    },
    {
      name: 'Purchase Orders',
      description: 'Gestión de órdenes de compra'
    },
    {
      name: 'Users',
      description: 'Gestión de usuarios del sistema'
    },
    {
      name: 'Reports',
      description: 'Reportes y métricas'
    },
    {
      name: 'Notifications',
      description: 'Sistema de notificaciones'
    },
    {
      name: 'Backups',
      description: 'Sistema de backup automático'
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
        }
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
        }
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
        }
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
        }
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
        }
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
        }
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
        }
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
        }
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
        }
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
        }
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
      }
    }
  },
  paths: {
    // Authentication endpoints
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Autenticar usuario',
        description: 'Autentica un usuario y retorna información de sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Autenticación exitosa',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        user: { $ref: '#/components/schemas/User' },
                        session: { type: 'object' }
                      }
                    },
                    error: { type: 'null' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Credenciales inválidas',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Cerrar sesión',
        description: 'Cierra la sesión del usuario actual',
        responses: {
          '200': {
            description: 'Sesión cerrada exitosamente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Success' }
              }
            }
          }
        }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Obtener usuario actual',
        description: 'Obtiene información del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Información del usuario',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/User' },
                    error: { type: 'null' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Usuario no autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    // Customers endpoints
    '/api/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Listar clientes',
        description: 'Obtiene lista de clientes con filtros y paginación',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'organization_id',
            in: 'query',
            description: 'ID de la organización',
            schema: { type: 'string', format: 'uuid' }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Búsqueda por nombre o email',
            schema: { type: 'string' }
          },
          {
            name: 'page',
            in: 'query',
            description: 'Número de página',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Límite de resultados por página',
            schema: { type: 'integer', default: 50 }
          }
        ],
        responses: {
          '200': {
            description: 'Lista de clientes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Customer' }
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                    error: { type: 'null' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Usuario no autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'Sin permisos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Customers'],
        summary: 'Crear cliente',
        description: 'Crea un nuevo cliente',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  address: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  zip_code: { type: 'string' },
                  country: { type: 'string' },
                  tax_id: { type: 'string' },
                  notes: { type: 'string' }
                },
                required: ['name', 'email']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Cliente creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Customer' },
                    error: { type: 'null' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Datos inválidos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '401': {
            description: 'Usuario no autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'Sin permisos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    // Reports endpoints
    '/api/reports/dashboard': {
      get: {
        tags: ['Reports'],
        summary: 'Métricas del dashboard',
        description: 'Obtiene métricas principales del dashboard',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'organization_id',
            in: 'query',
            description: 'ID de la organización',
            schema: { type: 'string', format: 'uuid' }
          },
          {
            name: 'period',
            in: 'query',
            description: 'Período de análisis',
            schema: { 
              type: 'string', 
              enum: ['today', 'week', 'month', 'quarter', 'year'],
              default: 'month'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Métricas del dashboard',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        overview: {
                          type: 'object',
                          properties: {
                            total_customers: { type: 'integer' },
                            total_vehicles: { type: 'integer' },
                            quotations_this_period: { type: 'integer' },
                            active_orders: { type: 'integer' },
                            pending_invoices: { type: 'integer' },
                            monthly_revenue: { type: 'number' },
                            low_stock_products: { type: 'integer' }
                          }
                        },
                        performance: {
                          type: 'object',
                          properties: {
                            converted_quotations: { type: 'integer' },
                            completed_orders: { type: 'integer' },
                            conversion_rate: { type: 'string' }
                          }
                        },
                        alerts: {
                          type: 'object',
                          properties: {
                            low_stock_products: { type: 'array', items: { type: 'object' } },
                            pending_invoices_count: { type: 'integer' }
                          }
                        }
                      }
                    },
                    error: { type: 'null' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Usuario no autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'Sin permisos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    // Notifications endpoints
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Listar notificaciones',
        description: 'Obtiene lista de notificaciones con filtros',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'organization_id',
            in: 'query',
            description: 'ID de la organización',
            schema: { type: 'string', format: 'uuid' }
          },
          {
            name: 'type',
            in: 'query',
            description: 'Tipo de notificación',
            schema: { 
              type: 'string', 
              enum: ['low_stock', 'invoice_overdue', 'quotation_approved', 'order_completed', 'payment_received', 'supplier_order_received', 'system_alert', 'user_activity']
            }
          },
          {
            name: 'priority',
            in: 'query',
            description: 'Prioridad de la notificación',
            schema: { 
              type: 'string', 
              enum: ['low', 'medium', 'high', 'urgent']
            }
          },
          {
            name: 'is_read',
            in: 'query',
            description: 'Filtrar por estado de lectura',
            schema: { type: 'boolean' }
          }
        ],
        responses: {
          '200': {
            description: 'Lista de notificaciones',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Notification' }
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                    error: { type: 'null' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Usuario no autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'Sin permisos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    },
    // Backups endpoints
    '/api/backups': {
      get: {
        tags: ['Backups'],
        summary: 'Listar backups',
        description: 'Obtiene lista de backups con filtros',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'organization_id',
            in: 'query',
            description: 'ID de la organización',
            schema: { type: 'string', format: 'uuid' }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Estado del backup',
            schema: { 
              type: 'string', 
              enum: ['completed', 'failed', 'in_progress']
            }
          },
          {
            name: 'date_from',
            in: 'query',
            description: 'Fecha desde',
            schema: { type: 'string', format: 'date' }
          },
          {
            name: 'date_to',
            in: 'query',
            description: 'Fecha hasta',
            schema: { type: 'string', format: 'date' }
          }
        ],
        responses: {
          '200': {
            description: 'Lista de backups',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Backup' }
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                    error: { type: 'null' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Usuario no autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'Sin permisos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      },
      post: {
        tags: ['Backups'],
        summary: 'Crear backup',
        description: 'Crea un nuevo backup de la base de datos',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'organization_id',
            in: 'query',
            description: 'ID de la organización',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '201': {
            description: 'Backup creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Backup' },
                    error: { type: 'null' }
                  }
                }
              }
            }
          },
          '401': {
            description: 'Usuario no autenticado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          },
          '403': {
            description: 'Sin permisos',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' }
              }
            }
          }
        }
      }
    }
  }
}

