import { createClient } from './client'

export interface SearchResult {
  id: string
  type: 'order' | 'customer' | 'vehicle' | 'product' | 'quotation' | 'supplier'
  title: string
  subtitle: string
  href: string
  icon: string
  metadata?: any
}

const supabase = createClient()

// Función principal de búsqueda
export async function searchGlobal(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return []

  try {
    // Buscar en paralelo en todas las tablas
    const [orders, customers, vehicles, products, quotations, suppliers] = await Promise.all([
      searchOrders(query),
      searchCustomers(query),
      searchVehicles(query),
      searchProducts(query),
      searchQuotations(query),
      searchSuppliers(query)
    ])

    // Combinar y limitar resultados
    const allResults = [
      ...orders,
      ...customers,
      ...vehicles,
      ...products,
      ...quotations,
      ...suppliers
    ]

    // Ordenar por relevancia (título exacto primero, luego parcial)
    return allResults
      .sort((a, b) => {
        const aExact = a.title.toLowerCase().includes(query.toLowerCase())
        const bExact = b.title.toLowerCase().includes(query.toLowerCase())
        if (aExact && !bExact) return -1
        if (!aExact && bExact) return 1
        return 0
      })
      .slice(0, 10) // Limitar a 10 resultados
  } catch (error) {
    console.error('Error in global search:', error)
    return []
  }
}

// Buscar en órdenes de trabajo
async function searchOrders(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select(`
        id,
        order_number,
        status,
        total_cost,
        created_at,
        customers!inner(name),
        vehicles!inner(brand, model, year)
      `)
      .or(`order_number.ilike.%${query}%,customers.name.ilike.%${query}%`)
      .limit(5)

    if (error) throw error

    return data?.map(order => ({
      id: order.id,
      type: 'order' as const,
      title: `Orden #${order.order_number}`,
      subtitle: `${order.customers?.name} - ${order.vehicles?.brand} ${order.vehicles?.model} ${order.vehicles?.year}`,
      href: `/ordenes/${order.id}`,
      icon: 'FileText',
      metadata: { status: order.status, total_cost: order.total_cost }
    })) || []
  } catch (error) {
    console.error('Error searching orders:', error)
    return []
  }
}

// Buscar en clientes
async function searchCustomers(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, email, phone')
      .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(5)

    if (error) throw error

    return data?.map(customer => ({
      id: customer.id,
      type: 'customer' as const,
      title: customer.name,
      subtitle: `${customer.email} - ${customer.phone}`,
      href: `/clientes/${customer.id}`,
      icon: 'Users',
      metadata: { email: customer.email, phone: customer.phone }
    })) || []
  } catch (error) {
    console.error('Error searching customers:', error)
    return []
  }
}

// Buscar en vehículos
async function searchVehicles(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select(`
        id,
        brand,
        model,
        year,
        license_plate,
        customers!inner(name)
      `)
      .or(`brand.ilike.%${query}%,model.ilike.%${query}%,license_plate.ilike.%${query}%,customers.name.ilike.%${query}%`)
      .limit(5)

    if (error) throw error

    return data?.map(vehicle => ({
      id: vehicle.id,
      type: 'vehicle' as const,
      title: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
      subtitle: `${vehicle.customers?.name} - ${vehicle.license_plate}`,
      href: `/vehiculos/${vehicle.id}`,
      icon: 'Car',
      metadata: { license_plate: vehicle.license_plate, owner: vehicle.customers?.name }
    })) || []
  } catch (error) {
    console.error('Error searching vehicles:', error)
    return []
  }
}

// Buscar en productos del inventario
async function searchProducts(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, name, description, quantity, price')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(5)

    if (error) throw error

    return data?.map(product => ({
      id: product.id,
      type: 'product' as const,
      title: product.name,
      subtitle: `Inventario - ${product.quantity} unidades disponibles`,
      href: `/inventario`,
      icon: 'Package',
      metadata: { quantity: product.quantity, price: product.price }
    })) || []
  } catch (error) {
    console.error('Error searching products:', error)
    return []
  }
}

// Buscar en cotizaciones
async function searchQuotations(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        status,
        total,
        created_at,
        customers!inner(name),
        vehicles!inner(brand, model, year)
      `)
      .or(`quotation_number.ilike.%${query}%,customers.name.ilike.%${query}%`)
      .limit(5)

    if (error) throw error

    return data?.map(quotation => ({
      id: quotation.id,
      type: 'quotation' as const,
      title: `Cotización #${quotation.quotation_number}`,
      subtitle: `${quotation.customers?.name} - ${quotation.vehicles?.brand} ${quotation.vehicles?.model} ${quotation.vehicles?.year}`,
      href: `/cotizaciones/${quotation.id}`,
      icon: 'Receipt',
      metadata: { status: quotation.status, total: quotation.total }
    })) || []
  } catch (error) {
    console.error('Error searching quotations:', error)
    return []
  }
}

// Buscar en proveedores
async function searchSuppliers(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, contact_name, email, phone, category, status')
      .or(`name.ilike.%${query}%,contact_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(5)

    if (error) throw error

    return data?.map(supplier => ({
      id: supplier.id,
      type: 'supplier' as const,
      title: supplier.name,
      subtitle: `${supplier.contact_name} - ${supplier.category}`,
      href: `/proveedores/${supplier.id}`,
      icon: 'Building2',
      metadata: { status: supplier.status, category: supplier.category }
    })) || []
  } catch (error) {
    console.error('Error searching suppliers:', error)
    return []
  }
}

// Función para obtener sugerencias rápidas
export async function getQuickSuggestions(): Promise<SearchResult[]> {
  try {
    // Obtener elementos recientes de cada tabla
    const [recentOrders, recentCustomers, recentProducts] = await Promise.all([
      supabase
        .from('work_orders')
        .select('id, order_number, customers!inner(name)')
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('customers')
        .select('id, name, email')
        .order('created_at', { ascending: false })
        .limit(3),
      
      supabase
        .from('inventory')
        .select('id, name, quantity')
        .where('quantity', 'lt', 10)
        .limit(3)
    ])

    const suggestions: SearchResult[] = []

    // Agregar órdenes recientes
    if (recentOrders.data) {
      suggestions.push(...recentOrders.data.map(order => ({
        id: order.id,
        type: 'order' as const,
        title: `Orden #${order.order_number}`,
        subtitle: `${order.customers?.name}`,
        href: `/ordenes/${order.id}`,
        icon: 'FileText'
      })))
    }

    // Agregar clientes recientes
    if (recentCustomers.data) {
      suggestions.push(...recentCustomers.data.map(customer => ({
        id: customer.id,
        type: 'customer' as const,
        title: customer.name,
        subtitle: customer.email,
        href: `/clientes/${customer.id}`,
        icon: 'Users'
      })))
    }

    // Agregar productos con stock bajo
    if (recentProducts.data) {
      suggestions.push(...recentProducts.data.map(product => ({
        id: product.id,
        type: 'product' as const,
        title: product.name,
        subtitle: `Stock bajo: ${product.quantity} unidades`,
        href: `/inventario`,
        icon: 'Package'
      })))
    }

    return suggestions
  } catch (error) {
    console.error('Error getting quick suggestions:', error)
    return []
  }
}

