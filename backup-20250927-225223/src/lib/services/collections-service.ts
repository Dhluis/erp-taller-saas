/**
 * Servicio de Collections Refactorizado
 * Implementación robusta usando el servicio base
 */

import { BaseService, BaseEntity, PaginationOptions } from '@/lib/core/base-service'
import { z } from 'zod'

// Esquema de validación para Collection
const CollectionSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  client_id: z.string().min(1, 'client_id es requerido'),
  invoice_id: z.string().min(1, 'invoice_id es requerido'),
  amount: z.number().positive('amount debe ser positivo'),
  collection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'collection_date debe tener formato YYYY-MM-DD'),
  payment_method: z.enum(['cash', 'transfer', 'card', 'check']),
  reference: z.string().optional(),
  status: z.enum(['pending', 'completed', 'overdue']),
  notes: z.string().optional(),
  created_at: z.string(),
  updated_at: z.string()
})

// Tipo de Collection
export interface Collection extends BaseEntity {
  client_id: string
  invoice_id: string
  amount: number
  collection_date: string
  payment_method: 'cash' | 'transfer' | 'card' | 'check'
  reference?: string
  status: 'pending' | 'completed' | 'overdue'
  notes?: string
}

// Tipo para crear Collection
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

// Tipo para actualizar Collection
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

// Estadísticas de Collections
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
 * Servicio de Collections
 */
export class CollectionsService extends BaseService<Collection> {
  constructor(useServerClient: boolean = false) {
    super({
      tableName: 'collections',
      schema: CollectionSchema,
      searchColumns: ['client_id', 'invoice_id', 'reference', 'notes'],
      defaultOrderBy: 'created_at',
      defaultLimit: 20
    }, useServerClient)
  }

  /**
   * Obtener collections por cliente
   */
  async getByClient(clientId: string, options: PaginationOptions = {}): Promise<Collection[]> {
    return this.getByFilters({ client_id: clientId }, options)
  }

  /**
   * Obtener collections por estado
   */
  async getByStatus(status: 'pending' | 'completed' | 'overdue', options: PaginationOptions = {}): Promise<Collection[]> {
    return this.getByFilters({ status }, options)
  }

  /**
   * Obtener collections pendientes
   */
  async getPending(options: PaginationOptions = {}): Promise<Collection[]> {
    return this.getByStatus('pending', options)
  }

  /**
   * Obtener collections vencidas
   */
  async getOverdue(options: PaginationOptions = {}): Promise<Collection[]> {
    return this.getByStatus('overdue', options)
  }

  /**
   * Obtener collections completadas
   */
  async getCompleted(options: PaginationOptions = {}): Promise<Collection[]> {
    return this.getByStatus('completed', options)
  }

  /**
   * Obtener estadísticas detalladas
   */
  async getStats(): Promise<CollectionStats> {
    const { data: collections, error } = await this.getClient()
      .from(this.getTableName())
      .select('amount, status')

    if (error) throw error

    if (!collections || collections.length === 0) {
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

    return {
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
  }

  /**
   * Crear collection con validación específica
   */
  async createCollection(data: CreateCollectionData): Promise<Collection> {
    // Validaciones específicas
    if (data.amount <= 0) {
      throw new Error('El monto debe ser mayor a 0')
    }

    if (!data.collection_date) {
      throw new Error('La fecha de cobro es requerida')
    }

    // Validar formato de fecha
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(data.collection_date)) {
      throw new Error('La fecha debe tener formato YYYY-MM-DD')
    }

    return this.create(data)
  }

  /**
   * Actualizar collection con validación específica
   */
  async updateCollection(id: string, data: UpdateCollectionData): Promise<Collection> {
    // Validaciones específicas
    if (data.amount !== undefined && data.amount <= 0) {
      throw new Error('El monto debe ser mayor a 0')
    }

    if (data.collection_date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/
      if (!dateRegex.test(data.collection_date)) {
        throw new Error('La fecha debe tener formato YYYY-MM-DD')
      }
    }

    return this.update(id, data)
  }

  /**
   * Marcar collection como completada
   */
  async markAsCompleted(id: string, paymentMethod: 'cash' | 'transfer' | 'card' | 'check', reference?: string): Promise<Collection> {
    return this.update(id, {
      status: 'completed',
      payment_method: paymentMethod,
      reference
    })
  }

  /**
   * Marcar collection como vencida
   */
  async markAsOverdue(id: string): Promise<Collection> {
    return this.update(id, {
      status: 'overdue'
    })
  }

  /**
   * Obtener collections por rango de fechas
   */
  async getByDateRange(startDate: string, endDate: string, options: PaginationOptions = {}): Promise<Collection[]> {
    const { data, error } = await this.getClient()
      .from(this.getTableName())
      .select('*')
      .gte('collection_date', startDate)
      .lte('collection_date', endDate)
      .order('collection_date', { ascending: false })

    if (error) throw error

    return data as Collection[] || []
  }

  /**
   * Obtener collections por método de pago
   */
  async getByPaymentMethod(paymentMethod: 'cash' | 'transfer' | 'card' | 'check', options: PaginationOptions = {}): Promise<Collection[]> {
    return this.getByFilters({ payment_method: paymentMethod }, options)
  }
}

// Instancia singleton para uso en el navegador
let collectionsServiceInstance: CollectionsService | null = null

/**
 * Obtener instancia del servicio de collections
 */
export function getCollectionsService(useServerClient: boolean = false): CollectionsService {
  if (!collectionsServiceInstance || useServerClient) {
    collectionsServiceInstance = new CollectionsService(useServerClient)
  }
  return collectionsServiceInstance
}

// Funciones legacy para compatibilidad
export const getCollections = () => getCollectionsService().getAll()
export const getCollectionById = (id: string) => getCollectionsService().getById(id)
export const createCollection = (data: CreateCollectionData) => getCollectionsService().createCollection(data)
export const updateCollection = (id: string, data: UpdateCollectionData) => getCollectionsService().updateCollection(id, data)
export const deleteCollection = (id: string) => getCollectionsService().delete(id)
export const getCollectionStats = () => getCollectionsService().getStats()
export const getCollectionsByClient = (clientId: string) => getCollectionsService().getByClient(clientId)
export const getPendingCollections = () => getCollectionsService().getPending()
export const getOverdueCollections = () => getCollectionsService().getOverdue()
