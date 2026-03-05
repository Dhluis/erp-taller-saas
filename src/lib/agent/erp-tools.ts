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
      url: `/clientes`,
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
 * Retorna los clientes más recientemente registrados.
 */
export async function getRecentCustomers(
  organizationId: string,
  limit = 5
): Promise<Array<{ id: string; name: string; phone: string | null; email: string | null; created_at: string | null; url: string }>> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('customers')
    .select('id, name, phone, email, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data || []) as any[]).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone ?? null,
    email: c.email ?? null,
    created_at: c.created_at ?? null,
    url: `/clientes`,
  }))
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
 * Saldo actual de cuentas de efectivo (cash_accounts + cash_account_movements).
 */
export interface CashBalanceSummary {
  accounts: Array<{ name: string; account_type: string; current_balance: number }>
  total_balance: number
}

export async function getCashBalance(organizationId: string): Promise<CashBalanceSummary> {
  const supabase = getSupabaseServiceClient()

  const { data: accounts } = await supabase
    .from('cash_accounts')
    .select('id, name, account_type, initial_balance')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  const results = await Promise.all(
    ((accounts || []) as any[]).map(async (acc) => {
      const { data: movs } = await supabase
        .from('cash_account_movements')
        .select('movement_type, amount')
        .eq('cash_account_id', acc.id)
      let delta = 0
      for (const m of (movs || []) as any[]) {
        if (m.movement_type === 'deposit' || m.movement_type === 'adjustment') delta += Number(m.amount)
        else if (m.movement_type === 'withdrawal') delta -= Number(m.amount)
      }
      return {
        name: acc.name as string,
        account_type: acc.account_type as string,
        current_balance: Number(acc.initial_balance) + delta,
      }
    })
  )

  return {
    accounts: results,
    total_balance: results.reduce((s, a) => s + a.current_balance, 0),
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

// ─── Alta prioridad: Citas, Gastos, Cobros, Cotizaciones, Empleados ──────────

/**
 * Citas próximas o por estado.
 * days_ahead: cuántos días hacia adelante buscar (default 7). Si es 0, solo hoy.
 */
export interface AppointmentItem {
  id: string
  appointment_date: string | null
  status: string
  service_type: string | null
  notes: string | null
  customer_name: string
  customer_phone: string | null
  vehicle_info: string
  url: string
}

export async function getUpcomingAppointments(
  organizationId: string,
  days_ahead = 7,
  status?: string
): Promise<AppointmentItem[]> {
  const supabase = getSupabaseServiceClient()
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setDate(end.getDate() + days_ahead)

  let q = supabase
    .from('appointments')
    .select('id, appointment_date, status, service_type, notes, customer:customers(name,phone), vehicle:vehicles(brand,model,year,license_plate)')
    .eq('organization_id', organizationId)
    .gte('appointment_date', now.toISOString())
    .lte('appointment_date', end.toISOString())
    .order('appointment_date', { ascending: true })
    .limit(20)

  if (status) q = q.eq('status', status)

  const { data } = await q
  return ((data || []) as any[]).map((a) => ({
    id: a.id,
    appointment_date: a.appointment_date,
    status: a.status,
    service_type: a.service_type ?? null,
    notes: a.notes ?? null,
    customer_name: a.customer?.name ?? 'Sin cliente',
    customer_phone: a.customer?.phone ?? null,
    vehicle_info: a.vehicle ? `${a.vehicle.brand || ''} ${a.vehicle.model || ''} ${a.vehicle.year || ''}`.trim() : '',
    url: `/citas`,
  }))
}

/**
 * Resumen de gastos: total y desglose por categoría en un período.
 * from/to en formato YYYY-MM-DD. Si omitidos, últimos 30 días.
 */
export interface ExpensesSummary {
  total: number
  count: number
  by_category: Record<string, { count: number; total: number }>
  recent: Array<{ date: string; category: string; amount: number; description: string | null }>
}

export async function getExpensesSummaryTool(
  organizationId: string,
  from?: string,
  to?: string
): Promise<ExpensesSummary> {
  const supabase = getSupabaseServiceClient()
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 30)

  const fromDate = from || defaultFrom.toISOString().split('T')[0]
  const toDate = to || new Date().toISOString().split('T')[0]

  const { data } = await supabase
    .from('expenses')
    .select('amount, category, expense_date, description')
    .eq('organization_id', organizationId)
    .gte('expense_date', fromDate)
    .lte('expense_date', toDate)
    .order('expense_date', { ascending: false })

  const rows = (data || []) as any[]
  const by_category: Record<string, { count: number; total: number }> = {}
  let total = 0

  rows.forEach((r) => {
    const cat = r.category || 'Sin categoría'
    if (!by_category[cat]) by_category[cat] = { count: 0, total: 0 }
    const amt = Number(r.amount) || 0
    by_category[cat].count += 1
    by_category[cat].total += amt
    total += amt
  })

  return {
    total,
    count: rows.length,
    by_category,
    recent: rows.slice(0, 10).map((r) => ({
      date: r.expense_date,
      category: r.category || 'Sin categoría',
      amount: Number(r.amount) || 0,
      description: r.description ?? null,
    })),
  }
}

/**
 * Cobros: pendientes y resumen de cobros pagados recientes.
 */
export interface CollectionsSummary {
  pending_count: number
  pending_total: number
  overdue_count: number
  overdue_total: number
  paid_this_month: number
  recent_pending: Array<{ customer: string; amount: number; due_date: string | null; status: string }>
}

export async function getCollectionsSummary(organizationId: string): Promise<CollectionsSummary> {
  const supabase = getSupabaseServiceClient()

  const { data } = await supabase
    .from('collections')
    .select('amount, status, due_date, paid_date, customer:customers(name)')
    .eq('organization_id', organizationId)
    .order('due_date', { ascending: true })
    .limit(100)

  const rows = (data || []) as any[]
  const nowISO = new Date().toISOString().split('T')[0]
  const monthStart = new Date()
  monthStart.setDate(1)
  const monthStartISO = monthStart.toISOString().split('T')[0]

  let pending_count = 0, pending_total = 0
  let overdue_count = 0, overdue_total = 0
  let paid_this_month = 0
  const recent_pending: CollectionsSummary['recent_pending'] = []

  rows.forEach((r) => {
    const amt = Number(r.amount) || 0
    if (r.status === 'paid') {
      if (r.paid_date && r.paid_date >= monthStartISO) paid_this_month += amt
    } else if (r.status === 'pending' || r.status === 'overdue') {
      const isOverdue = r.due_date && r.due_date < nowISO
      if (isOverdue) { overdue_count++; overdue_total += amt }
      else { pending_count++; pending_total += amt }
      if (recent_pending.length < 8) {
        recent_pending.push({
          customer: r.customer?.name ?? 'Sin cliente',
          amount: amt,
          due_date: r.due_date ?? null,
          status: isOverdue ? 'Vencido' : 'Pendiente',
        })
      }
    }
  })

  return { pending_count, pending_total, overdue_count, overdue_total, paid_this_month, recent_pending }
}

/**
 * Cotizaciones: resumen por estado y lista de pendientes de aprobación.
 */
export interface QuotationsSummary {
  total: number
  by_status: Record<string, number>
  pending_approval: Array<{ quotation_number: string; customer: string; total_amount: number; created_at: string | null; valid_until: string | null }>
}

export async function getQuotationsSummary(organizationId: string): Promise<QuotationsSummary> {
  const supabase = getSupabaseServiceClient()

  const { data } = await supabase
    .from('quotations')
    .select('quotation_number, status, total_amount, created_at, valid_until, customer:customers(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data || []) as any[]
  const statusLabels: Record<string, string> = {
    draft: 'Borrador', sent: 'Enviada', approved: 'Aprobada',
    rejected: 'Rechazada', expired: 'Expirada',
  }

  const by_status: Record<string, number> = {}
  const pending_approval: QuotationsSummary['pending_approval'] = []

  rows.forEach((r) => {
    const label = statusLabels[r.status] || r.status
    by_status[label] = (by_status[label] || 0) + 1
    if ((r.status === 'sent' || r.status === 'draft') && pending_approval.length < 8) {
      pending_approval.push({
        quotation_number: r.quotation_number,
        customer: r.customer?.name ?? 'Sin cliente',
        total_amount: Number(r.total_amount) || 0,
        created_at: r.created_at ?? null,
        valid_until: r.valid_until ?? null,
      })
    }
  })

  return { total: rows.length, by_status, pending_approval }
}

/**
 * Empleados activos del taller.
 */
export interface EmployeeItem {
  name: string
  role: string | null
  specialty: string | null
  is_active: boolean
}

export async function getActiveEmployees(organizationId: string): Promise<EmployeeItem[]> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('employees')
    .select('name, role, specialty, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return ((data || []) as any[]).map((e) => ({
    name: e.name,
    role: e.role ?? null,
    specialty: e.specialty ?? null,
    is_active: e.is_active,
  }))
}

// ─── Media prioridad: Leads, Órdenes de Compra, Proveedores ─────────────────

/**
 * Resumen de leads/prospectos del CRM por estado.
 */
export interface LeadsSummary {
  total: number
  by_status: Record<string, number>
  estimated_value_total: number
  recent: Array<{ name: string; status: string; source: string | null; estimated_value: number | null; created_at: string | null }>
}

export async function getLeadsSummary(organizationId: string): Promise<LeadsSummary> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('leads')
    .select('name, status, source, estimated_value, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (data || []) as any[]
  const statusLabels: Record<string, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    qualified: 'Calificado',
    proposal: 'Propuesta',
    negotiation: 'Negociación',
    closed_won: 'Ganado',
    closed_lost: 'Perdido',
  }

  const by_status: Record<string, number> = {}
  let estimated_value_total = 0

  rows.forEach((r) => {
    const label = statusLabels[r.status] || r.status
    by_status[label] = (by_status[label] || 0) + 1
    if (r.estimated_value) estimated_value_total += Number(r.estimated_value)
  })

  return {
    total: rows.length,
    by_status,
    estimated_value_total,
    recent: rows.slice(0, 10).map((r) => ({
      name: r.name,
      status: statusLabels[r.status] || r.status,
      source: r.source ?? null,
      estimated_value: r.estimated_value != null ? Number(r.estimated_value) : null,
      created_at: r.created_at ?? null,
    })),
  }
}

/**
 * Resumen de órdenes de compra a proveedores.
 */
export interface PurchaseOrdersSummary {
  total: number
  by_status: Record<string, number>
  pending_total: number
  recent: Array<{ order_number: string; supplier: string; status: string; total: number; order_date: string | null }>
}

export async function getPurchaseOrdersSummary(organizationId: string): Promise<PurchaseOrdersSummary> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('purchase_orders')
    .select('order_number, status, total, order_date, payment_status, supplier:suppliers(name)')
    .eq('organization_id', organizationId)
    .order('order_date', { ascending: false })
    .limit(50)

  const rows = (data || []) as any[]
  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    shipped: 'Enviada',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
  }

  const by_status: Record<string, number> = {}
  let pending_total = 0

  rows.forEach((r) => {
    const label = statusLabels[r.status] || r.status
    by_status[label] = (by_status[label] || 0) + 1
    if (r.status === 'pending' || r.status === 'confirmed') {
      pending_total += Number(r.total) || 0
    }
  })

  return {
    total: rows.length,
    by_status,
    pending_total,
    recent: rows.slice(0, 10).map((r) => ({
      order_number: r.order_number,
      supplier: (r.supplier as any)?.name ?? 'Sin proveedor',
      status: statusLabels[r.status] || r.status,
      total: Number(r.total) || 0,
      order_date: r.order_date ?? null,
    })),
  }
}

/**
 * Lista de proveedores activos.
 */
export interface SupplierItem {
  name: string
  contact_person: string | null
  phone: string | null
  email: string | null
  payment_terms: string | null
  is_active: boolean
}

export async function getSuppliersList(organizationId: string): Promise<SupplierItem[]> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('suppliers')
    .select('name, contact_person, phone, email, payment_terms, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name', { ascending: true })

  return ((data || []) as any[]).map((s) => ({
    name: s.name,
    contact_person: s.contact_person ?? null,
    phone: s.phone ?? null,
    email: s.email ?? null,
    payment_terms: s.payment_terms ?? null,
    is_active: s.is_active,
  }))
}

// ─── Baja prioridad: Notas de Entrega, Notas de Crédito, Cortes de Caja ─────

/**
 * Resumen de notas de entrega (remisiones).
 */
export interface DeliveryNotesSummary {
  total: number
  by_status: Record<string, number>
  recent: Array<{ delivery_number: string; customer: string; status: string; delivered_at: string | null; created_at: string | null }>
}

export async function getDeliveryNotesSummary(organizationId: string): Promise<DeliveryNotesSummary> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('delivery_notes')
    .select('delivery_number, status, delivered_at, created_at, customer:customers(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data || []) as any[]
  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    delivered: 'Entregada',
    cancelled: 'Cancelada',
  }

  const by_status: Record<string, number> = {}
  rows.forEach((r) => {
    const label = statusLabels[r.status] || r.status
    by_status[label] = (by_status[label] || 0) + 1
  })

  return {
    total: rows.length,
    by_status,
    recent: rows.slice(0, 10).map((r) => ({
      delivery_number: r.delivery_number,
      customer: (r.customer as any)?.name ?? 'Sin cliente',
      status: statusLabels[r.status] || r.status,
      delivered_at: r.delivered_at ?? null,
      created_at: r.created_at ?? null,
    })),
  }
}

/**
 * Resumen de notas de crédito.
 */
export interface CreditNotesSummary {
  total: number
  total_amount: number
  by_status: Record<string, number>
  recent: Array<{ credit_note_number: string; status: string; total_amount: number; reason: string | null; issued_at: string | null }>
}

export async function getCreditNotesSummary(organizationId: string): Promise<CreditNotesSummary> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('credit_notes')
    .select('credit_note_number, status, total_amount, reason, issued_at, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  const rows = (data || []) as any[]
  const statusLabels: Record<string, string> = {
    draft: 'Borrador',
    issued: 'Emitida',
    applied: 'Aplicada',
    cancelled: 'Cancelada',
  }

  const by_status: Record<string, number> = {}
  let total_amount = 0

  rows.forEach((r) => {
    const label = statusLabels[r.status] || r.status
    by_status[label] = (by_status[label] || 0) + 1
    total_amount += Number(r.total_amount) || 0
  })

  return {
    total: rows.length,
    total_amount,
    by_status,
    recent: rows.slice(0, 10).map((r) => ({
      credit_note_number: r.credit_note_number,
      status: statusLabels[r.status] || r.status,
      total_amount: Number(r.total_amount) || 0,
      reason: r.reason ?? null,
      issued_at: r.issued_at ?? null,
    })),
  }
}

/**
 * Historial de cortes de caja recientes.
 */
export interface CashClosuresSummary {
  total_closures: number
  last_closure: { closed_at: string; opening_balance: number; closing_balance: number; counted_amount: number; difference: number; account_name: string } | null
  recent: Array<{ closed_at: string; opening_balance: number; closing_balance: number; counted_amount: number; difference: number; account_name: string }>
}

export async function getCashClosuresSummary(organizationId: string): Promise<CashClosuresSummary> {
  const supabase = getSupabaseServiceClient()
  const { data } = await supabase
    .from('cash_closures')
    .select('closed_at, opening_balance, closing_balance, counted_amount, difference, cash_account:cash_accounts(name)')
    .eq('organization_id', organizationId)
    .order('closed_at', { ascending: false })
    .limit(20)

  const rows = (data || []) as any[]
  const mapped = rows.map((r) => ({
    closed_at: r.closed_at,
    opening_balance: Number(r.opening_balance) || 0,
    closing_balance: Number(r.closing_balance) || 0,
    counted_amount: Number(r.counted_amount) || 0,
    difference: Number(r.difference) || 0,
    account_name: (r.cash_account as any)?.name ?? 'Sin cuenta',
  }))

  return {
    total_closures: rows.length,
    last_closure: mapped.length > 0 ? mapped[0] : null,
    recent: mapped.slice(0, 10),
  }
}
