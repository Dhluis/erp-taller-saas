import { createClient } from '@/lib/supabase/server'

/**
 * Tipo para el modelo Customer
 */
export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  organization_id: string
  created_at: string
  updated_at: string
}

/**
 * Obtener todos los clientes
 */
export async function getAllCustomers(organizationId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('customers')
    .select('*')
    .order('name')

  // Si se proporciona organizationId, filtrar por organización
  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  const { data: customers, error } = await query

  if (error) {
    console.error('Error fetching customers:', error)
    throw new Error('Error al obtener clientes')
  }

  return customers || []
}

/**
 * Obtener un cliente por ID
 */
export async function getCustomerById(id: string) {
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching customer by id:', error)
    throw new Error('Error al obtener el cliente')
  }

  return customer
}

/**
 * Crear un nuevo cliente
 */
export async function createCustomer(data: {
  name: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  organization_id: string
}) {
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('Error creating customer:', error)
    throw new Error('Error al crear el cliente')
  }

  return customer
}

/**
 * Actualizar un cliente
 */
export async function updateCustomer(id: string, data: {
  name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
}) {
  const supabase = await createClient()

  const { data: customer, error } = await supabase
    .from('customers')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating customer:', error)
    throw new Error('Error al actualizar el cliente')
  }

  return customer
}

/**
 * Eliminar un cliente
 */
export async function deleteCustomer(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting customer:', error)
    throw new Error('Error al eliminar el cliente')
  }

  return { success: true }
}
