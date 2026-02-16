import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * QUERIES PARA REPORTES Y MÉTRICAS
 * =====================================================
 * Sistema completo de reportes y métricas del ERP
 * usando todas las tablas existentes
 */

export type ReportPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

/**
 * Obtener métricas del dashboard principal
 */
export async function getDashboardMetrics(
  organizationId: string,
  period: ReportPeriod = 'month'
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const now = new Date()
    
    // Calcular fechas según el período
    let startDate: string
    let endDate: string = now.toISOString().split('T')[0]
    
    switch (period) {
      case 'today':
        startDate = endDate
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        startDate = weekAgo.toISOString().split('T')[0]
        break
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
        startDate = monthAgo.toISOString().split('T')[0]
        break
      case 'quarter':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        startDate = quarterAgo.toISOString().split('T')[0]
        break
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        startDate = yearAgo.toISOString().split('T')[0]
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split('T')[0]
    }

    // 1. Total clientes
    const { count: totalCustomers } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // 2. Vehículos registrados
    const { count: totalVehicles } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', supabase.from('customers').select('id').eq('organization_id', organizationId))

    // 3. Cotizaciones del período
    const { count: quotationsCount } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    // 4. Órdenes activas
    const { count: activeOrders } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'in_progress'])

    // 5. Facturas pendientes
    const { count: pendingInvoices } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'sent', 'overdue'])

    // 6. Ingresos del período
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('total')
      .eq('organization_id', organizationId)
      .eq('status', 'paid')
      .gte('paid_date', startDate)
      .lte('paid_date', endDate)

    const monthlyRevenue = invoicesData?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0

    // 7. Productos con stock bajo
    const { data: allProducts } = await supabase
      .from('products')
      .select('id, name, stock_quantity, min_stock')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    const lowStockProducts = allProducts?.filter(product => 
      product.stock_quantity <= product.min_stock
    ) || []

    // 8. Cotizaciones convertidas
    const { count: convertedQuotations } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'converted')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    // 9. Órdenes completadas
    const { count: completedOrders } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('completed_at', startDate)
      .lte('completed_at', endDate)

    return {
      overview: {
        total_customers: totalCustomers || 0,
        total_vehicles: totalVehicles || 0,
        quotations_this_period: quotationsCount || 0,
        active_orders: activeOrders || 0,
        pending_invoices: pendingInvoices || 0,
        monthly_revenue: monthlyRevenue,
        low_stock_products: lowStockProducts?.length || 0
      },
      performance: {
        converted_quotations: convertedQuotations || 0,
        completed_orders: completedOrders || 0,
        conversion_rate: quotationsCount > 0 ? ((convertedQuotations || 0) / quotationsCount * 100).toFixed(1) : '0.0'
      },
      alerts: {
        low_stock_products: lowStockProducts || [],
        pending_invoices_count: pendingInvoices || 0
      },
      period: {
        start_date: startDate,
        end_date: endDate,
        type: period
      }
    }
  }, { operation: 'getDashboardMetrics', table: 'multiple' })
}

/**
 * Obtener reporte de ventas por período
 */
export async function getSalesReport(
  organizationId: string,
  startDate: string,
  endDate: string
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Total ventas del período
    const { data: invoicesData } = await supabase
      .from('invoices')
      .select('total, created_at, status')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const totalSales = invoicesData?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0
    const paidSales = invoicesData?.filter(inv => inv.status === 'paid').reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0

    // 2. Servicios más vendidos - usar work_order_services (order_items/services no existe o difiere)
    const { data: servicesData } = await supabase
      .from('work_order_services')
      .select('name, quantity, total_price')
      .eq('organization_id', organizationId)
      .in('line_type', ['package', 'free_service'])
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const servicesMap = new Map<string, number>()
    servicesData?.forEach(item => {
      const serviceName = item.name || 'Servicio'
      const current = servicesMap.get(serviceName) || 0
      servicesMap.set(serviceName, current + (item.quantity || 0))
    })

    const topServices = Array.from(servicesMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // 3. Productos más vendidos - work_order_services con line_type loose_product
    const { data: productsData } = await supabase
      .from('work_order_services')
      .select('name, quantity, total_price')
      .eq('organization_id', organizationId)
      .eq('line_type', 'loose_product')
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const productsMap = new Map<string, number>()
    productsData?.forEach(item => {
      const productName = item.name || 'Producto'
      const current = productsMap.get(productName) || 0
      productsMap.set(productName, current + (item.quantity || 0))
    })

    const topProducts = Array.from(productsMap.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)

    // 4. Clientes frecuentes
    const { data: customersData } = await supabase
      .from('work_orders')
      .select(`
        customer_id,
        customers!inner(name)
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)

    const customersMap = new Map()
    customersData?.forEach(order => {
      const customerName = order.customers?.name || 'Cliente'
      const current = customersMap.get(customerName) || 0
      customersMap.set(customerName, current + 1)
    })

    const frequentCustomers = Array.from(customersMap.entries())
      .map(([name, orders]) => ({ name, orders }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10)

    // 5. Promedio de ticket
    const totalInvoices = invoicesData?.length || 0
    const averageTicket = totalInvoices > 0 ? totalSales / totalInvoices : 0

    // 6. Ventas por día (últimos 30 días)
    const dailySales = new Map()
    invoicesData?.forEach(invoice => {
      const date = invoice.created_at.split('T')[0]
      const current = dailySales.get(date) || 0
      dailySales.set(date, current + (invoice.total || 0))
    })

    const dailySalesArray = Array.from(dailySales.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      summary: {
        total_sales: totalSales,
        paid_sales: paidSales,
        pending_sales: totalSales - paidSales,
        total_invoices: totalInvoices,
        average_ticket: averageTicket
      },
      top_services: topServices,
      top_products: topProducts,
      frequent_customers: frequentCustomers,
      daily_sales: dailySalesArray,
      period: {
        start_date: startDate,
        end_date: endDate
      }
    }
  }, { operation: 'getSalesReport', table: 'multiple' })
}

/**
 * Obtener reporte de inventario
 * Usa tabla 'inventory' (no products)
 */
export async function getInventoryReport(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Obtener inventario (tabla inventory)
    const { data: inventoryData } = await supabase
      .from('inventory')
      .select('id, name, code, sku, category, unit, current_stock, min_stock, max_stock, unit_price, status')
      .eq('organization_id', organizationId)
      .neq('status', 'inactive')

    const allItems = inventoryData || []
    const totalValue = allItems.reduce((sum, item) =>
      sum + ((item.current_stock || 0) * (item.unit_price || 0)), 0)
    const totalCost = 0 // no existe columna cost en inventory

    const lowStockProducts = allItems.filter(item =>
      (item.current_stock || 0) <= (item.min_stock ?? 0)
    ).map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      current_stock: item.current_stock ?? 0,
      min_stock: item.min_stock ?? 0,
      category: item.category
    }))

    const overStockProducts = allItems.filter(item =>
      (item.max_stock ?? 0) > 0 && (item.current_stock || 0) >= (item.max_stock ?? 0)
    ).map(item => ({
      id: item.id,
      name: item.name,
      code: item.code,
      current_stock: item.current_stock ?? 0,
      max_stock: item.max_stock ?? 0,
      category: item.category
    }))

    // 2. Movimientos recientes (inventory_movements con FK inventory_id)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]

    const { data: recentMovementsRaw } = await supabase
      .from('inventory_movements')
      .select(`
        id,
        movement_type,
        quantity,
        reference,
        notes,
        created_at,
        inventory!inventory_id(name, code)
      `)
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })
      .limit(50)

    const recentMovements = (recentMovementsRaw || []).map((m: { inventory?: { name?: string; code?: string } }) => ({
      ...m,
      inventory: m.inventory || { name: '-', code: '-' }
    }))

    // 3. Categorías agrupadas por category de inventory
    const categoriesMap = new Map<string, { count: number; value: number }>()
    allItems.forEach(item => {
      const category = item.category || 'Sin categoría'
      const current = categoriesMap.get(category) || { count: 0, value: 0 }
      categoriesMap.set(category, {
        count: current.count + 1,
        value: current.value + ((item.current_stock || 0) * (item.unit_price || 0))
      })
    })

    const categoriesBreakdown = Array.from(categoriesMap.entries())
      .map(([category, data]) => ({ category, count: data.count, value: data.value }))
      .sort((a, b) => b.value - a.value)

    // 4. Estadísticas
    const totalProducts = allItems.length
    const totalStock = allItems.reduce((sum, item) => sum + (item.current_stock || 0), 0)
    const lowStockCount = lowStockProducts.length
    const overStockCount = overStockProducts.length

    return {
      summary: {
        total_products: totalProducts,
        total_stock_units: totalStock,
        total_value: totalValue,
        total_cost: totalCost,
        profit_margin: totalValue > 0 ? ((totalValue - totalCost) / totalValue * 100).toFixed(1) : '0.0',
        low_stock_count: lowStockCount,
        over_stock_count: overStockCount
      },
      low_stock_products: lowStockProducts,
      over_stock_products: overStockProducts,
      recent_movements,
      categories_breakdown: categoriesBreakdown,
      alerts: {
        low_stock_alerts: lowStockCount,
        over_stock_alerts: overStockCount
      }
    }
  }, { operation: 'getInventoryReport', table: 'multiple' })
}

/**
 * Obtener reporte de clientes
 */
export async function getCustomersReport(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Total clientes
    const { data: customersData } = await supabase
      .from('customers')
      .select(`
        id,
        name,
        email,
        phone,
        created_at,
        work_orders!inner(id, total_amount, status, completed_at)
      `)
      .eq('organization_id', organizationId)

    // 2. Clientes con más órdenes
    const customersWithOrders = customersData?.map(customer => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      total_orders: customer.work_orders?.length || 0,
      total_spent: customer.work_orders?.reduce((sum, order) => 
        sum + (order.total_amount || 0), 0) || 0,
      completed_orders: customer.work_orders?.filter(order => order.status === 'completed').length || 0,
      last_order_date: customer.work_orders?.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]?.created_at
    })).sort((a, b) => b.total_spent - a.total_spent)

    // 3. Clientes nuevos (últimos 30 días)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]

    const newCustomers = customersData?.filter(customer => 
      customer.created_at >= startDate
    ).length || 0

    // 4. Clientes inactivos (sin órdenes en 90 días)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const inactiveDate = ninetyDaysAgo.toISOString().split('T')[0]

    const inactiveCustomers = customersData?.filter(customer => {
      const lastOrder = customer.work_orders?.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
      return !lastOrder || lastOrder.created_at < inactiveDate
    }).length || 0

    return {
      summary: {
        total_customers: customersData?.length || 0,
        new_customers: newCustomers,
        inactive_customers: inactiveCustomers,
        active_customers: (customersData?.length || 0) - inactiveCustomers
      },
      top_customers: customersWithOrders?.slice(0, 10) || [],
      all_customers: customersWithOrders || []
    }
  }, { operation: 'getCustomersReport', table: 'multiple' })
}

/**
 * Obtener reporte de proveedores
 */
export async function getSuppliersReport(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // 1. Total proveedores
    const { data: suppliersData } = await supabase
      .from('suppliers')
      .select(`
        id,
        name,
        contact_person,
        email,
        phone,
        is_active,
        created_at,
        purchase_orders!inner(id, total, status, order_date)
      `)
      .eq('organization_id', organizationId)

    // 2. Proveedores con más compras
    const suppliersWithOrders = suppliersData?.map(supplier => ({
      id: supplier.id,
      name: supplier.name,
      contact_person: supplier.contact_person,
      email: supplier.email,
      phone: supplier.phone,
      is_active: supplier.is_active,
      total_orders: supplier.purchase_orders?.length || 0,
      total_spent: supplier.purchase_orders?.reduce((sum, order) => 
        sum + (order.total || 0), 0) || 0,
      pending_orders: supplier.purchase_orders?.filter(order => 
        order.status === 'pending').length || 0,
      last_order_date: supplier.purchase_orders?.sort((a, b) => 
        new Date(b.order_date).getTime() - new Date(a.order_date).getTime())[0]?.order_date
    })).sort((a, b) => b.total_spent - a.total_spent)

    // 3. Proveedores activos vs inactivos
    const activeSuppliers = suppliersData?.filter(s => s.is_active).length || 0
    const inactiveSuppliers = suppliersData?.filter(s => !s.is_active).length || 0

    return {
      summary: {
        total_suppliers: suppliersData?.length || 0,
        active_suppliers: activeSuppliers,
        inactive_suppliers: inactiveSuppliers
      },
      top_suppliers: suppliersWithOrders?.slice(0, 10) || [],
      all_suppliers: suppliersWithOrders || []
    }
  }, { operation: 'getSuppliersReport', table: 'multiple' })
}

/**
 * Obtener métricas de rendimiento
 */
export async function getPerformanceMetrics(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    // 1. Tiempo promedio de completar órdenes
    const { data: completedOrders } = await supabase
      .from('work_orders')
      .select('created_at, completed_at')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('completed_at', startOfMonth)

    const avgCompletionTime = completedOrders?.length > 0 ? 
      completedOrders.reduce((sum, order) => {
        const created = new Date(order.created_at)
        const completed = new Date(order.completed_at)
        return sum + (completed.getTime() - created.getTime())
      }, 0) / completedOrders.length / (1000 * 60 * 60 * 24) : 0 // en días

    // 2. Tasa de conversión de cotizaciones
    const { count: totalQuotations } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfMonth)

    const { count: convertedQuotations } = await supabase
      .from('quotations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'converted')
      .gte('created_at', startOfMonth)

    const conversionRate = totalQuotations > 0 ? 
      (convertedQuotations / totalQuotations * 100) : 0

    // 3. Satisfacción del cliente (basado en órdenes completadas)
    const { count: completedOrdersCount } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('completed_at', startOfMonth)

    const { count: totalOrders } = await supabase
      .from('work_orders')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', startOfMonth)

    const completionRate = totalOrders > 0 ? 
      (completedOrdersCount / totalOrders * 100) : 0

    return {
      performance: {
        avg_completion_time_days: avgCompletionTime.toFixed(1),
        quotation_conversion_rate: conversionRate.toFixed(1),
        order_completion_rate: completionRate.toFixed(1)
      },
      targets: {
        avg_completion_time_target: 7, // días
        conversion_rate_target: 30, // %
        completion_rate_target: 85 // %
      }
    }
  }, { operation: 'getPerformanceMetrics', table: 'multiple' })
}
