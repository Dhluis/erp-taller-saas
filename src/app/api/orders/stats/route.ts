import { getSupabaseServerClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getOrganizationId } from '@/lib/auth/organization-server'

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

    // Manejar caso "all" - sin filtro de fecha
    let shouldFilterByDate = true
    if (timeFilter === 'all') {
      shouldFilterByDate = false
      console.log('📅 Filtro: TODAS las órdenes (sin filtro de fecha)')
    } else {
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
    }

    console.log('📅 Rango de fechas:', {
      from: fromDate.toISOString(),
      to: toDate.toISOString()
    })

    // Crear cliente de Supabase y obtener organization_id
    const supabase = await getSupabaseServerClient()
    
    // ✅ USAR HELPER CENTRALIZADO - igual que el Kanban
    const requestedOrganizationId = searchParams.get('organizationId')
    const organizationIdToUse = requestedOrganizationId || await getOrganizationId(request)
    
    console.log('✅ Organization ID usado:', organizationIdToUse)

    const fromISO = fromDate.toISOString()
    const toISO = toDate.toISOString()

    // Consultar órdenes por estado para la organización específica
    // Primero obtener todas las órdenes de la organización (sin filtro de fecha en la query)
    // Luego filtrar en JavaScript para mayor flexibilidad
    const { data: orders, error: ordersError } = await supabase
      .from('work_orders')
      .select('status, created_at, entry_date')
      .eq('organization_id', organizationIdToUse)

    // ✅ LOGS DETALLADOS PARA DIAGNÓSTICO
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔌 API /orders/stats - QUERY EJECUTADA');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Organization ID:', organizationIdToUse);
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

    // Filtrar órdenes por rango de fechas en JavaScript (solo si no es "all")
    // Una orden se incluye si su created_at O entry_date está en el rango
    let ordersList: Array<{
      status: string | null;
      created_at: string | null;
      entry_date: string | null;
    }>
    
    if (!shouldFilterByDate) {
      // Sin filtro de fecha - retornar todas las órdenes
      ordersList = (orders ?? []) as Array<{
        status: string | null;
        created_at: string | null;
        entry_date: string | null;
      }>
    } else {
      // Filtrar por rango de fechas
      // Normalizar fechas de rango una sola vez
      const fromDateNormalized = new Date(fromDate)
      fromDateNormalized.setHours(0, 0, 0, 0)
      const toDateNormalized = new Date(toDate)
      toDateNormalized.setHours(23, 59, 59, 999)
      
      ordersList = ((orders ?? []) as Array<{
        status: string | null;
        created_at: string | null;
        entry_date: string | null;
      }>).filter((order) => {
        // Si no tiene ninguna fecha, excluir
        if (!order.created_at && !order.entry_date) {
          return false
        }

        // Verificar created_at - comparar solo la fecha (sin horas)
        if (order.created_at) {
          const createdAt = new Date(order.created_at)
          // Normalizar a inicio del día para comparación
          const orderDate = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate())
          const fromDateOnly = new Date(fromDateNormalized.getFullYear(), fromDateNormalized.getMonth(), fromDateNormalized.getDate())
          const toDateOnly = new Date(toDateNormalized.getFullYear(), toDateNormalized.getMonth(), toDateNormalized.getDate())
          
          if (orderDate >= fromDateOnly && orderDate <= toDateOnly) {
            return true
          }
        }

        // Verificar entry_date - comparar solo la fecha (sin horas)
        if (order.entry_date) {
          const entryDate = new Date(order.entry_date)
          // Normalizar a inicio del día para comparación
          const orderDate = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate())
          const fromDateOnly = new Date(fromDateNormalized.getFullYear(), fromDateNormalized.getMonth(), fromDateNormalized.getDate())
          const toDateOnly = new Date(toDateNormalized.getFullYear(), toDateNormalized.getMonth(), toDateNormalized.getDate())
          
          if (orderDate >= fromDateOnly && orderDate <= toDateOnly) {
            return true
          }
        }

        return false
      })
    }

    console.log('✅ Total órdenes en BD (sin filtro de fecha):', orders?.length || 0);
    console.log('✅ Órdenes después de filtrar por fecha:', ordersList.length || 0);
    
    if (orders && orders.length > 0) {
      console.log('✅ Órdenes por estado (después de filtro):', ordersList.reduce((acc: any, o: any) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {}));
      
      // Log de muestra de órdenes para diagnóstico
      console.log('📋 Muestra de órdenes (primeras 5):', orders.slice(0, 5).map((o: any) => ({
        status: o.status,
        created_at: o.created_at ? new Date(o.created_at).toLocaleString('es-MX') : null,
        entry_date: o.entry_date ? new Date(o.entry_date).toLocaleString('es-MX') : null,
        inDateRange: (() => {
          if (o.created_at) {
            const created = new Date(o.created_at);
            created.setHours(0, 0, 0, 0);
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (created >= from && created <= to) return true;
          }
          if (o.entry_date) {
            const entry = new Date(o.entry_date);
            entry.setHours(0, 0, 0, 0);
            const from = new Date(fromDate);
            from.setHours(0, 0, 0, 0);
            const to = new Date(toDate);
            to.setHours(23, 59, 59, 999);
            if (entry >= from && entry <= to) return true;
          }
          return false;
        })()
      })));
    } else {
      console.warn('⚠️ No se encontraron órdenes en la BD para organization_id:', organizationIdToUse);
      console.warn('   Verifica que existan órdenes con este organization_id en la tabla work_orders');
    }
    
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
        totalOrdersInDB: orders?.length || 0,
        ordersAfterDateFilter: ordersList.length,
        firstOrderDate: ordersList[0]?.created_at,
        firstEntryDate: ordersList[0]?.entry_date,
        filterFrom: fromDate.toISOString(),
        filterTo: toDate.toISOString(),
        timeFilter: timeFilter,
        sampleOrders: orders?.slice(0, 3).map((o: any) => ({
          status: o.status,
          created_at: o.created_at,
          entry_date: o.entry_date
        })) || []
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