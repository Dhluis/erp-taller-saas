import { NextResponse } from 'next/server'

/**
 * @swagger
 * /api/kpis/info:
 *   get:
 *     summary: Información del sistema de KPIs
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Información del sistema de KPIs obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: Mensaje de confirmación
 *                     system:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         version:
 *                           type: string
 *                         status:
 *                           type: string
 *                     features:
 *                       type: object
 *                       properties:
 *                         kpi_types:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                               endpoint:
 *                                 type: string
 *                         capabilities:
 *                           type: array
 *                           items:
 *                             type: string
 *                     endpoints:
 *                       type: object
 *                       properties:
 *                         protected:
 *                           type: array
 *                           items:
 *                             type: string
 *                         total_endpoints:
 *                           type: integer
 *                     authentication:
 *                       type: object
 *                       properties:
 *                         required:
 *                           type: boolean
 *                         method:
 *                           type: string
 *                         permissions:
 *                           type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 error:
 *                   type: null
 */
export async function GET() {
  try {
    const kpiTypes = [
      {
        type: 'dashboard_kpis',
        description: 'KPIs principales del dashboard (órdenes, ingresos, clientes activos, stock bajo)',
        endpoint: 'GET /api/kpis/dashboard'
      },
      {
        type: 'sales_chart',
        description: 'Gráfico de ventas por día (últimos 30 días)',
        endpoint: 'GET /api/kpis/sales-chart'
      },
      {
        type: 'orders_by_status',
        description: 'Distribución de órdenes por estado',
        endpoint: 'GET /api/kpis/orders-status'
      },
      {
        type: 'top_customers',
        description: 'Top clientes por gasto total',
        endpoint: 'GET /api/kpis/top-customers'
      },
      {
        type: 'top_products',
        description: 'Top productos por ingresos',
        endpoint: 'GET /api/kpis/top-products'
      },
      {
        type: 'low_stock_items',
        description: 'Productos con stock bajo o agotado',
        endpoint: 'GET /api/kpis/low-stock'
      },
      {
        type: 'performance_metrics',
        description: 'Métricas de rendimiento del taller',
        endpoint: 'GET /api/kpis/performance'
      }
    ]

    const totalEndpoints = kpiTypes.length + 1 // +1 para este endpoint de info

    return NextResponse.json({
      data: {
        message: 'Sistema de KPIs y métricas implementado exitosamente',
        system: {
          name: 'ERP KPIs System',
          version: '1.0.0',
          status: 'active'
        },
        features: {
          kpi_types: kpiTypes,
          capabilities: [
            'Métricas en tiempo real',
            'Análisis de tendencias',
            'Indicadores de rendimiento',
            'Alertas de stock bajo',
            'Análisis de clientes',
            'Métricas de productividad',
            'Reportes automáticos',
            'Dashboard interactivo'
          ]
        },
        endpoints: {
          protected: [
            'GET /api/kpis/dashboard - KPIs principales',
            'GET /api/kpis/sales-chart - Gráfico de ventas',
            'GET /api/kpis/orders-status - Órdenes por estado',
            'GET /api/kpis/top-customers - Top clientes',
            'GET /api/kpis/top-products - Top productos',
            'GET /api/kpis/low-stock - Productos con stock bajo',
            'GET /api/kpis/performance - Métricas de rendimiento'
          ],
          public: [
            'GET /api/kpis/info - Información del sistema'
          ],
          total_endpoints: totalEndpoints
        },
        authentication: {
          required: true,
          method: 'Bearer Token (Supabase Auth)',
          permissions: {
            read: 'Ver KPIs y métricas',
            create: 'Crear reportes personalizados',
            update: 'Actualizar métricas',
            delete: 'Eliminar reportes'
          }
        },
        metrics: {
          dashboard_kpis: {
            orders: 'Órdenes del mes actual vs anterior',
            revenue: 'Ingresos del mes actual vs anterior',
            active_customers: 'Clientes activos este mes',
            low_stock_items: 'Productos con stock bajo'
          },
          sales_chart: {
            period: 'Últimos 30 días',
            data_points: 'Ventas por día',
            categories: ['Total', 'Completadas', 'Pendientes']
          },
          performance: {
            avg_completion_time: 'Tiempo promedio de completado (días)',
            completion_rate: 'Tasa de completado (%)',
            pending_orders: 'Órdenes pendientes',
            completed_orders: 'Órdenes completadas'
          }
        },
        data_sources: {
          primary_tables: [
            'work_orders',
            'customers',
            'products',
            'invoices',
            'quotations'
          ],
          aggregation_methods: [
            'COUNT para conteos',
            'SUM para totales',
            'AVG para promedios',
            'GROUP BY para agrupaciones',
            'DATE_TRUNC para agrupación temporal'
          ]
        },
        timestamp: new Date().toISOString()
      },
      error: null
    })
  } catch (error: any) {
    console.error('Error in GET /api/kpis/info:', error)
    return NextResponse.json(
      { data: null, error: error.message || 'Error al obtener información del sistema de KPIs' },
      { status: error.statusCode || 500 }
    )
  }
}

