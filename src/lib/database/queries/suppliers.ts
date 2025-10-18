import { createClient } from '@/lib/supabase/server'
import { executeWithErrorHandling } from '@/lib/core/errors'

/**
 * =====================================================
 * QUERIES PARA PROVEEDORES (SUPPLIERS)
 * =====================================================
 * Sistema completo de gestión de proveedores con
 * validaciones, búsqueda y estadísticas
 */

export type SupplierStatus = 'active' | 'inactive'
export type PaymentTerms = 'contado' | '15_dias' | '30_dias' | '45_dias' | '60_dias'

/**
 * Validar formato de RFC mexicano
 */
function validateMexicanRFC(rfc: string): boolean {
  const rfcPattern = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/
  return rfcPattern.test(rfc.toUpperCase())
}

/**
 * Validar formato de email
 */
function validateEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailPattern.test(email)
}

/**
 * Obtener todos los proveedores con filtros y paginación
 */
export async function getAllSuppliers(
  organizationId: string,
  filters?: {
    status?: SupplierStatus
    search?: string
    city?: string
    state?: string
    is_active?: boolean
    page?: number
    limit?: number
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    let query = supabase
      .from('suppliers')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true })

    // Aplicar filtros
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active)
    }

    if (filters?.city) {
      query = query.ilike('city', `%${filters.city}%`)
    }

    if (filters?.state) {
      query = query.ilike('state', `%${filters.state}%`)
    }

    if (filters?.search) {
      query = query.or(
        `name.ilike.%${filters.search}%,` +
        `email.ilike.%${filters.search}%,` +
        `tax_id.ilike.%${filters.search}%,` +
        `contact_person.ilike.%${filters.search}%`
      )
    }

    // Paginación
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    }
  }, { operation: 'getAllSuppliers', table: 'suppliers' })
}

/**
 * Obtener proveedor por ID con estadísticas
 */
export async function getSupplierById(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    // Obtener estadísticas básicas
    const { data: stats } = await supabase
      .from('purchase_orders')
      .select('id, total, status, order_date')
      .eq('supplier_id', id)

    const totalOrders = stats?.length || 0
    const totalSpent = stats?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const pendingOrders = stats?.filter(order => order.status === 'pending').length || 0

    return {
      ...data,
      stats: {
        total_orders: totalOrders,
        total_spent: totalSpent,
        pending_orders: pendingOrders,
        last_order_date: stats?.sort((a, b) => 
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
        )[0]?.order_date || null
      }
    }
  }, { operation: 'getSupplierById', table: 'suppliers' })
}

/**
 * Obtener solo proveedores activos
 */
export async function getActiveSuppliers(organizationId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, email, phone, contact_person')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error) throw error
    return data || []
  }, { operation: 'getActiveSuppliers', table: 'suppliers' })
}

/**
 * Crear nuevo proveedor
 */
export async function createSupplier(data: {
  organization_id: string
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  tax_id?: string
  payment_terms?: PaymentTerms
  notes?: string
}) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Validaciones
    if (!data.name.trim()) {
      throw new Error('El nombre del proveedor es requerido')
    }

    if (data.email && !validateEmail(data.email)) {
      throw new Error('El formato del email no es válido')
    }

    if (data.tax_id && !validateMexicanRFC(data.tax_id)) {
      throw new Error('El formato del RFC no es válido')
    }

    // Verificar que el nombre no esté duplicado en la organización
    const { data: existing } = await supabase
      .from('suppliers')
      .select('id')
      .eq('organization_id', data.organization_id)
      .eq('name', data.name.trim())
      .single()

    if (existing) {
      throw new Error(`Ya existe un proveedor con el nombre "${data.name}"`)
    }

    // Verificar que el email no esté duplicado
    if (data.email) {
      const { data: existingEmail } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', data.organization_id)
        .eq('email', data.email)
        .single()

      if (existingEmail) {
        throw new Error(`Ya existe un proveedor con el email "${data.email}"`)
      }
    }

    // Crear proveedor
    const { data: newSupplier, error } = await supabase
      .from('suppliers')
      .insert({
        ...data,
        name: data.name.trim(),
        country: data.country || 'México',
        payment_terms: data.payment_terms || '30_dias',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return newSupplier
  }, { operation: 'createSupplier', table: 'suppliers' })
}

/**
 * Actualizar proveedor
 */
export async function updateSupplier(
  id: string,
  data: {
    name?: string
    contact_person?: string
    email?: string
    phone?: string
    address?: string
    city?: string
    state?: string
    zip_code?: string
    country?: string
    tax_id?: string
    payment_terms?: PaymentTerms
    notes?: string
  }
) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Validaciones
    if (data.email && !validateEmail(data.email)) {
      throw new Error('El formato del email no es válido')
    }

    if (data.tax_id && !validateMexicanRFC(data.tax_id)) {
      throw new Error('El formato del RFC no es válido')
    }

    // Verificar que el nombre no esté duplicado (si se está cambiando)
    if (data.name) {
      const { data: current } = await supabase
        .from('suppliers')
        .select('organization_id, name')
        .eq('id', id)
        .single()

      if (current && current.name !== data.name.trim()) {
        const { data: existing } = await supabase
          .from('suppliers')
          .select('id')
          .eq('organization_id', current.organization_id)
          .eq('name', data.name.trim())
          .neq('id', id)
          .single()

        if (existing) {
          throw new Error(`Ya existe un proveedor con el nombre "${data.name}"`)
        }
      }
    }

    // Verificar que el email no esté duplicado (si se está cambiando)
    if (data.email) {
      const { data: existingEmail } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', (await supabase.from('suppliers').select('organization_id').eq('id', id).single()).data?.organization_id)
        .eq('email', data.email)
        .neq('id', id)
        .single()

      if (existingEmail) {
        throw new Error(`Ya existe un proveedor con el email "${data.email}"`)
      }
    }

    // Actualizar proveedor
    const { data: updatedSupplier, error } = await supabase
      .from('suppliers')
      .update({
        ...data,
        name: data.name?.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return updatedSupplier
  }, { operation: 'updateSupplier', table: 'suppliers' })
}

/**
 * Desactivar proveedor (soft delete)
 */
export async function deactivateSupplier(id: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Verificar que no tenga órdenes de compra pendientes
    const { data: pendingOrders } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('supplier_id', id)
      .in('status', ['pending', 'confirmed', 'shipped'])
      .limit(1)

    if (pendingOrders && pendingOrders.length > 0) {
      throw new Error('No se puede desactivar el proveedor porque tiene órdenes de compra pendientes')
    }

    // Desactivar proveedor
    const { data: deactivatedSupplier, error } = await supabase
      .from('suppliers')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return deactivatedSupplier
  }, { operation: 'deactivateSupplier', table: 'suppliers' })
}

/**
 * Buscar proveedores
 */
export async function searchSuppliers(organizationId: string, query: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, email, phone, contact_person, city, state')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .or(
        `name.ilike.%${query}%,` +
        `email.ilike.%${query}%,` +
        `tax_id.ilike.%${query}%,` +
        `contact_person.ilike.%${query}%`
      )
      .order('name', { ascending: true })
      .limit(20)

    if (error) throw error
    return data || []
  }, { operation: 'searchSuppliers', table: 'suppliers' })
}

/**
 * Obtener estadísticas del proveedor
 */
export async function getSupplierStats(supplierId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    // Obtener órdenes de compra
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('id, total, status, order_date, expected_delivery_date')
      .eq('supplier_id', supplierId)
      .order('order_date', { ascending: false })

    if (ordersError) throw ordersError

    // Obtener pagos
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id, amount, payment_date, status')
      .eq('supplier_id', supplierId)
      .order('payment_date', { ascending: false })

    if (paymentsError) throw paymentsError

    // Calcular estadísticas
    const totalOrders = orders?.length || 0
    const totalSpent = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0
    const totalPaid = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
    const pendingAmount = totalSpent - totalPaid

    const statusCounts = orders?.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return {
      total_orders: totalOrders,
      total_spent: totalSpent,
      total_paid: totalPaid,
      pending_amount: pendingAmount,
      status_breakdown: statusCounts,
      last_order_date: orders?.[0]?.order_date || null,
      last_payment_date: payments?.[0]?.payment_date || null
    }
  }, { operation: 'getSupplierStats', table: 'suppliers' })
}

/**
 * Obtener historial de pagos del proveedor
 */
export async function getPaymentHistory(supplierId: string) {
  return executeWithErrorHandling(async () => {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('payments')
      .select(`
        id,
        amount,
        payment_date,
        payment_method,
        status,
        reference,
        notes,
        purchase_orders (
          id,
          order_number
        )
      `)
      .eq('supplier_id', supplierId)
      .order('payment_date', { ascending: false })

    if (error) throw error
    return data || []
  }, { operation: 'getPaymentHistory', table: 'payments' })
}

