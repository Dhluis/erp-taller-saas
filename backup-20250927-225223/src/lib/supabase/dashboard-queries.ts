// lib/supabase/dashboard-queries.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getDashboardMetrics(startDate?: Date, endDate?: Date) {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  
  // Usar fechas personalizadas o del mes actual
  const start = startDate || firstDayOfMonth
  const end = endDate || lastDayOfMonth

  // Métricas de Órdenes
  const ordersMetrics = await getOrdersMetrics(start, end)
  
  // Métricas de Ingresos
  const revenueMetrics = await getRevenueMetrics(start, end)
  
  // Clientes Activos
  const activeClients = await getActiveClients()
  
  // Vehículos en Taller
  const vehiclesInShop = await getVehiclesInShop()
  
  // Items con Bajo Stock
  const lowStockItems = await getLowStockItems()
  
  // Órdenes Recientes
  const recentOrders = await getRecentOrders()
  
  // Datos del Gráfico de Ingresos
  const revenueChart = await getRevenueChartData()

  // NUEVAS MÉTRICAS
  // Empleados Activos
  const activeEmployees = await getActiveEmployees()
  
  // Servicios Más Populares
  const popularServices = await getPopularServices()
  
  // Cotizaciones del Mes
  const quotationsMetrics = await getQuotationsMetrics(start, end)
  
  // Eficiencia del Taller
  const efficiencyMetrics = await getEfficiencyMetrics()
  
  // Límites de Uso (SaaS)
  const usageLimits = await getUsageLimits()

  return {
    ...ordersMetrics,
    ...revenueMetrics,
    activeClients,
    vehiclesInShop,
    lowStockItems,
    recentOrders,
    revenueChart,
    // Nuevas métricas
    activeEmployees,
    popularServices,
    ...quotationsMetrics,
    ...efficiencyMetrics,
    ...usageLimits
  }
}

// Métricas de Órdenes (usa work_orders y estados del Kanban)
async function getOrdersMetrics(startDate: Date, endDate: Date) {
  const { data: ordersMonth } = await supabase
    .from('work_orders')
    .select('id')
    .gte('entry_date', startDate.toISOString())
    .lte('entry_date', endDate.toISOString())

  const { data: ordersPending } = await supabase
    .from('work_orders')
    .select('id')
    .eq('status', 'reception')

  const inProgressStatuses = ['diagnostic', 'approval', 'repair', 'parts', 'quality', 'delivery']
  const { data: ordersInProgress } = await supabase
    .from('work_orders')
    .select('id')
    .in('status', inProgressStatuses)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: ordersCompletedToday } = await supabase
    .from('work_orders')
    .select('id')
    .eq('status', 'completed')
    .gte('completed_at', today.toISOString())
    .lt('completed_at', tomorrow.toISOString())

  return {
    ordersMonth: ordersMonth?.length || 0,
    ordersPending: ordersPending?.length || 0,
    ordersInProgress: ordersInProgress?.length || 0,
    ordersCompletedToday: ordersCompletedToday?.length || 0
  }
}

// Métricas de Ingresos (suma order_items.total para órdenes completadas)
async function getRevenueMetrics(startDate: Date, endDate: Date) {
  const { data: completedOrders } = await supabase
    .from('work_orders')
    .select('id')
    .in('status', ['completed', 'delivery'])
    .gte('entry_date', startDate.toISOString())
    .lte('entry_date', endDate.toISOString())

  const orderIds = (completedOrders || []).map(o => o.id)

  let revenueMonth = 0
  if (orderIds.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('total, order_id')
      .in('order_id', orderIds)
    revenueMonth = items?.reduce((sum, it) => sum + (it.total || 0), 0) || 0
  }

  // Calcular el cambio porcentual vs mes anterior
  const prevMonthStart = new Date(startDate)
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1)
  const prevMonthEnd = new Date(endDate)
  prevMonthEnd.setMonth(prevMonthEnd.getMonth() - 1)

  const { data: prevCompletedOrders } = await supabase
    .from('work_orders')
    .select('id')
    .in('status', ['completed', 'delivery'])
    .gte('entry_date', prevMonthStart.toISOString())
    .lte('entry_date', prevMonthEnd.toISOString())

  const prevIds = (prevCompletedOrders || []).map(o => o.id)
  let prevRevenue = 0
  if (prevIds.length > 0) {
    const { data: prevItems } = await supabase
      .from('order_items')
      .select('total, order_id')
      .in('order_id', prevIds)
    prevRevenue = prevItems?.reduce((sum, it) => sum + (it.total || 0), 0) || 0
  }

  const revenueChange = prevRevenue > 0 ? ((revenueMonth - prevRevenue) / prevRevenue * 100).toFixed(1) : '0'

  return { revenueMonth, revenueChange }
}

// Clientes Activos (con órdenes en los últimos 30 días)
async function getActiveClients() {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data } = await supabase
    .from('work_orders')
    .select('customer_id')
    .gte('entry_date', thirtyDaysAgo.toISOString())

  const uniqueClients = new Set(data?.map(order => order.customer_id))
  return uniqueClients.size
}

// Vehículos actualmente en el taller
async function getVehiclesInShop() {
  const inShopStatuses = ['reception', 'diagnostic', 'approval', 'repair', 'parts', 'quality', 'delivery']
  const { data } = await supabase
    .from('work_orders')
    .select('vehicle_id')
    .in('status', inShopStatuses)

  const uniqueVehicles = new Set(data?.map(order => order.vehicle_id))
  return uniqueVehicles.size
}

// Items con stock bajo (menos de 10 unidades)
async function getLowStockItems() {
  const { data } = await supabase
    .from('inventory')
    .select('id')
    .lt('quantity', 10)

  return data?.length || 0
}

// Órdenes recientes con información completa
async function getRecentOrders() {
  const { data } = await supabase
    .from('work_orders')
    .select(`
      id,
      status,
      entry_date,
      customers (
        name,
        email
      ),
      vehicles (
        brand,
        model,
        year
      )
    `)
    .order('entry_date', { ascending: false })
    .limit(5)

  // Para monto, sumar items por orden (simplificado: 2a consulta)
  const orders = data || []
  const ids = orders.map(o => o.id)
  const totalsByOrder = new Map<string, number>()
  if (ids.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, total')
      .in('order_id', ids)
    items?.forEach(it => {
      totalsByOrder.set(it.order_id as unknown as string, (totalsByOrder.get(it.order_id as unknown as string) || 0) + (it.total || 0))
    })
  }

  return orders.map((order: any) => ({
    id: order.id,
    customer: order.customers?.name || 'Sin cliente',
    vehicle: `${order.vehicles?.brand ?? ''} ${order.vehicles?.model ?? ''} ${order.vehicles?.year ?? ''}`.trim(),
    status: order.status,
    amount: totalsByOrder.get(order.id) || 0,
    date: order.entry_date
  }))
}

// Datos para el gráfico de ingresos (últimos 6 meses)
async function getRevenueChartData() {
  const months = []
  const today = new Date()
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
    // Órdenes completadas en el mes
    const { data: monthOrders } = await supabase
      .from('work_orders')
      .select('id')
      .in('status', ['completed', 'delivery'])
      .gte('entry_date', date.toISOString())
      .lt('entry_date', nextMonth.toISOString())

    const monthIds = (monthOrders || []).map(o => o.id)
    let total = 0
    if (monthIds.length > 0) {
      const { data: monthItems } = await supabase
        .from('order_items')
        .select('total, order_id')
        .in('order_id', monthIds)
      total = monthItems?.reduce((sum, it) => sum + (it.total || 0), 0) || 0
    }
    
    months.push({
      month: date.toLocaleDateString('es-MX', { month: 'short' }),
      total
    })
  }
  
  return months
}

// =============================================
// NUEVAS FUNCIONES DE MÉTRICAS
// =============================================

// Empleados activos en el taller
async function getActiveEmployees() {
  const { data } = await supabase
    .from('employees')
    .select('id, name, role, specialties')
    .eq('is_active', true)
    .order('name')

  return data || []
}

// Servicios más populares (por cantidad de órdenes)
async function getPopularServices() {
  const { data } = await supabase
    .from('order_items')
    .select(`
      service_id,
      services (
        name,
        category,
        base_price
      )
    `)
    .not('service_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 30 días

  // Agrupar por servicio y contar
  const serviceCounts = new Map()
  data?.forEach(item => {
    if (item.service_id && item.services) {
      const serviceId = item.service_id
      const current = serviceCounts.get(serviceId) || { count: 0, service: item.services }
      serviceCounts.set(serviceId, { ...current, count: current.count + 1 })
    }
  })

  // Convertir a array y ordenar por popularidad
  return Array.from(serviceCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5) // Top 5
}

// Métricas de cotizaciones
async function getQuotationsMetrics(startDate: Date, endDate: Date) {
  const { data: quotationsMonth } = await supabase
    .from('quotations')
    .select('id, status, total')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const { data: approvedQuotations } = await supabase
    .from('quotations')
    .select('id, total')
    .eq('status', 'approved')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const { data: convertedQuotations } = await supabase
    .from('quotations')
    .select('id, total')
    .eq('converted_to_order', true)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const totalQuotations = quotationsMonth?.length || 0
  const approvedCount = approvedQuotations?.length || 0
  const convertedCount = convertedQuotations?.length || 0
  const conversionRate = totalQuotations > 0 ? ((convertedCount / totalQuotations) * 100).toFixed(1) : '0'
  
  const totalQuotationValue = quotationsMonth?.reduce((sum, q) => sum + (q.total || 0), 0) || 0
  const approvedValue = approvedQuotations?.reduce((sum, q) => sum + (q.total || 0), 0) || 0

  return {
    quotationsMonth: totalQuotations,
    quotationsApproved: approvedCount,
    quotationsConverted: convertedCount,
    conversionRate,
    totalQuotationValue,
    approvedQuotationValue: approvedValue
  }
}

// Métricas de eficiencia del taller
async function getEfficiencyMetrics() {
  // Tiempo promedio de completado de órdenes
  const { data: completedOrders } = await supabase
    .from('work_orders')
    .select('entry_date, completed_at')
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .gte('entry_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  let avgCompletionTime = 0
  if (completedOrders && completedOrders.length > 0) {
    const totalHours = completedOrders.reduce((sum, order) => {
      const entry = new Date(order.entry_date)
      const completed = new Date(order.completed_at)
      const diffHours = (completed.getTime() - entry.getTime()) / (1000 * 60 * 60)
      return sum + diffHours
    }, 0)
    avgCompletionTime = totalHours / completedOrders.length
  }

  // Empleados más productivos (por horas trabajadas)
  const { data: employeeStats } = await supabase
    .from('order_items')
    .select(`
      mechanic_id,
      employees (
        name,
        role
      )
    `)
    .not('mechanic_id', 'is', null)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const employeeCounts = new Map()
  employeeStats?.forEach(item => {
    if (item.mechanic_id && item.employees) {
      const current = employeeCounts.get(item.mechanic_id) || { count: 0, employee: item.employees }
      employeeCounts.set(item.mechanic_id, { ...current, count: current.count + 1 })
    }
  })

  const topPerformers = Array.from(employeeCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  return {
    avgCompletionTime: Math.round(avgCompletionTime * 10) / 10, // Redondear a 1 decimal
    topPerformers
  }
}

// Límites de uso del plan SaaS
async function getUsageLimits() {
  const { data: usageData } = await supabase
    .from('usage_tracking')
    .select('metric_type, current_usage, limit_value')
    .gte('period_start', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24 horas

  const limits = {
    orders: { current: 0, limit: 100, percentage: 0 },
    clients: { current: 0, limit: 50, percentage: 0 },
    users: { current: 0, limit: 3, percentage: 0 },
    storage: { current: 0, limit: 1000, percentage: 0 },
    api_calls: { current: 0, limit: 10000, percentage: 0 }
  }

  usageData?.forEach(item => {
    const percentage = item.limit_value > 0 ? (item.current_usage / item.limit_value) * 100 : 0
    limits[item.metric_type as keyof typeof limits] = {
      current: item.current_usage,
      limit: item.limit_value,
      percentage: Math.round(percentage * 10) / 10
    }
  })

  return limits
}

// Función para obtener métricas en tiempo real (WebSocket)
export function subscribeToOrderUpdates(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('work_orders-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'work_orders' },
      callback
    )
    .subscribe()

  return subscription
}

// Función para suscribirse a cambios en cotizaciones
export function subscribeToQuotationUpdates(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('quotations-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'quotations' },
      callback
    )
    .subscribe()

  return subscription
}

// Función para suscribirse a cambios en empleados
export function subscribeToEmployeeUpdates(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('employees-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'employees' },
      callback
    )
    .subscribe()

  return subscription
}


