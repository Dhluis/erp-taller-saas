/**
 * Servicio de Collections (Cobros) - Implementación Robusta
 * Basado en BaseService con operaciones específicas de cobros
 */

import { BaseService, PaginatedResult, FilterOptions } from '../core/base-service'
import { z } from 'zod'
import { executeWithErrorHandling } from '../core/errors'

// Esquema de validación para Collection
const CollectionSchema = z.object({
  id: z.string().uuid(),
  customer_id: z.string().uuid(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  due_date: z.string().datetime(),
  paid_date: z.string().datetime().optional(),
  payment_method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  created_by: z.string().uuid().optional(),
  updated_by: z.string().uuid().optional()
})

export type Collection = z.infer<typeof CollectionSchema>

// Esquema para crear Collection
const CreateCollectionSchema = CollectionSchema.omit({
  id: true,
  created_at: true,
  updated_at: true
})

export type CreateCollection = z.infer<typeof CreateCollectionSchema>

// Esquema para actualizar Collection
const UpdateCollectionSchema = CollectionSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true
})

export type UpdateCollection = z.infer<typeof UpdateCollectionSchema>

// Estadísticas de Collections
export interface CollectionStats {
  total: number
  pending: number
  paid: number
  overdue: number
  cancelled: number
  totalAmount: number
  pendingAmount: number
  overdueAmount: number
  averageAmount: number
  collectionRate: number
  overdueRate: number
}

// Filtros específicos para Collections
export interface CollectionFilters extends FilterOptions {
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled'
  customer_id?: string
  due_date_from?: string
  due_date_to?: string
  amount_min?: number
  amount_max?: number
  currency?: string
  created_by?: string
}

/**
 * Servicio de Collections
 */
export class CollectionsService extends BaseService<Collection> {
  constructor() {
    super('collections', CollectionSchema)
  }

  /**
   * Obtener collections con filtros específicos
   */
  async getCollections(filters?: CollectionFilters): Promise<Collection[]> {
    return executeWithErrorHandling(
      async () => {
        let query = this.client.from('collections')
        
        if (filters) {
          // Filtro por status
          if (filters.status) {
            query = query.eq('status', filters.status)
          }
          
          // Filtro por customer
          if (filters.customer_id) {
            query = query.eq('customer_id', filters.customer_id)
          }
          
          // Filtro por rango de fechas
          if (filters.due_date_from) {
            query = query.gte('due_date', filters.due_date_from)
          }
          if (filters.due_date_to) {
            query = query.lte('due_date', filters.due_date_to)
          }
          
          // Filtro por rango de montos
          if (filters.amount_min) {
            query = query.gte('amount', filters.amount_min)
          }
          if (filters.amount_max) {
            query = query.lte('amount', filters.amount_max)
          }
          
          // Filtro por moneda
          if (filters.currency) {
            query = query.eq('currency', filters.currency)
          }
          
          // Filtro por creador
          if (filters.created_by) {
            query = query.eq('created_by', filters.created_by)
          }
        }
        
        const { data, error } = await query
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) {
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
   * Obtener collections paginadas
   */
  async getCollectionsPaginated(
    filters?: CollectionFilters,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResult<Collection>> {
    return executeWithErrorHandling(
      async () => {
        // Obtener total
        const { count, error: countError } = await this.client
          .from('collections')
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          throw new Error(`Failed to count collections: ${countError.message}`)
        }
        
        // Obtener datos paginados
        const data = await this.getCollections(filters)
        const startIndex = (page - 1) * limit
        const endIndex = startIndex + limit
        const paginatedData = data.slice(startIndex, endIndex)
        
        const total = count || 0
        const totalPages = Math.ceil(total / limit)
        
        return {
          data: paginatedData,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
          }
        }
      },
      {
        operation: 'getCollectionsPaginated',
        table: 'collections'
      }
    )
  }

  /**
   * Obtener estadísticas de collections
   */
  async getCollectionStats(): Promise<CollectionStats> {
    return executeWithErrorHandling(
      async () => {
        const { data, error } = await this.client
          .from('collections')
          .select('status, amount, due_date, paid_date')
        
        if (error) {
          throw new Error(`Failed to fetch collection stats: ${error.message}`)
        }
        
        if (!data || data.length === 0) {
          return {
            total: 0,
            pending: 0,
            paid: 0,
            overdue: 0,
            cancelled: 0,
            totalAmount: 0,
            pendingAmount: 0,
            overdueAmount: 0,
            averageAmount: 0,
            collectionRate: 0,
            overdueRate: 0
          }
        }
        
        const now = new Date()
        const today = now.toISOString().split('T')[0]
        
        let total = data.length
        let pending = 0
        let paid = 0
        let overdue = 0
        let cancelled = 0
        let totalAmount = 0
        let pendingAmount = 0
        let overdueAmount = 0
        
        data.forEach(collection => {
          totalAmount += collection.amount || 0
          
          switch (collection.status) {
            case 'pending':
              pending++
              pendingAmount += collection.amount || 0
              // Verificar si está vencido
              if (collection.due_date && collection.due_date < today) {
                overdue++
                overdueAmount += collection.amount || 0
              }
              break
            case 'paid':
              paid++
              break
            case 'cancelled':
              cancelled++
              break
          }
        })
        
        const averageAmount = total > 0 ? totalAmount / total : 0
        const collectionRate = total > 0 ? (paid / total) * 100 : 0
        const overdueRate = total > 0 ? (overdue / total) * 100 : 0
        
        return {
          total,
          pending,
          paid,
          overdue,
          cancelled,
          totalAmount,
          pendingAmount,
          overdueAmount,
          averageAmount,
          collectionRate,
          overdueRate
        }
      },
      {
        operation: 'getCollectionStats',
        table: 'collections'
      }
    )
  }

  /**
   * Crear collection
   */
  async createCollection(data: CreateCollection): Promise<Collection> {
    return executeWithErrorHandling(
      async () => {
        // Validar datos
        const validatedData = CreateCollectionSchema.parse(data)
        
        const { data: result, error } = await this.client
          .from('collections')
          .insert(validatedData)
          .select()
          .single()
        
        if (error) {
          throw new Error(`Failed to create collection: ${error.message}`)
        }
        
        return result
      },
      {
        operation: 'createCollection',
        table: 'collections'
      }
    )
  }

  /**
   * Actualizar collection
   */
  async updateCollection(id: string, data: UpdateCollection): Promise<Collection> {
    return executeWithErrorHandling(
      async () => {
        // Validar datos
        const validatedData = UpdateCollectionSchema.parse(data)
        
        const { data: result, error } = await this.client
          .from('collections')
          .update(validatedData)
          .eq('id', id)
          .select()
          .single()
        
        if (error) {
          throw new Error(`Failed to update collection: ${error.message}`)
        }
        
        return result
      },
      {
        operation: 'updateCollection',
        table: 'collections',
        query: `id=${id}`
      }
    )
  }

  /**
   * Marcar como pagado
   */
  async markAsPaid(id: string, paymentMethod?: string): Promise<Collection> {
    return executeWithErrorHandling(
      async () => {
        const updateData: UpdateCollection = {
          status: 'paid',
          paid_date: new Date().toISOString(),
          payment_method: paymentMethod
        }
        
        return await this.updateCollection(id, updateData)
      },
      {
        operation: 'markAsPaid',
        table: 'collections',
        query: `id=${id}`
      }
    )
  }

  /**
   * Marcar como vencido
   */
  async markAsOverdue(id: string): Promise<Collection> {
    return executeWithErrorHandling(
      async () => {
        const updateData: UpdateCollection = {
          status: 'overdue'
        }
        
        return await this.updateCollection(id, updateData)
      },
      {
        operation: 'markAsOverdue',
        table: 'collections',
        query: `id=${id}`
      }
    )
  }

  /**
   * Cancelar collection
   */
  async cancelCollection(id: string, reason?: string): Promise<Collection> {
    return executeWithErrorHandling(
      async () => {
        const updateData: UpdateCollection = {
          status: 'cancelled',
          notes: reason ? `${reason} (Cancelled)` : 'Cancelled'
        }
        
        return await this.updateCollection(id, updateData)
      },
      {
        operation: 'cancelCollection',
        table: 'collections',
        query: `id=${id}`
      }
    )
  }

  /**
   * Obtener collections por customer
   */
  async getCollectionsByCustomer(customerId: string): Promise<Collection[]> {
    return executeWithErrorHandling(
      async () => {
        const { data, error } = await this.client
          .from('collections')
          .select('*')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false })
        
        if (error) {
          throw new Error(`Failed to fetch collections by customer: ${error.message}`)
        }
        
        return data || []
      },
      {
        operation: 'getCollectionsByCustomer',
        table: 'collections',
        query: `customer_id=${customerId}`
      }
    )
  }

  /**
   * Obtener collections vencidas
   */
  async getOverdueCollections(): Promise<Collection[]> {
    return executeWithErrorHandling(
      async () => {
        const today = new Date().toISOString().split('T')[0]
        
        const { data, error } = await this.client
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
   * Buscar collections
   */
  async searchCollections(searchTerm: string): Promise<Collection[]> {
    return executeWithErrorHandling(
      async () => {
        const { data, error } = await this.client
          .from('collections')
          .select('*')
          .or(`reference.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
        
        if (error) {
          throw new Error(`Failed to search collections: ${error.message}`)
        }
        
        return data || []
      },
      {
        operation: 'searchCollections',
        table: 'collections',
        query: `search=${searchTerm}`
      }
    )
  }
}

// Instancia singleton del servicio
export const collectionsService = new CollectionsService()