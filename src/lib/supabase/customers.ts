/**
 * Servicio de Clientes
 * Funciones para manejar clientes del sistema
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Customer, CustomerInsert, CustomerUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Customer

export interface CustomerStats {
  total: number
  active: number
  inactive: number
  withEmail: number
  withPhone: number
}

export interface CreateCustomer {
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  tax_id?: string
  notes?: string
  created_by?: string
}

export interface UpdateCustomer {
  name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  tax_id?: string
  notes?: string
  is_active?: boolean
  updated_by?: string
}

/**
 * Obtener clientes
 */
export async function getCustomers(filters?: {
  is_active?: boolean
  search?: string
}): Promise<Customer[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('customers').select('*')
      
      if (filters) {
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
        }
      }
      
      const { data, error } = await query
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch customers: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getCustomers',
      table: 'customers'
    }
  )
}

/**
 * Obtener estadísticas de clientes
 */
export async function getCustomerStats(): Promise<CustomerStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('customers')
        .select('is_active, email, phone')
      
      if (error) {
        throw new Error(`Failed to fetch customer stats: ${error.message}`)
      }
      
      const total = data?.length || 0
      const active = data?.filter(c => c.is_active).length || 0
      const inactive = data?.filter(c => !c.is_active).length || 0
      const withEmail = data?.filter(c => c.email).length || 0
      const withPhone = data?.filter(c => c.phone).length || 0
      
      return {
        total,
        active,
        inactive,
        withEmail,
        withPhone
      }
    },
    {
      operation: 'getCustomerStats',
      table: 'customers'
    }
  )
}

/**
 * Crear cliente
 */
export async function createCustomer(customer: CreateCustomer): Promise<Customer> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('customers')
        .insert({
          ...customer,
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create customer: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createCustomer',
      table: 'customers'
    }
  )
}

/**
 * Actualizar cliente
 */
export async function updateCustomer(id: string, customer: UpdateCustomer): Promise<Customer> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('customers')
        .update(customer)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update customer: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateCustomer',
      table: 'customers'
    }
  )
}

/**
 * Obtener cliente por ID
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw new Error(`Failed to fetch customer: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getCustomerById',
      table: 'customers'
    }
  )
}

/**
 * Buscar clientes
 */
export async function searchCustomers(searchTerm: string): Promise<Customer[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('customers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to search customers: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchCustomers',
      table: 'customers'
    }
  )
}

/**
 * Eliminar cliente
 */
export async function deleteCustomer(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('customers')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete customer: ${error.message}`)
      }
    },
    {
      operation: 'deleteCustomer',
      table: 'customers'
    }
  )
}






