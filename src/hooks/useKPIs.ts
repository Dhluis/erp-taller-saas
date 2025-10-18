'use client'

import { useState, useEffect } from 'react'

interface KPIData {
  orders: {
    current: number
    previous: number
    percentageChange: number
  }
  revenue: {
    current: number
    previous: number
    percentageChange: number
  }
  activeCustomers: number
  lowStockItems: number
}

interface SalesChartData {
  date: string
  total: number
  completed: number
  pending: number
}

interface OrdersByStatus {
  status: string
  count: number
  label: string
}

interface TopCustomer {
  customer: {
    id: string
    name: string
    email: string
  }
  totalSpent: number
  ordersCount: number
}

interface TopProduct {
  name: string
  totalSold: number
  revenue: number
}

interface LowStockItem {
  id: string
  name: string
  sku: string
  quantity: number
  minimum_stock: number
  unit_price: number
  deficit: number
  status: 'out_of_stock' | 'low_stock'
  inventory_categories: {
    name: string
  } | null
}

interface PerformanceMetrics {
  averageOrderValue: number
  customerRetentionRate: number
  orderCompletionRate: number
  inventoryTurnover: number
  profitMargin: number
  responseTime: number
}

export function useKPIs() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dashboard KPIs
  const [dashboardKPIs, setDashboardKPIs] = useState<KPIData | null>(null)
  
  // Sales Chart Data
  const [salesChart, setSalesChart] = useState<SalesChartData[]>([])
  
  // Orders by Status
  const [ordersByStatus, setOrdersByStatus] = useState<OrdersByStatus[]>([])
  
  // Top Customers
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  
  // Top Products
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  
  // Low Stock Items
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  
  // Performance Metrics
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null)

  // Fetch Dashboard KPIs
  const fetchDashboardKPIs = async (organizationId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/kpis/dashboard?organizationId=${organizationId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar KPIs del dashboard')
      }
      
      const data = await response.json()
      setDashboardKPIs(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching dashboard KPIs:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Sales Chart Data
  const fetchSalesChart = async (organizationId: string, days: number = 30) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/kpis/sales-chart?organizationId=${organizationId}&days=${days}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar datos de ventas')
      }
      
      const data = await response.json()
      setSalesChart(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching sales chart:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Orders by Status
  const fetchOrdersByStatus = async (organizationId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/kpis/orders-status?organizationId=${organizationId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar órdenes por estado')
      }
      
      const data = await response.json()
      setOrdersByStatus(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching orders by status:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Top Customers
  const fetchTopCustomers = async (organizationId: string, limit: number = 10) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/kpis/top-customers?organizationId=${organizationId}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar top clientes')
      }
      
      const data = await response.json()
      setTopCustomers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching top customers:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Top Products
  const fetchTopProducts = async (organizationId: string, limit: number = 10) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/kpis/top-products?organizationId=${organizationId}&limit=${limit}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar top productos')
      }
      
      const data = await response.json()
      setTopProducts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching top products:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Low Stock Items
  const fetchLowStockItems = async (organizationId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/kpis/low-stock?organizationId=${organizationId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar productos con stock bajo')
      }
      
      const data = await response.json()
      setLowStockItems(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching low stock items:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Performance Metrics
  const fetchPerformanceMetrics = async (organizationId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/kpis/performance?organizationId=${organizationId}`)
      
      if (!response.ok) {
        throw new Error('Error al cargar métricas de rendimiento')
      }
      
      const data = await response.json()
      setPerformanceMetrics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching performance metrics:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fetch All KPIs
  const fetchAllKPIs = async (organizationId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      await Promise.all([
        fetchDashboardKPIs(organizationId),
        fetchSalesChart(organizationId),
        fetchOrdersByStatus(organizationId),
        fetchTopCustomers(organizationId),
        fetchTopProducts(organizationId),
        fetchLowStockItems(organizationId),
        fetchPerformanceMetrics(organizationId)
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      console.error('Error fetching all KPIs:', err)
    } finally {
      setLoading(false)
    }
  }

  // Reset all data
  const resetKPIs = () => {
    setDashboardKPIs(null)
    setSalesChart([])
    setOrdersByStatus([])
    setTopCustomers([])
    setTopProducts([])
    setLowStockItems([])
    setPerformanceMetrics(null)
    setError(null)
    setLoading(false)
  }

  return {
    // State
    loading,
    error,
    dashboardKPIs,
    salesChart,
    ordersByStatus,
    topCustomers,
    topProducts,
    lowStockItems,
    performanceMetrics,
    
    // Actions
    fetchDashboardKPIs,
    fetchSalesChart,
    fetchOrdersByStatus,
    fetchTopCustomers,
    fetchTopProducts,
    fetchLowStockItems,
    fetchPerformanceMetrics,
    fetchAllKPIs,
    resetKPIs
  }
}

