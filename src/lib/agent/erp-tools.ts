/**
 * Herramientas ERP para el agente de IA - Búsqueda por organización
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
}

export async function erpSearch(organizationId: string, query: string): Promise<ERPSearchResult> {
  const supabase = getSupabaseServiceClient()
  const q = query.trim()
  const like = `%${q}%`

  const result: ERPSearchResult = { customers: [], orders: [], vehicles: [] }

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
