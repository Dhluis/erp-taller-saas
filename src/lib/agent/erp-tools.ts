/**
 * Herramientas ERP para el agente de IA - Búsqueda por organización
 * Incluye: clientes, órdenes, vehículos, inventario y finanzas
 *
 * MULTITENANCY: Todas las funciones reciben organizationId obtenido en el API
 * desde la sesión del usuario (users.organization_id). NUNCA se debe pasar
 * organization_id desde el cliente; el API lo obtiene tras autenticar.
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server'

export interface ERPSearchResult {
  customers: Array<{ id: string; name: string; phone: string | null; email: string | null; url: string }>
  orders: Array<{
    id: string
    order_number?: string
    status: string
    entry_date: string | null
    description: string | null
    customer_name: string
    vehicle_info: string
    url: string
  }>
  vehicles: Array<{
    id: string
    brand: string
    model: string
    year: number | null
    license_plate: string | null
    customer_name: string
    url: string
  }>
  inventory: Array<{
    id: string
    name: string
    sku: string | null
    current_stock: number
    min_stock: number | null
    unit: string
    category: string | null
    url: string
  }>
  invoices: Array<{
    id: string
    invoice_number: string
    status: string
    total_amount: number
    paid_amount: number
    balance: number
    customer_name: string
    url: string
  }>
}

export async function erpSearch(organizationId: string, query: string): Promise<ERPSearchResult> {
  const supabase = getSupabaseServiceClient()
  const q = query.trim()
  const like = `%${q}%`

  const result: ERPSearchResult = {
    customers: [],
    orders: [],
    vehicles: [],
    inventory: [],
    invoices: [],
  }

  if (!q || q.length < 2) return result

  const { data: customers } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .eq('organization_id', organizationId)
    .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(5)

  customers?.forEach((c) => {
    result.customers.push({
      id: c.id,
      name: c.name,
      phone: c.phone ?? null,
      email: c.email ?? null,
      url: `/clientes/${c.id}`,
    })
  })

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, license_plate, customer:customers(id, name)')
    .eq('organization_id', organizationId)
    .or(`brand.ilike.${like},model.ilike.${like},license_plate.ilike.${like}`)
    .limit(5)

  vehicles?.forEach((v) => {
    const customer = v.customer as { id: string; name: string } | null
    result.vehicles.push({
      id: v.id,
      brand: v.brand || '',
      model: v.model || '',
      year: v.year ?? null,
      license_plate: v.license_plate ?? null,
      customer_name: customer?.name || '',
      url: `/vehiculos`,
    })
  })

  const { data: matchingCustomers } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(10)

  const { data: matchingVehicles } = await supabase
    .from('vehicles')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`brand.ilike.${like},model.ilike.${like},license_plate.ilike.${like}`)
    .limit(10)

  const customerIds = matchingCustomers?.map((c) => c.id) || []
  const vehicleIds = matchingVehicles?.map((v) => v.id) || []

  let ordersQuery = supabase
    .from('work_orders')
    .select(`
      id,
      status,
      description,
      entry_date,
      customer:customers(id, name),
      vehicle:vehicles(id, brand, model, year, license_plate)
    `)
    .eq('organization_id', organizationId)
    .order('entry_date', { ascending: false })
    .limit(10)

  if (customerIds.length > 0 || vehicleIds.length > 0) {
    if (customerIds.length > 0 && vehicleIds.length > 0) {
      ordersQuery = ordersQuery.or(`customer_id.in.(${customerIds.join(',')}),vehicle_id.in.(${vehicleIds.join(',')})`)
    } else if (customerIds.length > 0) {
      ordersQuery = ordersQuery.in('customer_id', customerIds)
    } else {
      ordersQuery = ordersQuery.in('vehicle_id', vehicleIds)
    }
  } else {
    ordersQuery = ordersQuery.or(`description.ilike.${like},id.ilike.${like}`)
  }

  const { data: orders } = await ordersQuery

  orders?.forEach((o) => {
    const customer = o.customer as { id: string; name: string } | null
    const vehicle = o.vehicle as { brand: string; model: string; year: number; license_plate: string } | null
    result.orders.push({
      id: o.id,
      status: o.status,
      entry_date: o.entry_date ?? null,
      description: o.description ?? null,
      customer_name: customer?.name || 'Sin cliente',
      vehicle_info: vehicle ? `${vehicle.brand || ''} ${vehicle.model || ''} ${vehicle.year || ''}`.trim() : '',
      url: `/ordenes/${o.id}`,
    })
  })

  // Inventario / productos
  const { data: inventoryItems } = await supabase
    .from('inventory_items')
    .select('id, name, sku, current_stock, min_stock, unit_price, category')
    .eq('organization_id', organizationId)
    .or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`)
    .limit(10)

  inventoryItems?.forEach((item) => {
    result.inventory.push({
      id: item.id,
      name: item.name,
      sku: item.sku ?? null,
      current_stock: Number(item.current_stock) ?? 0,
      min_stock: item.min_stock != null ? Number(item.min_stock) : null,
      unit: 'un',
      category: item.category ?? null,
      url: '/inventarios/movimientos',
    })
  })

  // Facturas / notas de venta
  const { data: invoicesByNumber } = await supabase
    .from('sales_invoices')
    .select('id, invoice_number, status, total_amount, paid_amount, balance, customer:customers(name)')
    .eq('organization_id', organizationId)
    .ilike('invoice_number', like)
    .limit(5)

  invoicesByNumber?.forEach((inv) => {
    const customer = (inv as any).customer as { name: string } | null
    result.invoices.push({
      id: inv.id,
      invoice_number: inv.invoice_number,
      status: inv.status,
      total_amount: Number(inv.total_amount) ?? 0,
      paid_amount: Number(inv.paid_amount) ?? 0,
      balance: Number(inv.balance) ?? 0,
      customer_name: customer?.name ?? '',
      url: `/ingresos/facturacion/${inv.id}`,
    })
  })

  return result
}

export async function getOrdersCountByStatus(organizationId: string): Promise<Record<string, number>> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('work_orders')
    .select('status')
    .eq('organization_id', organizationId)

  const counts: Record<string, number> = {}
  data?.forEach((row) => {
    const s = row.status || 'unknown'
    counts[s] = (counts[s] || 0) + 1
  })
  return counts
}

/**
 * Búsqueda específica de inventario por nombre, SKU o categoría.
 * Para preguntas como "cuánto tengo en aceite", "stock de filtros", etc.
 */
export async function searchInventory(
  organizationId: string,
  query: string
): Promise<Array<{ name: string; sku: string | null; current_stock: number; min_stock: number | null; category: string | null; url: string }>> {
  const supabase = getSupabaseServiceClient()
  const q = query.trim()
  if (!q) return []

  const like = `%${q}%`
  const { data } = await supabase
    .from('inventory_items')
    .select('id, name, sku, current_stock, min_stock, category')
    .eq('organization_id', organizationId)
    .or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`)
    .limit(15)

  return (data || []).map((item) => ({
    name: item.name,
    sku: item.sku ?? null,
    current_stock: Number(item.current_stock) ?? 0,
    min_stock: item.min_stock != null ? Number(item.min_stock) : null,
    category: item.category ?? null,
    url: '/inventarios/movimientos',
  }))
}

/**
 * Resumen financiero: facturas por estado, totales cobrado/pendiente.
 */
export interface FinanceSummary {
  total_invoices: number
  total_amount: number
  total_paid: number
  total_balance: number
  by_status: Record<string, { count: number; total: number }>
}

export async function getFinanceSummary(organizationId: string): Promise<FinanceSummary> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('sales_invoices')
    .select('status, total_amount, paid_amount, balance')
    .eq('organization_id', organizationId)

  const by_status: Record<string, { count: number; total: number }> = {}
  let total_amount = 0
  let total_paid = 0
  let total_balance = 0

  data?.forEach((row) => {
    const status = row.status || 'unknown'
    if (!by_status[status]) by_status[status] = { count: 0, total: 0 }
    by_status[status].count += 1
    by_status[status].total += Number(row.total_amount) || 0
    total_amount += Number(row.total_amount) || 0
    total_paid += Number(row.paid_amount) || 0
    total_balance += Number(row.balance) || 0
  })

  return {
    total_invoices: data?.length ?? 0,
    total_amount,
    total_paid,
    total_balance,
    by_status,
  }
}
