import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

function getSupabaseClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) =>
          cookieStore.set(name, value, options),
        remove: (name: string, options: any) =>
          cookieStore.set(name, '', options)
      }
    }
  )
}

/**
 * ============================================
 * KPIs PRINCIPALES DEL DASHBOARD
 * ============================================
 * Métricas clave para el dashboard del ERP
 */

export async function getDashboardKPIs(organizationId: string) {
  try {
    const supabase = getSupabaseClient()
    const today = new Date()
    const startOfThisMonth = startOfMonth(today)
    const startOfLastMonth = startOfMonth(subMonths(today, 1))

    console.log('Obteniendo KPIs del dashboard', { organizationId })

    // Total de órdenes de trabajo del mes actual
    const { count: ordersThisMonth, error: ordersError } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfThisMonth.toISOString())

    if (ordersError) {
      throw new Error(`Error al obtener órdenes del mes actual: ${ordersError.message}`)
    }

    // Total de órdenes del mes pasado
    const { count: ordersLastMonth, error: ordersLastError } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfThisMonth.toISOString())

    if (ordersLastError) {
      throw new Error(`Error al obtener órdenes del mes pasado: ${ordersLastError.message}`)
    }

    // Ingresos del mes actual (órdenes completadas)
    const { data: revenueData, error: revenueError } = await supabase
      .from('work_orders')
      .select('total_amount')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('created_at', startOfThisMonth.toISOString())

    if (revenueError) {
      throw new Error(`Error al obtener ingresos del mes actual: ${revenueError.message}`)
    }

    const revenueThisMonth = revenueData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

    // Ingresos del mes pasado
    const { data: revenueLastMonthData, error: revenueLastError } = await supabase
      .from('work_orders')
      .select('total_amount')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('created_at', startOfLastMonth.toISOString())
      .lt('created_at', startOfThisMonth.toISOString())

    if (revenueLastError) {
      throw new Error(`Error al obtener ingresos del mes pasado: ${revenueLastError.message}`)
    }

    const revenueLastMonth = revenueLastMonthData?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0

    // Clientes activos (con órdenes este mes)
    const { count: activeCustomers, error: customersError } = await supabase
      .from('work_orders')
      .select('customer_id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfThisMonth.toISOString())

    if (customersError) {
      throw new Error(`Error al obtener clientes activos: ${customersError.message}`)
    }

    // Productos con stock bajo
    const { count: lowStockItems, error: stockError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .lt('stock_quantity', supabase.raw('min_stock'))

    if (stockError) {
      throw new Error(`Error al obtener productos con stock bajo: ${stockError.message}`)
    }

    const result = {
      orders: {
        current: ordersThisMonth || 0,
        previous: ordersLastMonth || 0,
        percentageChange: ordersLastMonth 
          ? ((ordersThisMonth! - ordersLastMonth) / ordersLastMonth) * 100 
          : 0
      },
      revenue: {
        current: revenueThisMonth,
        previous: revenueLastMonth,
        percentageChange: revenueLastMonth 
          ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
          : 0
      },
      activeCustomers: activeCustomers || 0,
      lowStockItems: lowStockItems || 0
    }

    console.log('KPIs del dashboard obtenidos exitosamente', { organizationId, result })
    return result
  } catch (error: any) {
    console.error('Error en getDashboardKPIs:', error)
    throw error
  }
}

/**
 * ============================================
 * VENTAS POR DÍA (ÚLTIMOS 30 DÍAS)
 * ============================================
 */

export async function getSalesChart(organizationId: string, days: number = 30) {
  try {
    const supabase = getSupabaseClient()
    const startDate = subMonths(new Date(), 1)

    console.log('Obteniendo gráfico de ventas', { organizationId, days })

    const { data, error } = await supabase
      .from('work_orders')
      .select('created_at, total_amount, status')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Error al obtener datos de ventas: ${error.message}`)
    }

    // Agrupar por día
    const salesByDay = data.reduce((acc, order) => {
      const date = format(new Date(order.created_at), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = { date, total: 0, completed: 0, pending: 0 }
      }
      acc[date].total += order.total_amount || 0
      if (order.status === 'completed') {
        acc[date].completed += order.total_amount || 0
      } else {
        acc[date].pending += order.total_amount || 0
      }
      return acc
    }, {} as Record<string, { date: string; total: number; completed: number; pending: number }>)

    const result = Object.values(salesByDay)
    console.log('Gráfico de ventas obtenido exitosamente', { organizationId, dataPoints: result.length })
    return result
  } catch (error: any) {
    console.error('Error en getSalesChart:', error)
    throw error
  }
}

/**
 * ============================================
 * ÓRDENES POR ESTADO
 * ============================================
 */

export async function getOrdersByStatus(organizationId: string) {
  try {
    const supabase = getSupabaseClient()

    console.log('Obteniendo órdenes por estado', { organizationId })

    const { data, error } = await supabase
      .from('work_orders')
      .select('status')
      .eq('organization_id', organizationId)

    if (error) {
      throw new Error(`Error al obtener órdenes por estado: ${error.message}`)
    }

    const statusCount = data.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const result = Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
      label: getStatusLabel(status)
    }))

    console.log('Órdenes por estado obtenidas exitosamente', { organizationId, statuses: result.length })
    return result
  } catch (error: any) {
    console.error('Error en getOrdersByStatus:', error)
    throw error
  }
}

/**
 * ============================================
 * TOP CLIENTES
 * ============================================
 */

export async function getTopCustomers(organizationId: string, limit: number = 10) {
  try {
    const supabase = getSupabaseClient()

    console.log('Obteniendo top clientes', { organizationId, limit })

    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        customer_id,
        total_amount,
        customers (
          id,
          name,
          email
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')

    if (error) {
      throw new Error(`Error al obtener top clientes: ${error.message}`)
    }

    // Agrupar por cliente y sumar
    const customerTotals = data.reduce((acc, order) => {
      const customerId = order.customer_id
      if (!acc[customerId]) {
        acc[customerId] = {
          customer: order.customers,
          totalSpent: 0,
          ordersCount: 0
        }
      }
      acc[customerId].totalSpent += order.total_amount || 0
      acc[customerId].ordersCount += 1
      return acc
    }, {} as Record<string, any>)

    const result = Object.values(customerTotals)
      .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
      .slice(0, limit)

    console.log('Top clientes obtenidos exitosamente', { organizationId, count: result.length })
    return result
  } catch (error: any) {
    console.error('Error en getTopCustomers:', error)
    throw error
  }
}

/**
 * ============================================
 * TOP PRODUCTOS/SERVICIOS
 * ============================================
 */

export async function getTopProducts(organizationId: string, limit: number = 10) {
  try {
    const supabase = getSupabaseClient()

    console.log('Obteniendo top productos', { organizationId, limit })

    // Obtener productos más vendidos desde work_orders
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        total_amount,
        status,
        products (
          id,
          name,
          category
        )
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'completed')

    if (error) {
      throw new Error(`Error al obtener top productos: ${error.message}`)
    }

    // Agrupar por producto
    const productStats = data.reduce((acc, order) => {
      if (order.products) {
        const productId = order.products.id
        if (!acc[productId]) {
          acc[productId] = {
            product: order.products,
            totalRevenue: 0,
            ordersCount: 0
          }
        }
        acc[productId].totalRevenue += order.total_amount || 0
        acc[productId].ordersCount += 1
      }
      return acc
    }, {} as Record<string, any>)

    const result = Object.values(productStats)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, limit)

    console.log('Top productos obtenidos exitosamente', { organizationId, count: result.length })
    return result
  } catch (error: any) {
    console.error('Error en getTopProducts:', error)
    throw error
  }
}

/**
 * ============================================
 * INVENTARIO CRÍTICO
 * ============================================
 */

export async function getLowStockItems(organizationId: string) {
  try {
    const supabase = getSupabaseClient()

    console.log('Obteniendo productos con stock bajo', { organizationId })

    const { data, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        code,
        stock_quantity,
        min_stock,
        price,
        category
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .lt('stock_quantity', supabase.raw('min_stock'))
      .order('stock_quantity', { ascending: true })

    if (error) {
      throw new Error(`Error al obtener productos con stock bajo: ${error.message}`)
    }

    const result = data.map(item => ({
      ...item,
      deficit: item.min_stock - item.stock_quantity,
      status: item.stock_quantity === 0 ? 'out_of_stock' : 'low_stock'
    }))

    console.log('Productos con stock bajo obtenidos exitosamente', { organizationId, count: result.length })
    return result
  } catch (error: any) {
    console.error('Error en getLowStockItems:', error)
    throw error
  }
}

/**
 * ============================================
 * MÉTRICAS DE RENDIMIENTO
 * ============================================
 */

export async function getPerformanceMetrics(organizationId: string) {
  try {
    const supabase = getSupabaseClient()
    const today = new Date()
    const startOfThisMonth = startOfMonth(today)

    console.log('Obteniendo métricas de rendimiento', { organizationId })

    // Tiempo promedio de completado de órdenes
    const { data: completedOrders, error: ordersError } = await supabase
      .from('work_orders')
      .select('created_at, completed_at')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('created_at', startOfThisMonth.toISOString())
      .not('completed_at', 'is', null)

    if (ordersError) {
      throw new Error(`Error al obtener órdenes completadas: ${ordersError.message}`)
    }

    const avgCompletionTime = completedOrders.length > 0 
      ? completedOrders.reduce((sum, order) => {
          const created = new Date(order.created_at)
          const completed = new Date(order.completed_at!)
          return sum + (completed.getTime() - created.getTime())
        }, 0) / completedOrders.length / (1000 * 60 * 60 * 24) // en días
      : 0

    // Tasa de completado
    const { count: totalOrders, error: totalError } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfThisMonth.toISOString())

    if (totalError) {
      throw new Error(`Error al obtener total de órdenes: ${totalError.message}`)
    }

    const completionRate = totalOrders ? (completedOrders.length / totalOrders) * 100 : 0

    // Órdenes pendientes
    const { count: pendingOrders, error: pendingError } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'in_progress'])

    if (pendingError) {
      throw new Error(`Error al obtener órdenes pendientes: ${pendingError.message}`)
    }

    const result = {
      avgCompletionTime: Math.round(avgCompletionTime * 10) / 10, // redondear a 1 decimal
      completionRate: Math.round(completionRate * 10) / 10,
      pendingOrders: pendingOrders || 0,
      completedOrders: completedOrders.length,
      totalOrders: totalOrders || 0
    }

    console.log('Métricas de rendimiento obtenidas exitosamente', { organizationId, result })
    return result
  } catch (error: any) {
    console.error('Error en getPerformanceMetrics:', error)
    throw error
  }
}

/**
 * ============================================
 * HELPERS
 * ============================================
 */

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'pending': 'Pendiente',
    'in_progress': 'En Progreso',
    'completed': 'Completado',
    'cancelled': 'Cancelado'
  }
  return labels[status] || status
}