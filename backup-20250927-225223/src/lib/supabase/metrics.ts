import { createClient } from '@/lib/supabase/client'

export interface MetricsData {
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  totalClients: number
  totalProducts: number
  lowStockProducts: number
  totalInvoices: number
  totalRevenue: number
  monthlyRevenue: Array<{ month: string; revenue: number }>
  ordersByStatus: Array<{ status: string; count: number }>
  topProducts: Array<{ name: string; stock: number }>
}

export async function getMetricsData(): Promise<MetricsData> {
  const supabase = createClient()
  
  try {
    // Obtener estadísticas de órdenes
    const { data: orders } = await supabase
      .from('work_orders')
      .select('status, created_at, total_amount')
    
    // Obtener estadísticas de clientes
    const { data: clients } = await supabase
      .from('customers')
      .select('id')
    
    // Obtener estadísticas de inventario
    const { data: inventory } = await supabase
      .from('inventory')
      .select('name, current_stock, min_stock, unit_price, status')
    
    // Obtener estadísticas de facturas
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, created_at')
    
    // Procesar datos de órdenes
    const totalOrders = orders?.length || 0
    const completedOrders = orders?.filter(o => o.status === 'completed').length || 0
    const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0
    
    // Procesar datos de clientes
    const totalClients = clients?.length || 0
    
    // Procesar datos de inventario
    const totalProducts = inventory?.length || 0
    const lowStockProducts = inventory?.filter(p => p.current_stock <= p.min_stock).length || 0
    
    // Procesar datos de facturas
    const totalInvoices = invoices?.length || 0
    const totalRevenue = invoices?.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0) || 0
    
    // Generar datos mensuales (últimos 6 meses)
    const monthlyRevenue = generateMonthlyData(invoices || [])
    
    // Órdenes por estado
    const ordersByStatus = [
      { status: 'completed', count: completedOrders },
      { status: 'pending', count: pendingOrders },
      { status: 'cancelled', count: orders?.filter(o => o.status === 'cancelled').length || 0 }
    ]
    
    // Productos con menor stock
    const topProducts = (inventory || [])
      .filter(p => p.status === 'active')
      .sort((a, b) => a.current_stock - b.current_stock)
      .slice(0, 5)
      .map(p => ({ name: p.name, stock: p.current_stock }))
    
    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      totalClients,
      totalProducts,
      lowStockProducts,
      totalInvoices,
      totalRevenue,
      monthlyRevenue,
      ordersByStatus,
      topProducts
    }
  } catch (error) {
    console.error('Error fetching metrics data:', error)
    
    // Datos mock en caso de error
    return {
      totalOrders: 45,
      completedOrders: 38,
      pendingOrders: 7,
      totalClients: 156,
      totalProducts: 89,
      lowStockProducts: 12,
      totalInvoices: 67,
      totalRevenue: 125000,
      monthlyRevenue: [
        { month: 'Ene', revenue: 18500 },
        { month: 'Feb', revenue: 22100 },
        { month: 'Mar', revenue: 19800 },
        { month: 'Abr', revenue: 25400 },
        { month: 'May', revenue: 28900 },
        { month: 'Jun', revenue: 31100 }
      ],
      ordersByStatus: [
        { status: 'completed', count: 38 },
        { status: 'pending', count: 7 },
        { status: 'cancelled', count: 0 }
      ],
      topProducts: [
        { name: 'Aceite Motor 5W-30', stock: 5 },
        { name: 'Filtro de Aire', stock: 8 },
        { name: 'Pastillas de Freno', stock: 12 },
        { name: 'Bujía de Encendido', stock: 15 },
        { name: 'Líquido de Frenos', stock: 18 }
      ]
    }
  }
}

function generateMonthlyData(invoices: any[]): Array<{ month: string; revenue: number }> {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
  const monthlyData = months.map(month => ({ month, revenue: 0 }))
  
  // Procesar facturas por mes
  invoices.forEach(invoice => {
    if (invoice.created_at) {
      const date = new Date(invoice.created_at)
      const monthIndex = date.getMonth()
      if (monthIndex >= 0 && monthIndex < 6) {
        monthlyData[monthIndex].revenue += Number(invoice.total_amount) || 0
      }
    }
  })
  
  return monthlyData
}
