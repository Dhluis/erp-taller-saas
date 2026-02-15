/**
 * Servicio de Cobros (Collections)
 * Funciones para manejar cobros y pagos de clientes
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'

export interface Collection {
  id: string
  customer_id: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  notes?: string
  payment_method?: string
  paid_date?: string
  reference_number?: string
}

export interface CreateCollectionData {
  customer_id: string
  amount: number
  currency: string
  due_date: string
  created_by?: string
  notes?: string
  reference_number?: string
}

export interface UpdateCollectionData {
  amount?: number
  currency?: string
  status?: string
  due_date?: string
  notes?: string
  payment_method?: string
  paid_date?: string
  reference_number?: string
}

/**
 * Obtener cobros (requiere organization_id para filtrado multi-tenant)
 */
export async function getCollections(organizationId: string | null, filters?: {
  customer_id?: string
  status?: string
  date_from?: string
  date_to?: string
}): Promise<Collection[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('collections').select('*')
      
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }
      
      if (filters) {
        if (filters.customer_id) {
          query = query.eq('customer_id', filters.customer_id)
        }
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.date_from) {
          query = query.gte('due_date', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('due_date', filters.date_to)
        }
      }
      
      const { data, error } = await query
        .order('due_date', { ascending: false })
      
      if (error) {
        // Si la tabla no existe, retornar array vacío en lugar de lanzar error
        if (error.message.includes('Could not find the table') || error.code === '42P01') {
          console.warn('Table collections does not exist, returning empty array')
          return []
        }
        throw new Error(`Failed to fetch collections: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getCollections',
      table: 'collections'
    }
  )
}

/**
 * Obtener estadísticas de cobros (requiere organization_id para filtrado multi-tenant)
 */
export async function getCollectionStats(organizationId: string | null): Promise<{
  total: number
  pending: number
  paid: number
  overdue: number
  totalAmount: number
  totalPaid: number
  totalPending: number
}> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('collections').select('status, amount')
      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }
      const { data, error } = await query
      
      if (error) {
        // Si la tabla no existe, retornar datos vacíos en lugar de lanzar error
        if (error.message.includes('Could not find the table') || error.code === '42P01') {
          console.warn('Table collections does not exist, returning empty stats')
          return {
            total: 0,
            pending: 0,
            paid: 0,
            overdue: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalPending: 0
          }
        }
        throw new Error(`Failed to fetch collection stats: ${error.message}`)
      }
      
      const collections = data || []
      const total = collections.length
      const pending = collections.filter(c => c.status === 'pending').length
      const paid = collections.filter(c => c.status === 'paid').length
      const overdue = collections.filter(c => c.status === 'overdue').length
      
      const totalAmount = collections.reduce((sum, c) => sum + c.amount, 0)
      const totalPaid = collections.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0)
      const totalPending = collections.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
      
      return {
        total,
        pending,
        paid,
        overdue,
        totalAmount,
        totalPaid,
        totalPending
      }
    },
    {
      operation: 'getCollectionStats',
      table: 'collections'
    }
  )
}

/**
 * Obtener cobro por ID
 */
export async function getCollectionById(id: string): Promise<Collection | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('collections')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch collection: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getCollectionById',
      table: 'collections'
    }
  )
}

/**
 * Crear cobro (requiere organization_id para multi-tenant)
 */
export async function createCollection(organizationId: string, collection: CreateCollectionData): Promise<Collection> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('collections')
        .insert({
          ...collection,
          organization_id: organizationId,
          status: 'pending'
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create collection: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createCollection',
      table: 'collections'
    }
  )
}

/**
 * Actualizar cobro
 */
export async function updateCollection(id: string, collection: UpdateCollectionData): Promise<Collection> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('collections')
        .update({
          ...collection,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update collection: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateCollection',
      table: 'collections'
    }
  )
}

/**
 * Marcar cobro como pagado
 */
export async function markAsPaid(id: string, paymentMethod: string): Promise<Collection> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('collections')
        .update({
          status: 'paid',
          payment_method: paymentMethod,
          paid_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to mark collection as paid: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'markAsPaid',
      table: 'collections'
    }
  )
}

/**
 * Buscar cobros por número de referencia o notas
 */
export async function searchCollections(searchTerm: string): Promise<Collection[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('collections')
        .select('*')
        .or(`reference_number.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
        .order('due_date', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to search collections: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchCollections',
      table: 'collections'
    }
  )
}

/**
 * Obtener cobros vencidos
 */
export async function getOverdueCollections(): Promise<Collection[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      const today = new Date().toISOString()
      
      const { data, error } = await client
        .from('collections')
        .select('*')
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch overdue collections: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getOverdueCollections',
      table: 'collections'
    }
  )
}

/**
 * Eliminar cobro
 */
export async function deleteCollection(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('collections')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete collection: ${error.message}`)
      }
    },
    {
      operation: 'deleteCollection',
      table: 'collections'
    }
  )
}







