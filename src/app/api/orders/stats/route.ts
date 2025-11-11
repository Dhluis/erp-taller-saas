import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/orders/stats - Iniciando...')

    // Obtener parámetro de filtro de tiempo
    const { searchParams } = new URL(request.url)
    const timeFilter = searchParams.get('timeFilter') || '7d'
    const customFrom = searchParams.get('from')
    const customTo = searchParams.get('to')
    console.log('📅 Filtro de tiempo:', timeFilter)

    // Calcular rango de fechas según el filtro
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    let fromDate: Date
    let toDate: Date = today

    switch (timeFilter) {
      case '7d':
        fromDate = new Date(today)
        fromDate.setDate(today.getDate() - 7)
        fromDate.setHours(0, 0, 0, 0)
        break
      case '30d':
        fromDate = new Date(today)
        fromDate.setDate(today.getDate() - 30)
        fromDate.setHours(0, 0, 0, 0)
        break
      case 'current_month':
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
        break
      case 'custom':
        if (customFrom && customTo) {
          fromDate = new Date(customFrom)
          toDate = new Date(customTo)
          console.log('📅 Usando fechas personalizadas')
        } else {
          // Fallback a 7 días si no hay fechas custom
          fromDate = new Date(today)
          fromDate.setDate(today.getDate() - 7)
          fromDate.setHours(0, 0, 0, 0)
        }
        break
      default:
        fromDate = new Date(today)
        fromDate.setDate(today.getDate() - 7)
        fromDate.setHours(0, 0, 0, 0)
    }

    console.log('📅 Rango de fechas:', {
      from: fromDate.toISOString(),
      to: toDate.toISOString()
    })

    // Crear cliente de Supabase y obtener contexto
    const supabase = await createClient()
    const tenantContext = await getTenantContext()

    const requestedOrganizationId = searchParams.get('organizationId')

    const organizationIdToUse = requestedOrganizationId || tenantContext.organizationId
    
    console.log('✅ Usuario autenticado:', tenantContext.userId)
    console.log('✅ Tenant Context:', {
      organizationId: organizationIdToUse,
      workshopId: tenantContext.workshopId,
      userId: tenantContext.userId
    })

    // Consultar órdenes por estado para la organización específica con filtro de fecha
    const { data: orders, error: ordersError } = await supabase
      .from('work_orders')
      .select('status, created_at, entry_date')
      .eq('organization_id', tenantContext.organizationId)
      .gte('created_at', fromDate.toISOString())
      .lte('created_at', toDate.toISOString())

    // ✅ LOGS DETALLADOS PARA DIAGNÓSTICO
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 API /orders/stats - QUERY EJECUTADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Organization ID:', organizationIdToUse);
    console.log('Workshop ID:', tenantContext.workshopId);
    console.log('Filtro de tiempo:', timeFilter);
    console.log('Rango de fechas:', {
      from: fromDate.toISOString(),
      to: toDate.toISOString()
    });
    
    if (ordersError) {
      console.log('❌ Error al consultar órdenes:', ordersError)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return NextResponse.json({ 
        success: false,
        error: 'Error al consultar órdenes' 
      }, { status: 500 })
    }

    const ordersList = (orders ?? []) as Array<{
      status: string | null;
      created_at: string | null;
      entry_date: string | null;
    }>;

    console.log('✅ Órdenes encontradas:', ordersList.length || 0);
    console.log('✅ Órdenes por estado:', ordersList.reduce((acc: any, o: any) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {}));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Contar órdenes por estado
    const statusCounts: { [key: string]: number } = {}
    
    ordersList.forEach((order: any) => {
      const status = order.status
      if (status) {
        statusCounts[status] = (statusCounts[status] || 0) + 1
      }
    })

    console.log('📊 Conteo por estado:', statusCounts)

    // Mapear estados a nombres y colores para la gráfica
    // Usar los mismos estados que el Kanban
    const statusConfig = [
      { 
        dbStatus: 'reception', 
        name: 'Recepción', 
        color: '#6b7280' 
      },
      { 
        dbStatus: 'diagnosis', 
        name: 'Diagnóstico', 
        color: '#8b5cf6' 
      },
      { 
        dbStatus: 'initial_quote', 
        name: 'Cotización', 
        color: '#3b82f6' 
      },
      { 
        dbStatus: 'waiting_approval', 
        name: 'Esperando Aprobación', 
        color: '#f59e0b' 
      },
      { 
        dbStatus: 'disassembly', 
        name: 'Desarmado', 
        color: '#ec4899' 
      },
      { 
        dbStatus: 'waiting_parts', 
        name: 'Esperando Piezas', 
        color: '#f97316' 
      },
      { 
        dbStatus: 'assembly', 
        name: 'Armado', 
        color: '#06b6d4' 
      },
      { 
        dbStatus: 'testing', 
        name: 'Pruebas', 
        color: '#14b8a6' 
      },
      { 
        dbStatus: 'ready', 
        name: 'Listo', 
        color: '#84cc16' 
      },
      { 
        dbStatus: 'completed', 
        name: 'Completado', 
        color: '#10b981' 
      }
    ]

    // Crear array para la gráfica con nombres y colores
    const byStatus = statusConfig.map(config => ({
      name: config.name,
      value: statusCounts[config.dbStatus] || 0,
      color: config.color
    }))

    console.log('✅ Array formateado para gráfica:', byStatus)

    // Devolver en el formato que espera el dashboard (formato plano)
    return NextResponse.json({
      success: true,
      ...statusCounts,
      total: ordersList.length || 0,
      _debug: {
        organizationId: organizationIdToUse,
        ordersFound: ordersList.length,
        firstOrderDate: ordersList[0]?.created_at,
        filterFrom: fromDate.toISOString(),
        filterTo: toDate.toISOString(),
      },
    })

  } catch (error) {
    console.error('❌ Error en /api/orders/stats:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    )
  }
}