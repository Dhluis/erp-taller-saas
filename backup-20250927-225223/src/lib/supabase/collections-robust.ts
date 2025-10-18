/**
 * Funciones de Collections Refactorizadas con Manejo Robusto de Errores
 * Implementación completa con retry logic, logging y validación
 */

import { getClient, safeOperation } from './client'
import { AppError, SupabaseError, ValidationError } from '@/lib/errors'

// Tipos para Collections
export interface Collection {
  id: string
  organization_id: string
  client_id: string
  invoice_id: string
  amount: number
  collection_date: string
  payment_method: 'cash' | 'transfer' | 'card' | 'check'
  reference?: string
  status: 'pending' | 'completed' | 'overdue'
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateCollectionData {
  organization_id: string
  client_id: string
  invoice_id: string
  amount: number
  collection_date: string
  payment_method: 'cash' | 'transfer' | 'card' | 'check'
  reference?: string
  status?: 'pending' | 'completed' | 'overdue'
  notes?: string
}

export interface UpdateCollectionData {
  client_id?: string
  invoice_id?: string
  amount?: number
  collection_date?: string
  payment_method?: 'cash' | 'transfer' | 'card' | 'check'
  reference?: string
  status?: 'pending' | 'completed' | 'overdue'
  notes?: string
}

export interface CollectionStats {
  total_collections: number
  completed_collections: number
  pending_collections: number
  overdue_collections: number
  total_amount_collected: number
  total_amount_pending: number
  total_amount_overdue: number
  average_collection_amount: number
  collection_rate: number
}

/**
 * Validar datos de Collection
 */
function validateCollectionData(data: any): void {
  if (!data.client_id || typeof data.client_id !== 'string') {
    throw new ValidationError('client_id is required and must be a string')
  }
  
  if (!data.invoice_id || typeof data.invoice_id !== 'string') {
    throw new ValidationError('invoice_id is required and must be a string')
  }
  
  if (!data.amount || typeof data.amount !== 'number' || data.amount <= 0) {
    throw new ValidationError('amount is required and must be a positive number')
  }
  
  if (!data.collection_date || typeof data.collection_date !== 'string') {
    throw new ValidationError('collection_date is required and must be a string')
  }
  
  if (!data.payment_method || !['cash', 'transfer', 'card', 'check'].includes(data.payment_method)) {
    throw new ValidationError('payment_method must be one of: cash, transfer, card, check')
  }
  
  if (data.status && !['pending', 'completed', 'overdue'].includes(data.status)) {
    throw new ValidationError('status must be one of: pending, completed, overdue')
  }
}

/**
 * Obtener todas las collections con manejo robusto de errores
 */
export async function getCollections(): Promise<Collection[]> {
  return safeOperation(
    async () => {
      const client = getClient()
      
      const { data, error } = await client
        .from('collections')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_id,
          amount,
          collection_date,
          payment_method,
          reference,
          status,
          notes,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false })

      if (error) {
        throw new SupabaseError('Error fetching collections', error)
      }

      if (!data) {
        console.log('No collections found in database')
        return []
      }

      // Validar que los datos tienen la estructura esperada
      const validCollections = data.filter(collection => {
        return collection.id && 
               collection.client_id && 
               collection.invoice_id && 
               collection.amount !== undefined
      })

      if (validCollections.length !== data.length) {
        console.warn(`⚠️ ${data.length - validCollections.length} collections with invalid data filtered out`)
      }

      return validCollections as Collection[]
    },
    {
      operation: 'getCollections',
      table: 'collections',
      query: 'SELECT * FROM collections ORDER BY created_at DESC'
    }
  )
}

/**
 * Obtener collection por ID
 */
export async function getCollectionById(id: string): Promise<Collection | null> {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('id is required and must be a string')
  }

  return safeOperation(
    async () => {
      const client = getClient()
      
      const { data, error } = await client
        .from('collections')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_id,
          amount,
          collection_date,
          payment_method,
          reference,
          status,
          notes,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw new SupabaseError('Error fetching collection by ID', error)
      }

      return data as Collection
    },
    {
      operation: 'getCollectionById',
      table: 'collections',
      query: `SELECT * FROM collections WHERE id = '${id}'`
    }
  )
}

/**
 * Crear nueva collection
 */
export async function createCollection(data: CreateCollectionData): Promise<Collection> {
  // Validar datos de entrada
  validateCollectionData(data)

  return safeOperation(
    async () => {
      const client = getClient()
      
      const { data: newCollection, error } = await client
        .from('collections')
        .insert([{
          organization_id: data.organization_id,
          client_id: data.client_id,
          invoice_id: data.invoice_id,
          amount: data.amount,
          collection_date: data.collection_date,
          payment_method: data.payment_method,
          reference: data.reference,
          status: data.status || 'pending',
          notes: data.notes
        }])
        .select(`
          id,
          organization_id,
          client_id,
          invoice_id,
          amount,
          collection_date,
          payment_method,
          reference,
          status,
          notes,
          created_at,
          updated_at
        `)
        .single()

      if (error) {
        throw new SupabaseError('Error creating collection', error)
      }

      if (!newCollection) {
        throw new SupabaseError('Collection was not created')
      }

      return newCollection as Collection
    },
    {
      operation: 'createCollection',
      table: 'collections',
      query: 'INSERT INTO collections (...) VALUES (...)'
    }
  )
}

/**
 * Actualizar collection
 */
export async function updateCollection(id: string, data: UpdateCollectionData): Promise<Collection> {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('id is required and must be a string')
  }

  // Validar datos de entrada si se proporcionan
  if (data.client_id || data.invoice_id || data.amount || data.collection_date || data.payment_method) {
    validateCollectionData(data)
  }

  return safeOperation(
    async () => {
      const client = getClient()
      
      const { data: updatedCollection, error } = await client
        .from('collections')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          id,
          organization_id,
          client_id,
          invoice_id,
          amount,
          collection_date,
          payment_method,
          reference,
          status,
          notes,
          created_at,
          updated_at
        `)
        .single()

      if (error) {
        throw new SupabaseError('Error updating collection', error)
      }

      if (!updatedCollection) {
        throw new SupabaseError('Collection was not updated')
      }

      return updatedCollection as Collection
    },
    {
      operation: 'updateCollection',
      table: 'collections',
      query: `UPDATE collections SET ... WHERE id = '${id}'`
    }
  )
}

/**
 * Eliminar collection
 */
export async function deleteCollection(id: string): Promise<boolean> {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('id is required and must be a string')
  }

  return safeOperation(
    async () => {
      const client = getClient()
      
      const { error } = await client
        .from('collections')
        .delete()
        .eq('id', id)

      if (error) {
        throw new SupabaseError('Error deleting collection', error)
      }

      return true
    },
    {
      operation: 'deleteCollection',
      table: 'collections',
      query: `DELETE FROM collections WHERE id = '${id}'`
    }
  )
}

/**
 * Obtener estadísticas de collections con manejo robusto de errores
 */
export async function getCollectionStats(): Promise<CollectionStats> {
  return safeOperation(
    async () => {
      const client = getClient()
      
      // Obtener todas las collections para calcular estadísticas
      const { data: collections, error } = await client
        .from('collections')
        .select('amount, status')

      if (error) {
        throw new SupabaseError('Error fetching collection stats', error)
      }

      if (!collections || collections.length === 0) {
        console.log('No collections found for stats calculation')
        return {
          total_collections: 0,
          completed_collections: 0,
          pending_collections: 0,
          overdue_collections: 0,
          total_amount_collected: 0,
          total_amount_pending: 0,
          total_amount_overdue: 0,
          average_collection_amount: 0,
          collection_rate: 0
        }
      }

      // Calcular estadísticas
      const totalCollections = collections.length
      const completedCollections = collections.filter(c => c.status === 'completed').length
      const pendingCollections = collections.filter(c => c.status === 'pending').length
      const overdueCollections = collections.filter(c => c.status === 'overdue').length
      
      const totalAmountCollected = collections
        .filter(c => c.status === 'completed')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      
      const totalAmountPending = collections
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      
      const totalAmountOverdue = collections
        .filter(c => c.status === 'overdue')
        .reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      
      const totalAmount = totalAmountCollected + totalAmountPending + totalAmountOverdue
      const averageCollectionAmount = totalCollections > 0 ? totalAmount / totalCollections : 0
      const collectionRate = totalCollections > 0 ? (completedCollections / totalCollections) * 100 : 0

      const stats: CollectionStats = {
        total_collections: totalCollections,
        completed_collections: completedCollections,
        pending_collections: pendingCollections,
        overdue_collections: overdueCollections,
        total_amount_collected: totalAmountCollected,
        total_amount_pending: totalAmountPending,
        total_amount_overdue: totalAmountOverdue,
        average_collection_amount: averageCollectionAmount,
        collection_rate: collectionRate
      }

      console.log('📊 Collection stats calculated:', {
        total: totalCollections,
        completed: completedCollections,
        pending: pendingCollections,
        overdue: overdueCollections,
        totalAmount,
        averageAmount: averageCollectionAmount,
        collectionRate: `${collectionRate.toFixed(2)}%`
      })

      return stats
    },
    {
      operation: 'getCollectionStats',
      table: 'collections',
      query: 'SELECT amount, status FROM collections'
    }
  )
}

/**
 * Obtener collections por cliente
 */
export async function getCollectionsByClient(clientId: string): Promise<Collection[]> {
  if (!clientId || typeof clientId !== 'string') {
    throw new ValidationError('clientId is required and must be a string')
  }

  return safeOperation(
    async () => {
      const client = getClient()
      
      const { data, error } = await client
        .from('collections')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_id,
          amount,
          collection_date,
          payment_method,
          reference,
          status,
          notes,
          created_at,
          updated_at
        `)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })

      if (error) {
        throw new SupabaseError('Error fetching collections by client', error)
      }

      return (data || []) as Collection[]
    },
    {
      operation: 'getCollectionsByClient',
      table: 'collections',
      query: `SELECT * FROM collections WHERE client_id = '${clientId}'`
    }
  )
}

/**
 * Obtener collections pendientes
 */
export async function getPendingCollections(): Promise<Collection[]> {
  return safeOperation(
    async () => {
      const client = getClient()
      
      const { data, error } = await client
        .from('collections')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_id,
          amount,
          collection_date,
          payment_method,
          reference,
          status,
          notes,
          created_at,
          updated_at
        `)
        .eq('status', 'pending')
        .order('collection_date', { ascending: true })

      if (error) {
        throw new SupabaseError('Error fetching pending collections', error)
      }

      return (data || []) as Collection[]
    },
    {
      operation: 'getPendingCollections',
      table: 'collections',
      query: "SELECT * FROM collections WHERE status = 'pending'"
    }
  )
}

/**
 * Obtener collections vencidas
 */
export async function getOverdueCollections(): Promise<Collection[]> {
  return safeOperation(
    async () => {
      const client = getClient()
      
      const { data, error } = await client
        .from('collections')
        .select(`
          id,
          organization_id,
          client_id,
          invoice_id,
          amount,
          collection_date,
          payment_method,
          reference,
          status,
          notes,
          created_at,
          updated_at
        `)
        .eq('status', 'overdue')
        .order('collection_date', { ascending: true })

      if (error) {
        throw new SupabaseError('Error fetching overdue collections', error)
      }

      return (data || []) as Collection[]
    },
    {
      operation: 'getOverdueCollections',
      table: 'collections',
      query: "SELECT * FROM collections WHERE status = 'overdue'"
    }
  )
}
