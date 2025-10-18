import { createClient } from '@/lib/supabase/client'

export interface FinancialReport {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  revenueGrowth: number
  expenseGrowth: number
  profitMargin: number
}

export interface SalesReport {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  topServices: Array<{
    name: string
    count: number
    revenue: number
  }>
  salesByEmployee: Array<{
    employee_name: string
    sales_count: number
    total_revenue: number
  }>
}

export interface InventoryReport {
  totalProducts: number
  lowStockProducts: number
  totalValue: number
  categories: Array<{
    name: string
    count: number
    value: number
  }>
  lowStockItems: Array<{
    name: string
    current_stock: number
    min_stock: number
    category: string
  }>
}

export async function getFinancialReport(startDate?: string, endDate?: string): Promise<FinancialReport> {
  const supabase = createClient()
  
  try {
    // Get revenue from invoices
    const { data: invoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('total, status')
      .eq('status', 'paid')
      .gte('paid_date', startDate || '2024-01-01')
      .lte('paid_date', endDate || new Date().toISOString())

    // Get expenses from purchase orders
    const { data: expenses, error: expenseError } = await supabase
      .from('purchase_orders')
      .select('total, status')
      .eq('status', 'received')
      .gte('created_at', startDate || '2024-01-01')
      .lte('created_at', endDate || new Date().toISOString())

    if (invoiceError || expenseError) {
      console.error('Error fetching financial data:', invoiceError || expenseError)
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        revenueGrowth: 0,
        expenseGrowth: 0,
        profitMargin: 0
      }
    }

    const totalRevenue = invoices?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0
    const totalExpenses = expenses?.reduce((sum, expense) => sum + (expense.total || 0), 0) || 0
    const netProfit = totalRevenue - totalExpenses
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      revenueGrowth: 5.2, // TODO: Calculate actual growth
      expenseGrowth: 3.1, // TODO: Calculate actual growth
      profitMargin
    }
  } catch (error) {
    console.error('Error fetching financial report:', error)
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      revenueGrowth: 0,
      expenseGrowth: 0,
      profitMargin: 0
    }
  }
}

export async function getSalesReport(startDate?: string, endDate?: string): Promise<SalesReport> {
  const supabase = createClient()
  
  try {
    // Get orders data
    const { data: orders, error: ordersError } = await supabase
      .from('work_orders')
      .select(`
        id,
        total,
        status,
        created_at,
        employees!inner(name)
      `)
      .eq('status', 'completed')
      .gte('created_at', startDate || '2024-01-01')
      .lte('created_at', endDate || new Date().toISOString())

    if (ordersError) {
      console.error('Error fetching sales data:', ordersError)
      return {
        totalSales: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        topServices: [],
        salesByEmployee: []
      }
    }

    const totalSales = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const totalOrders = orders?.length || 0
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0

    // Group by employee
    const employeeSales = orders?.reduce((acc, order) => {
      const employeeName = order.employees?.name || 'Sin asignar'
      if (!acc[employeeName]) {
        acc[employeeName] = { sales_count: 0, total_revenue: 0 }
      }
      acc[employeeName].sales_count++
      acc[employeeName].total_revenue += order.total || 0
      return acc
    }, {} as Record<string, { sales_count: number; total_revenue: number }>) || {}

    const salesByEmployee = Object.entries(employeeSales).map(([name, data]) => ({
      employee_name: name,
      sales_count: data.sales_count,
      total_revenue: data.total_revenue
    }))

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      topServices: [
        { name: 'Cambio de aceite', count: 15, revenue: 4500 },
        { name: 'Revisión general', count: 12, revenue: 3600 },
        { name: 'Reparación de frenos', count: 8, revenue: 2400 }
      ], // TODO: Get from actual data
      salesByEmployee
    }
  } catch (error) {
    console.error('Error fetching sales report:', error)
    return {
      totalSales: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      topServices: [],
      salesByEmployee: []
    }
  }
}

export async function getInventoryReport(): Promise<InventoryReport> {
  const supabase = createClient()
  
  try {
    // Get inventory data
    const { data: inventory, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        id,
        name,
        current_stock,
        min_stock,
        unit_price,
        category
      `)

    if (inventoryError) {
      console.error('Error fetching inventory data:', inventoryError)
      return {
        totalProducts: 0,
        lowStockProducts: 0,
        totalValue: 0,
        categories: [],
        lowStockItems: []
      }
    }

    const totalProducts = inventory?.length || 0
    const lowStockProducts = inventory?.filter(item => item.current_stock <= item.min_stock).length || 0
    const totalValue = inventory?.reduce((sum, item) => sum + (item.current_stock * item.unit_price), 0) || 0

    // Group by category
    const categoryData = inventory?.reduce((acc, item) => {
      const category = item.category || 'Sin categoría'
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 }
      }
      acc[category].count++
      acc[category].value += item.current_stock * item.unit_price
      return acc
    }, {} as Record<string, { count: number; value: number }>) || {}

    const categories = Object.entries(categoryData).map(([name, data]) => ({
      name,
      count: data.count,
      value: data.value
    }))

    const lowStockItems = inventory
      ?.filter(item => item.current_stock <= item.min_stock)
      ?.map(item => ({
        name: item.name,
        current_stock: item.current_stock,
        min_stock: item.min_stock,
        category: item.category || 'Sin categoría'
      })) || []

    return {
      totalProducts,
      lowStockProducts,
      totalValue,
      categories,
      lowStockItems
    }
  } catch (error) {
    console.error('Error fetching inventory report:', error)
    return {
      totalProducts: 0,
      lowStockProducts: 0,
      totalValue: 0,
      categories: [],
      lowStockItems: []
    }
  }
}

