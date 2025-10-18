/**
 * Servicio de Métricas
 * Funciones para obtener métricas del dashboard
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'

export interface MetricsData {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  totalProducts: number
  ordersByStatus: Array<{
    status: string
    count: number
    percentage: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
  }>
  topProducts: Array<{
    name: string
    sales: number
    revenue: number
  }>
  recentOrders: Array<{
    id: string
    customer: string
    amount: number
    status: string
    date: string
  }>
}

/**
 * Obtener métricas del dashboard
 */
export async function getMetricsData(): Promise<MetricsData> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Obtener métricas básicas
      const [ordersResult, customersResult, productsResult] = await Promise.all([
        client.from('work_orders').select('*', { count: 'exact', head: true }),
        client.from('customers').select('*', { count: 'exact', head: true }),
        client.from('products').select('*', { count: 'exact', head: true })
      ])
      
      const totalOrders = ordersResult.count || 0
      const totalCustomers = customersResult.count || 0
      const totalProducts = productsResult.count || 0
      
      // Obtener órdenes por estado
      const { data: ordersByStatus } = await client
        .from('work_orders')
        .select('status')
      
      const statusCounts = ordersByStatus?.reduce((acc: any, order: any) => {
        acc[order.status] = (acc[order.status] || 0) + 1
        return acc
      }, {}) || {}
      
      const ordersByStatusArray = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count: count as number,
        percentage: totalOrders > 0 ? ((count as number) / totalOrders) * 100 : 0
      }))
      
      // Obtener ingresos por mes (últimos 6 meses)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
      
      const { data: revenueData } = await client
        .from('invoices')
        .select('total_amount, issue_date')
        .gte('issue_date', sixMonthsAgo.toISOString())
        .eq('status', 'paid')
      
      const revenueByMonth = revenueData?.reduce((acc: any, invoice: any) => {
        const month = new Date(invoice.issue_date).toISOString().slice(0, 7)
        acc[month] = (acc[month] || 0) + invoice.total_amount
        return acc
      }, {}) || {}
      
      const revenueByMonthArray = Object.entries(revenueByMonth).map(([month, revenue]) => ({
        month,
        revenue: revenue as number
      }))
      
      // Obtener productos más vendidos
      const { data: topProductsData } = await client
        .from('invoice_items')
        .select('product_id, quantity, total_price, products(name)')
        .limit(10)
      
      const topProducts = topProductsData?.reduce((acc: any, item: any) => {
        const productName = item.products?.name || 'Producto'
        if (!acc[productName]) {
          acc[productName] = { name: productName, sales: 0, revenue: 0 }
        }
        acc[productName].sales += item.quantity
        acc[productName].revenue += item.total_price
        return acc
      }, {}) || {}
      
      const topProductsArray = Object.values(topProducts).slice(0, 5)
      
      // Obtener órdenes recientes
      const { data: recentOrders } = await client
        .from('work_orders')
        .select('id, status, total_amount, created_at, customers(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      
      const recentOrdersArray = recentOrders?.map((order: any) => ({
        id: order.id,
        customer: order.customers?.name || 'Cliente',
        amount: order.total_amount,
        status: order.status,
        date: order.created_at
      })) || []
      
      const totalRevenue = revenueByMonthArray.reduce((sum, item) => sum + item.revenue, 0)
      
      return {
        totalOrders,
        totalRevenue,
        totalCustomers,
        totalProducts,
        ordersByStatus: ordersByStatusArray,
        revenueByMonth: revenueByMonthArray,
        topProducts: topProductsArray as any[],
        recentOrders: recentOrdersArray
      }
    },
    {
      operation: 'getMetricsData',
      table: 'metrics'
    }
  )
}

/**
 * Obtener métricas en tiempo real
 */
export async function getRealtimeMetrics(): Promise<Partial<MetricsData>> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Obtener métricas básicas en tiempo real
      const [ordersResult, customersResult] = await Promise.all([
        client.from('work_orders').select('*', { count: 'exact', head: true }),
        client.from('customers').select('*', { count: 'exact', head: true })
      ])
      
      return {
        totalOrders: ordersResult.count || 0,
        totalCustomers: customersResult.count || 0
      }
    },
    {
      operation: 'getRealtimeMetrics',
      table: 'metrics'
    }
  )
}







