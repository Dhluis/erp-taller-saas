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
    status: string
    entry_date: string | null
    description: string | null
    customer_name: string
    vehicle_info: string
    total_amount: number | null
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
    unit_price: number
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

  const { data: customersRaw } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .eq('organization_id', organizationId)
    .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(5)

  const customers = (customersRaw || []) as any[]
  customers.forEach((c) => {
    result.customers.push({
      id: c.id,
      name: c.name,
      phone: c.phone ?? null,
      email: c.email ?? null,
      url: `/clientes/${c.id}`,
    })
  })

  const { data: vehiclesRaw } = await supabase
    .from('vehicles')
    .select('id, brand, model, year, license_plate, customer:customers(id, name)')
    .eq('organization_id', organizationId)
    .or(`brand.ilike.${like},model.ilike.${like},license_plate.ilike.${like}`)
    .limit(5)

  const vehicles = (vehiclesRaw || []) as any[]
  vehicles.forEach((v) => {
    result.vehicles.push({
      id: v.id,
      brand: v.brand || '',
      model: v.model || '',
      year: v.year ?? null,
      license_plate: v.license_plate ?? null,
      customer_name: v.customer?.name || '',
      url: `/vehiculos`,
    })
  })

  const { data: matchingCustomersRaw } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
    .limit(10)

  const { data: matchingVehiclesRaw } = await supabase
    .from('vehicles')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`brand.ilike.${like},model.ilike.${like},license_plate.ilike.${like}`)
    .limit(10)

  const customerIds = ((matchingCustomersRaw || []) as any[]).map((c) => c.id)
  const vehicleIds = ((matchingVehiclesRaw || []) as any[]).map((v) => v.id)

  let ordersQuery = supabase
    .from('work_orders')
    .select(`id, status, description, entry_date, total_amount, customer:customers(id, name), vehicle:vehicles(id, brand, model, year, license_plate)`)
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

  const { data: ordersRaw } = await ordersQuery
  const orders = (ordersRaw || []) as any[]
  orders.forEach((o) => {
    result.orders.push({
      id: o.id,
      status: o.status,
      entry_date: o.entry_date ?? null,
      description: o.description ?? null,
      customer_name: o.customer?.name || 'Sin cliente',
      vehicle_info: o.vehicle
        ? `${o.vehicle.brand || ''} ${o.vehicle.model || ''} ${o.vehicle.year || ''}`.trim()
        : '',
      total_amount: o.total_amount != null ? Number(o.total_amount) : null,
      url: `/ordenes/${o.id}`,
    })
  })

  // Inventario — columnas reales: quantity, min_quantity, unit_price
  const { data: inventoryRaw } = await supabase
    .from('inventory')
    .select('id, name, sku, quantity, min_quantity, unit_price, category:inventory_categories(name)')
    .eq('organization_id', organizationId)
    .or(`name.ilike.${like},sku.ilike.${like},description.ilike.${like}`)
    .limit(10)

  const inventoryItems = (inventoryRaw || []) as any[]
  inventoryItems.forEach((item) => {
    result.inventory.push({
      id: item.id,
      name: item.name,
      sku: item.sku ?? null,
      current_stock: Number(item.quantity) || 0,
      min_stock: item.min_quantity != null ? Number(item.min_quantity) : null,
      unit_price: Number(item.unit_price) || 0,
      category: item.category?.name ?? null,
      url: '/inventarios/productos',
    })
  })

  // Facturas modernas (tabla invoices)
  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount, paid_date, customer:customers(name)')
    .eq('organization_id', organizationId)
    .ilike('invoice_number', like)
    .limit(5)

  const invoices = (invoicesRaw || []) as any[]
  invoices.forEach((inv) => {
    const amount = Number(inv.total_amount) || 0
    const isPaid = inv.status === 'paid'
    result.invoices.push({
      id: inv.id,
      invoice_number: inv.invoice_number,
      status: inv.status,
      total_amount: amount,
      paid_amount: isPaid ? amount : 0,
      balance: isPaid ? 0 : amount,
      customer_name: inv.customer?.name ?? '',
      url: `/ingresos/facturacion/${inv.id}`,
    })
  })

  // También buscar en sales_invoices si faltan resultados
  if (result.invoices.length < 5) {
    const { data: salesRaw } = await supabase
      .from('sales_invoices')
      .select('id, invoice_number, status, total_amount, paid_amount, balance, customer:customers(name)')
      .eq('organization_id', organizationId)
      .ilike('invoice_number', like)
      .limit(5 - result.invoices.length)

    const salesInvoices = (salesRaw || []) as any[]
    salesInvoices.forEach((inv) => {
      result.invoices.push({
        id: inv.id,
        invoice_number: inv.invoice_number,
        status: inv.status,
        total_amount: Number(inv.total_amount) || 0,
        paid_amount: Number(inv.paid_amount) || 0,
        balance: Number(inv.balance) || 0,
        customer_name: inv.customer?.name ?? '',
        url: `/ingresos/facturacion/${inv.id}`,
      })
    })
  }

  return result
}

// ─── Constantes compartidas para estados de órdenes ─────────────────────────

export interface WorkOrderDetail {
  id: string
  status: string
  status_label: string
  entry_date: string | null
  estimated_completion: string | null
  description: string | null
  customer_name: string
  customer_phone: string | null
  vehicle_info: string
  total_amount: number | null
  url: string
}

const STATUS_LABELS: Record<string, string> = {
  reception: 'Recepción',
  diagnosis: 'Diagnóstico',
  in_progress: 'En proceso',
  waiting_parts: 'Esperando repuestos',
  waiting_approval: 'Esperando aprobación',
  ready: 'Listo para entregar',
  completed: 'Completado',
  cancelled: 'Cancelado',
  testing: 'En pruebas',
  initial_budget: 'Presupuesto inicial',
  archived: 'Archivado',
}

function mapOrder(o: any): WorkOrderDetail {
  return {
    id: o.id,
    status: o.status,
    status_label: STATUS_LABELS[o.status] || o.status,
    entry_date: o.entry_date ?? null,
    estimated_completion: o.estimated_completion ?? null,
    description: o.description ?? null,
    customer_name: o.customer?.name || 'Sin cliente',
    customer_phone: o.customer?.phone ?? null,
    vehicle_info: o.vehicle
      ? `${o.vehicle.brand || ''} ${o.vehicle.model || ''} ${o.vehicle.year || ''}`.trim()
      : '',
    total_amount: o.total_amount != null ? Number(o.total_amount) : null,
    url: `/ordenes/${o.id}`,
  }
}

export async function getOrdersCountByStatus(organizationId: string): Promise<Record<string, number>> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('work_orders')
    .select('status')
    .eq('organization_id', organizationId)

  const counts: Record<string, number> = {}
  ;(data || []).forEach((row: any) => {
    const s = row.status || 'unknown'
    const label = STATUS_LABELS[s] || s
    counts[label] = (counts[label] || 0) + 1
  })
  return counts
}

/**
 * Retorna las órdenes de trabajo más recientes ordenadas por fecha de ingreso.
 */
export async function getRecentOrders(
  organizationId: string,
  limit = 5
): Promise<WorkOrderDetail[]> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('work_orders')
    .select('id, status, description, entry_date, estimated_completion, total_amount, customer:customers(name, phone), vehicle:vehicles(brand, model, year, license_plate)')
    .eq('organization_id', organizationId)
    .order('entry_date', { ascending: false })
    .limit(limit)

  return ((data || []) as any[]).map(mapOrder)
}

/**
 * Retorna órdenes filtradas por estado. Acepta nombre en español o en inglés.
 */
export async function getOrdersByStatus(
  organizationId: string,
  status: string,
  limit = 10
): Promise<WorkOrderDetail[]> {
  const supabase = getSupabaseServiceClient()

  // Mapeo inverso: español → clave de DB
  const STATUS_KEYS: Record<string, string> = {
    recepcion: 'reception', recepción: 'reception',
    diagnostico: 'diagnosis', diagnóstico: 'diagnosis',
    'en proceso': 'in_progress', proceso: 'in_progress', in_progress: 'in_progress',
    'esperando repuestos': 'waiting_parts', repuestos: 'waiting_parts', waiting_parts: 'waiting_parts',
    'esperando aprobacion': 'waiting_approval', aprobacion: 'waiting_approval', waiting_approval: 'waiting_approval',
    listo: 'ready', ready: 'ready',
    completado: 'completed', completed: 'completed',
    cancelado: 'cancelled', cancelled: 'cancelled',
    pruebas: 'testing', testing: 'testing',
    archivado: 'archived', archived: 'archived',
  }

  const normalized = status.toLowerCase().trim()
  const dbStatus = STATUS_KEYS[normalized] || normalized

  const { data } = await supabase
    .from('work_orders')
    .select('id, status, description, entry_date, estimated_completion, total_amount, customer:customers(name, phone), vehicle:vehicles(brand, model, year, license_plate)')
    .eq('organization_id', organizationId)
    .eq('status', dbStatus)
    .order('entry_date', { ascending: false })
    .limit(limit)

  return ((data || []) as any[]).map(mapOrder)
}

/**
 * Búsqueda específica de inventario por nombre, SKU o descripción.
 * Columnas reales: quantity (stock actual), min_quantity (mínimo), unit_price.
 */
export async function searchInventory(
  organizationId: string,
  query: string
): Promise<Array<{
  name: string
  sku: string | null
  current_stock: number
  min_stock: number | null
  unit_price: number
  category: string | null
  url: string
}>> {
  const supabase = getSupabaseServiceClient()
  const q = query.trim()
  if (!q) return []

  const like = `%${q}%`
  const { data } = await supabase
    .from('inventory')
    .select('id, name, sku, quantity, min_quantity, unit_price, category:inventory_categories(name)')
    .eq('organization_id', organizationId)
    .or(`name.ilike.${like},sku.ilike.${like},description.ilike.${like}`)
    .limit(15)

  return ((data || []) as any[]).map((item) => ({
    name: item.name,
    sku: item.sku ?? null,
    current_stock: Number(item.quantity) || 0,
    min_stock: item.min_quantity != null ? Number(item.min_quantity) : null,
    unit_price: Number(item.unit_price) || 0,
    category: item.category?.name ?? null,
    url: '/inventarios/productos',
  }))
}

/**
 * Productos con stock bajo o agotado (quantity <= min_quantity).
 */
export async function getLowStockItems(
  organizationId: string
): Promise<Array<{
  name: string
  sku: string | null
  current_stock: number
  min_stock: number
  unit_price: number
  category: string | null
  url: string
}>> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('inventory')
    .select('id, name, sku, quantity, min_quantity, unit_price, category:inventory_categories(name)')
    .eq('organization_id', organizationId)
    .gt('min_quantity', 0)
    .order('name', { ascending: true })

  return ((data || []) as any[])
    .filter((item) => (Number(item.quantity) || 0) <= (Number(item.min_quantity) || 0))
    .map((item) => ({
      name: item.name,
      sku: item.sku ?? null,
      current_stock: Number(item.quantity) || 0,
      min_stock: Number(item.min_quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      category: item.category?.name ?? null,
      url: '/inventarios/productos',
    }))
}

/**
 * Estadísticas globales del inventario: total de productos, valor total en stock,
 * cuántos con bajo stock y cuántos agotados.
 */
export interface InventoryStats {
  total_products: number
  total_stock_value: number
  low_stock_count: number
  out_of_stock_count: number
}

export async function getInventoryStats(organizationId: string): Promise<InventoryStats> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('inventory')
    .select('quantity, min_quantity, unit_price')
    .eq('organization_id', organizationId)

  let total_stock_value = 0
  let low_stock_count = 0
  let out_of_stock_count = 0

  ;((data || []) as any[]).forEach((item) => {
    const qty = Number(item.quantity) || 0
    const minQty = Number(item.min_quantity) || 0
    const price = Number(item.unit_price) || 0
    total_stock_value += qty * price
    if (qty === 0) out_of_stock_count++
    else if (minQty > 0 && qty <= minQty) low_stock_count++
  })

  return {
    total_products: (data || []).length,
    total_stock_value,
    low_stock_count,
    out_of_stock_count,
  }
}

/**
 * Resumen financiero combinando tabla invoices (moderna) y sales_invoices (OTs).
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

  // Tabla moderna (página de facturación principal)
  const { data: invoicesRaw } = await supabase
    .from('invoices')
    .select('status, total_amount')
    .eq('organization_id', organizationId)

  // Tabla de ventas vinculadas a órdenes (tiene paid_amount y balance)
  const { data: salesRaw } = await supabase
    .from('sales_invoices')
    .select('status, total_amount, paid_amount, balance')
    .eq('organization_id', organizationId)

  const statusLabels: Record<string, string> = {
    paid: 'Pagado',
    pending: 'Pendiente',
    partial: 'Pago parcial',
    draft: 'Borrador',
    sent: 'Enviado',
    overdue: 'Vencido',
    cancelled: 'Cancelado',
  }

  const by_status: Record<string, { count: number; total: number }> = {}
  let total_amount = 0
  let total_paid = 0
  let total_balance = 0

  ;((invoicesRaw || []) as any[]).forEach((row) => {
    const raw = row.status || 'unknown'
    const label = statusLabels[raw] || raw
    if (!by_status[label]) by_status[label] = { count: 0, total: 0 }
    const amount = Number(row.total_amount) || 0
    by_status[label].count += 1
    by_status[label].total += amount
    total_amount += amount
    if (raw === 'paid') {
      total_paid += amount
    } else if (raw !== 'cancelled' && raw !== 'draft') {
      total_balance += amount
    }
  })

  ;((salesRaw || []) as any[]).forEach((row) => {
    const raw = row.status || 'unknown'
    const label = `Ventas - ${statusLabels[raw] || raw}`
    if (!by_status[label]) by_status[label] = { count: 0, total: 0 }
    const amount = Number(row.total_amount) || 0
    by_status[label].count += 1
    by_status[label].total += amount
    total_amount += amount
    total_paid += Number(row.paid_amount) || 0
    total_balance += Number(row.balance) || 0
  })

  return {
    total_invoices: ((invoicesRaw || []).length) + ((salesRaw || []).length),
    total_amount,
    total_paid,
    total_balance,
    by_status,
  }
}
