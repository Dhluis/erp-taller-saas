/**
 * Servicio de Reportes
 * Funciones para generar reportes del sistema
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'

export interface FinancialReport {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  revenueByMonth: Array<{
    month: string
    revenue: number
  }>
  expensesByCategory: Array<{
    category: string
    amount: number
  }>
  topCustomers: Array<{
    name: string
    revenue: number
    orders: number
  }>
}

export interface InventoryReport {
  totalProducts: number
  lowStockItems: Array<{
    name: string
    currentStock: number
    minStock: number
  }>
  categories: Array<{
    name: string
    productCount: number
    totalValue: number
  }>
  recentMovements: Array<{
    product: string
    type: string
    quantity: number
    date: string
  }>
}

export interface SalesReport {
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  salesByMonth: Array<{
    month: string
    sales: number
    orders: number
  }>
  topServices: Array<{
    name: string
    sales: number
    orders: number
  }>
  salesByEmployee: Array<{
    name: string
    sales: number
    orders: number
  }>
}

/**
 * Obtener reporte financiero
 * @param organizationId - ID de la organización (obligatorio, el cliente browser no tiene contexto)
 * @param startDate - Fecha inicio (YYYY-MM-DD)
 * @param endDate - Fecha fin (YYYY-MM-DD)
 */
export async function getFinancialReport(
  organizationId: string,
  startDate?: string,
  endDate?: string
): Promise<FinancialReport> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      const end = endDate || new Date().toISOString().split('T')[0]
      const start = startDate || '2024-01-01'
      
      // Obtener ingresos - usar total y paid_date (columnas reales de invoices)
      const { data: revenueData } = await client
        .from('invoices')
        .select('total, paid_date')
        .eq('organization_id', organizationId)
        .eq('status', 'paid')
        .gte('paid_date', start)
        .lte('paid_date', end)
      
      const totalRevenue = revenueData?.reduce((sum, invoice) => sum + (invoice.total || 0), 0) || 0
      
      // Obtener gastos - purchase_orders usa total y order_date
      const { data: expensesData } = await client
        .from('purchase_orders')
        .select('total, order_date')
        .eq('organization_id', organizationId)
        .eq('status', 'received')
        .gte('order_date', start)
        .lte('order_date', end)
      
      const totalExpenses = expensesData?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
      const netProfit = totalRevenue - totalExpenses
      
      // Ingresos por mes - usar paid_date y total
      const revenueByMonth = revenueData?.reduce((acc: Record<string, number>, invoice: { paid_date?: string | null; total?: number | null }) => {
        const date = invoice.paid_date
        if (!date) return acc
        const month = new Date(date).toISOString().slice(0, 7)
        acc[month] = (acc[month] || 0) + (invoice.total || 0)
        return acc
      }, {}) || {}
      
      const revenueByMonthArray = Object.entries(revenueByMonth).map(([month, revenue]) => ({
        month,
        revenue: revenue as number
      }))
      
      // Gastos por categoría (simulado)
      const expensesByCategory = [
        { category: 'Inventario', amount: totalExpenses * 0.6 },
        { category: 'Servicios', amount: totalExpenses * 0.3 },
        { category: 'Otros', amount: totalExpenses * 0.1 }
      ]
      
      // Top clientes - usar total y paid_date
      const { data: topCustomersData } = await client
        .from('invoices')
        .select('total, paid_date, customers(name)')
        .eq('organization_id', organizationId)
        .eq('status', 'paid')
        .gte('paid_date', start)
        .lte('paid_date', end)
      
      const customerRevenue = topCustomersData?.reduce((acc: Record<string, { revenue: number; orders: number }>, invoice: { total?: number | null; customers?: { name?: string } | null }) => {
        const customerName = invoice.customers?.name || 'Cliente'
        if (!acc[customerName]) {
          acc[customerName] = { revenue: 0, orders: 0 }
        }
        acc[customerName].revenue += invoice.total || 0
        acc[customerName].orders += 1
        return acc
      }, {}) || {}
      
      const topCustomers = Object.entries(customerRevenue)
        .map(([name, data]: [string, any]) => ({
          name,
          revenue: data.revenue,
          orders: data.orders
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      return {
        totalRevenue,
        totalExpenses,
        netProfit,
        revenueByMonth: revenueByMonthArray,
        expensesByCategory,
        topCustomers
      }
    },
    {
      operation: 'getFinancialReport',
      table: 'reports'
    }
  )
}

/**
 * Obtener reporte de inventario
 */
export async function getInventoryReport(): Promise<InventoryReport> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Obtener productos
      const { data: products } = await client
        .from('products')
        .select('id, name, stock_quantity, min_stock, price')
      
      const totalProducts = products?.length || 0
      
      // Productos con stock bajo
      const lowStockItems = products?.filter(p => p.stock_quantity <= p.min_stock).map(p => ({
        name: p.name,
        currentStock: p.stock_quantity,
        minStock: p.min_stock
      })) || []
      
      // Categorías (simulado)
      const categories = [
        { name: 'Repuestos', productCount: Math.floor(totalProducts * 0.4), totalValue: 50000 },
        { name: 'Herramientas', productCount: Math.floor(totalProducts * 0.3), totalValue: 30000 },
        { name: 'Consumibles', productCount: Math.floor(totalProducts * 0.3), totalValue: 20000 }
      ]
      
      // Movimientos recientes
      const { data: movements } = await client
        .from('inventory_movements')
        .select('type, quantity, created_at, products(name)')
        .order('created_at', { ascending: false })
        .limit(10)
      
      const recentMovements = movements?.map(m => ({
        product: m.products?.name || 'Producto',
        type: m.type,
        quantity: m.quantity,
        date: m.created_at
      })) || []
      
      return {
        totalProducts,
        lowStockItems,
        categories,
        recentMovements
      }
    },
    {
      operation: 'getInventoryReport',
      table: 'reports'
    }
  )
}

/**
 * Obtener reporte de ventas
 */
export async function getSalesReport(startDate?: string, endDate?: string): Promise<SalesReport> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Obtener órdenes
      const { data: ordersData } = await client
        .from('work_orders')
        .select('total_amount, created_at, status, employees(name)')
        .eq('status', 'completed')
        .gte('created_at', startDate || '2024-01-01')
        .lte('created_at', endDate || new Date().toISOString())
      
      const totalSales = ordersData?.reduce((sum, order) => sum + order.total_amount, 0) || 0
      const totalOrders = ordersData?.length || 0
      const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0
      
      // Ventas por mes
      const salesByMonth = ordersData?.reduce((acc: any, order: any) => {
        const month = new Date(order.created_at).toISOString().slice(0, 7)
        if (!acc[month]) {
          acc[month] = { sales: 0, orders: 0 }
        }
        acc[month].sales += order.total_amount
        acc[month].orders += 1
        return acc
      }, {}) || {}
      
      const salesByMonthArray = Object.entries(salesByMonth).map(([month, data]: [string, any]) => ({
        month,
        sales: data.sales,
        orders: data.orders
      }))
      
      // Top servicios (simulado)
      const topServices = [
        { name: 'Reparación Motor', sales: totalSales * 0.3, orders: Math.floor(totalOrders * 0.2) },
        { name: 'Mantenimiento', sales: totalSales * 0.25, orders: Math.floor(totalOrders * 0.3) },
        { name: 'Diagnóstico', sales: totalSales * 0.2, orders: Math.floor(totalOrders * 0.4) },
        { name: 'Otros', sales: totalSales * 0.25, orders: Math.floor(totalOrders * 0.1) }
      ]
      
      // Ventas por empleado
      const salesByEmployee = ordersData?.reduce((acc: any, order: any) => {
        const employeeName = order.employees?.name || 'Empleado'
        if (!acc[employeeName]) {
          acc[employeeName] = { sales: 0, orders: 0 }
        }
        acc[employeeName].sales += order.total_amount
        acc[employeeName].orders += 1
        return acc
      }, {}) || {}
      
      const salesByEmployeeArray = Object.entries(salesByEmployee).map(([name, data]: [string, any]) => ({
        name,
        sales: data.sales,
        orders: data.orders
      }))
      
      return {
        totalSales,
        totalOrders,
        averageOrderValue,
        salesByMonth: salesByMonthArray,
        topServices,
        salesByEmployee: salesByEmployeeArray
      }
    },
    {
      operation: 'getSalesReport',
      table: 'reports'
    }
  )
}







