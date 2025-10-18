/**
 * Servicio de Proveedores
 * Funciones para manejar proveedores del sistema
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Supplier, SupplierInsert, SupplierUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Supplier

export interface SupplierStats {
  total: number
  active: number
  inactive: number
  withEmail: number
  withPhone: number
}

export interface CreateSupplier {
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
  payment_terms?: string
  notes?: string
  is_active?: boolean
  created_by?: string
}

export interface UpdateSupplier {
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
  payment_terms?: string
  notes?: string
  is_active?: boolean
  updated_by?: string
}

/**
 * Obtener proveedores
 */
export async function getSuppliers(filters?: {
  is_active?: boolean
  search?: string
}): Promise<Supplier[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('suppliers').select('*')
      
      if (filters) {
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
        }
      }
      
      const { data, error } = await query
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch suppliers: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getSuppliers',
      table: 'suppliers'
    }
  )
}

/**
 * Obtener estadísticas de proveedores
 */
export async function getSupplierStats(): Promise<SupplierStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('suppliers')
        .select('is_active, email, phone')
      
      if (error) {
        throw new Error(`Failed to fetch supplier stats: ${error.message}`)
      }
      
      const total = data?.length || 0
      const active = data?.filter(s => s.is_active).length || 0
      const inactive = data?.filter(s => !s.is_active).length || 0
      const withEmail = data?.filter(s => s.email).length || 0
      const withPhone = data?.filter(s => s.phone).length || 0
      
      return {
        total,
        active,
        inactive,
        withEmail,
        withPhone
      }
    },
    {
      operation: 'getSupplierStats',
      table: 'suppliers'
    }
  )
}

/**
 * Crear proveedor
 */
export async function createSupplier(supplier: CreateSupplier): Promise<Supplier> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('suppliers')
        .insert({
          ...supplier,
          organization_id: '00000000-0000-0000-0000-000000000000', // Default organization for now
          is_active: supplier.is_active ?? true
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create supplier: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createSupplier',
      table: 'suppliers'
    }
  )
}

/**
 * Actualizar proveedor
 */
export async function updateSupplier(id: string, supplier: UpdateSupplier): Promise<Supplier> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('suppliers')
        .update(supplier)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update supplier: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateSupplier',
      table: 'suppliers'
    }
  )
}

/**
 * Obtener proveedor por ID
 */
export async function getSupplierById(id: string): Promise<Supplier | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw new Error(`Failed to fetch supplier: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getSupplierById',
      table: 'suppliers'
    }
  )
}

/**
 * Buscar proveedores
 */
export async function searchSuppliers(searchTerm: string): Promise<Supplier[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('suppliers')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to search suppliers: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchSuppliers',
      table: 'suppliers'
    }
  )
}

/**
 * Eliminar proveedor
 */
export async function deleteSupplier(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('suppliers')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete supplier: ${error.message}`)
      }
    },
    {
      operation: 'deleteSupplier',
      table: 'suppliers'
    }
  )
}


