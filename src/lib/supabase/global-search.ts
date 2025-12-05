/**
 * Servicio de Búsqueda Global
 * Funciones para búsqueda global en toda la aplicación
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'

export interface SearchResult {
  id: string
  type: 'customer' | 'product' | 'order' | 'invoice' | 'supplier'
  title: string
  description: string
  url: string
  metadata?: Record<string, any>
}

/**
 * Búsqueda global en toda la aplicación
 * ✅ ACTUALIZADO: Ahora usa API route que filtra por organization_id
 */
export async function searchGlobal(query: string): Promise<SearchResult[]> {
  try {
    if (!query || query.length < 2) {
      return []
    }

    // ✅ Usar API route que filtra por organization_id
    const response = await fetch(`/api/search/global?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Error en búsqueda global:', response.statusText)
      return []
    }

    const result = await response.json()
    
    if (result.success && result.data) {
      return result.data
    }

    return []
  } catch (error) {
    console.error('Error en searchGlobal:', error)
    return []
  }
}

/**
 * @deprecated Esta función ya no se usa directamente, se usa la API route
 * Mantenida por compatibilidad
 */
export async function searchGlobalLegacy(query: string): Promise<SearchResult[]> {
  return executeWithErrorHandling(
    async () => {
      if (!query || query.length < 2) {
        return []
      }
      
      const client = getSupabaseClient()
      const results: SearchResult[] = []
      
      // ⚠️ DEPRECATED: Esta función NO filtra por organization_id
      // Buscar en clientes
      const { data: customers } = await client
        .from('customers')
        .select('id, name, email, phone')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5)
      
      customers?.forEach(customer => {
        results.push({
          id: customer.id,
          type: 'customer',
          title: customer.name,
          description: customer.email || customer.phone || 'Cliente',
          url: `/clientes/${customer.id}`,
          metadata: { email: customer.email, phone: customer.phone }
        })
      })
      
      // Buscar en productos
      const { data: products } = await client
        .from('products')
        .select('id, name, description, code')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%,code.ilike.%${query}%`)
        .limit(5)
      
      products?.forEach(product => {
        results.push({
          id: product.id,
          type: 'product',
          title: product.name,
          description: product.description || product.code || 'Producto',
          url: `/inventario/productos/${product.id}`,
          metadata: { code: product.code }
        })
      })
      
      // Buscar en órdenes
      const { data: orders } = await client
        .from('work_orders')
        .select('id, order_number, status, total_amount, customers(name)')
        .or(`order_number.ilike.%${query}%`)
        .limit(5)
      
      orders?.forEach(order => {
        results.push({
          id: order.id,
          type: 'order',
          title: `Orden ${order.order_number}`,
          description: `${order.customers?.name || 'Cliente'} - $${order.total_amount}`,
          url: `/ordenes/${order.id}`,
          metadata: { status: order.status, amount: order.total_amount }
        })
      })
      
      // Buscar en facturas
      const { data: invoices } = await client
        .from('invoices')
        .select('id, invoice_number, status, total_amount, customers(name)')
        .or(`invoice_number.ilike.%${query}%`)
        .limit(5)
      
      invoices?.forEach(invoice => {
        results.push({
          id: invoice.id,
          type: 'invoice',
          title: `Factura ${invoice.invoice_number}`,
          description: `${invoice.customers?.name || 'Cliente'} - $${invoice.total_amount}`,
          url: `/ingresos/facturacion/${invoice.id}`,
          metadata: { status: invoice.status, amount: invoice.total_amount }
        })
      })
      
      // Buscar en proveedores
      const { data: suppliers } = await client
        .from('suppliers')
        .select('id, name, email, phone')
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5)
      
      suppliers?.forEach(supplier => {
        results.push({
          id: supplier.id,
          type: 'supplier',
          title: supplier.name,
          description: supplier.email || supplier.phone || 'Proveedor',
          url: `/proveedores/${supplier.id}`,
          metadata: { email: supplier.email, phone: supplier.phone }
        })
      })
      
      return results
    },
    {
      operation: 'searchGlobal',
      table: 'search'
    }
  )
}

/**
 * Obtener sugerencias rápidas
 * ✅ ACTUALIZADO: Ahora filtra por organization_id usando API route
 */
export async function getQuickSuggestions(): Promise<SearchResult[]> {
  try {
    // ✅ Usar API route para obtener sugerencias filtradas por organización
    const response = await fetch('/api/search/suggestions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Error obteniendo sugerencias:', response.statusText)
      return []
    }

    const result = await response.json()
    
    if (result.success && result.data) {
      return result.data
    }

    return []
  } catch (error) {
    console.error('Error en getQuickSuggestions:', error)
    return []
  }
}

/**
 * @deprecated Esta función ya no se usa directamente, se usa la API route
 * Mantenida por compatibilidad
 */
export async function getQuickSuggestionsLegacy(): Promise<SearchResult[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      const suggestions: SearchResult[] = []
      
      // ⚠️ DEPRECATED: Esta función NO filtra por organization_id
      // Obtener clientes recientes
      const { data: recentCustomers } = await client
        .from('customers')
        .select('id, name, email')
        .order('created_at', { ascending: false })
        .limit(3)
      
      recentCustomers?.forEach(customer => {
        suggestions.push({
          id: customer.id,
          type: 'customer',
          title: customer.name,
          description: customer.email || 'Cliente',
          url: `/clientes/${customer.id}`
        })
      })
      
      // Obtener productos populares
      const { data: popularProducts } = await client
        .from('products')
        .select('id, name, code')
        .eq('is_active', true)
        .limit(3)
      
      popularProducts?.forEach(product => {
        suggestions.push({
          id: product.id,
          type: 'product',
          title: product.name,
          description: product.code || 'Producto',
          url: `/inventario/productos/${product.id}`
        })
      })
      
      return suggestions
    },
    {
      operation: 'getQuickSuggestions',
      table: 'search'
    }
  )
}

/**
 * Búsqueda por tipo específico
 * ✅ ACTUALIZADO: Ahora usa API route que filtra por organization_id
 */
export async function searchByType(type: SearchResult['type'], query: string): Promise<SearchResult[]> {
  try {
    if (!query || query.length < 2) {
      return []
    }

    // ✅ Usar API route que filtra por organization_id
    const response = await fetch(`/api/search/global?q=${encodeURIComponent(query)}&type=${type}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('Error en búsqueda por tipo:', response.statusText)
      return []
    }

    const result = await response.json()
    
    if (result.success && result.data) {
      // Filtrar por tipo si se especificó
      if (type) {
        return result.data.filter((item: SearchResult) => item.type === type)
      }
      return result.data
    }

    return []
  } catch (error) {
    console.error('Error en searchByType:', error)
    return []
  }
}

/**
 * @deprecated Esta función ya no se usa directamente, se usa la API route
 * Mantenida por compatibilidad
 */
export async function searchByTypeLegacy(type: SearchResult['type'], query: string): Promise<SearchResult[]> {
  return executeWithErrorHandling(
    async () => {
      if (!query || query.length < 2) {
        return []
      }
      
      const client = getSupabaseClient()
      const results: SearchResult[] = []
      
      // ⚠️ DEPRECATED: Esta función NO filtra por organization_id
      switch (type) {
        case 'customer':
          const { data: customers } = await client
            .from('customers')
            .select('id, name, email, phone')
            .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10)
          
          customers?.forEach(customer => {
            results.push({
              id: customer.id,
              type: 'customer',
              title: customer.name,
              description: customer.email || customer.phone || 'Cliente',
              url: `/clientes/${customer.id}`,
              metadata: { email: customer.email, phone: customer.phone }
            })
          })
          break
          
        case 'product':
          const { data: products } = await client
            .from('products')
            .select('id, name, description, code')
            .or(`name.ilike.%${query}%,code.ilike.%${query}%`)
            .limit(10)
          
          products?.forEach(product => {
            results.push({
              id: product.id,
              type: 'product',
              title: product.name,
              description: product.description || product.code || 'Producto',
              url: `/inventario/productos/${product.id}`,
              metadata: { code: product.code }
            })
          })
          break
          
        case 'order':
          const { data: orders } = await client
            .from('work_orders')
            .select('id, order_number, status, total_amount, customers(name)')
            .or(`order_number.ilike.%${query}%`)
            .limit(10)
          
          orders?.forEach(order => {
            results.push({
              id: order.id,
              type: 'order',
              title: `Orden ${order.order_number}`,
              description: `${order.customers?.name || 'Cliente'} - $${order.total_amount}`,
              url: `/ordenes/${order.id}`,
              metadata: { status: order.status, amount: order.total_amount }
            })
          })
          break
      }
      
      return results
    },
    {
      operation: 'searchByType',
      table: 'search'
    }
  )
}







