/**
 * Servicio de Collections (Cobros)
 * Maneja todas las operaciones relacionadas con cobros
 */

import { BaseService } from './BaseService'
import { Collection, CreateCollectionData, UpdateCollectionData } from '@/types/entities'
import { createCollectionSchema, updateCollectionSchema } from '@/lib/validation/schemas'
import { DatabaseError } from '@/lib/errors'

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

export class CollectionsService extends BaseService<Collection, CreateCollectionData, UpdateCollectionData> {
  constructor() {
    super('collections')
  }
  
  /**
   * Obtiene estadísticas de cobros
   */
  async getStats(): Promise<CollectionStats> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('status, amount')
      
      if (error) {
        throw new DatabaseError('Error fetching collection stats', error)
      }
      
      return this.processStats(data || [])
    } catch (error) {
      console.error('Error in CollectionsService.getStats:', error)
      throw error
    }
  }
  
  /**
   * Obtiene cobros por cliente
   */
  async getByClient(clientId: string): Promise<Collection[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('client_id', clientId)
        .order('collection_date', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching collections by client', error)
      }
      
      return (data || []) as Collection[]
    } catch (error) {
      console.error('Error in CollectionsService.getByClient:', error)
      throw error
    }
  }
  
  /**
   * Obtiene cobros por factura
   */
  async getByInvoice(invoiceId: string): Promise<Collection[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('collection_date', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching collections by invoice', error)
      }
      
      return (data || []) as Collection[]
    } catch (error) {
      console.error('Error in CollectionsService.getByInvoice:', error)
      throw error
    }
  }
  
  /**
   * Obtiene cobros por método de pago
   */
  async getByPaymentMethod(paymentMethod: string): Promise<Collection[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('payment_method', paymentMethod)
        .order('collection_date', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching collections by payment method', error)
      }
      
      return (data || []) as Collection[]
    } catch (error) {
      console.error('Error in CollectionsService.getByPaymentMethod:', error)
      throw error
    }
  }
  
  /**
   * Obtiene cobros por rango de fechas
   */
  async getByDateRange(startDate: string, endDate: string): Promise<Collection[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
        .order('collection_date', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching collections by date range', error)
      }
      
      return (data || []) as Collection[]
    } catch (error) {
      console.error('Error in CollectionsService.getByDateRange:', error)
      throw error
    }
  }
  
  /**
   * Obtiene cobros vencidos
   */
  async getOverdue(): Promise<Collection[]> {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', 'pending')
        .lt('collection_date', today)
        .order('collection_date', { ascending: true })
      
      if (error) {
        throw new DatabaseError('Error fetching overdue collections', error)
      }
      
      return (data || []) as Collection[]
    } catch (error) {
      console.error('Error in CollectionsService.getOverdue:', error)
      throw error
    }
  }
  
  /**
   * Obtiene cobros pendientes
   */
  async getPending(): Promise<Collection[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', 'pending')
        .order('collection_date', { ascending: true })
      
      if (error) {
        throw new DatabaseError('Error fetching pending collections', error)
      }
      
      return (data || []) as Collection[]
    } catch (error) {
      console.error('Error in CollectionsService.getPending:', error)
      throw error
    }
  }
  
  /**
   * Obtiene cobros completados
   */
  async getCompleted(): Promise<Collection[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', 'completed')
        .order('collection_date', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching completed collections', error)
      }
      
      return (data || []) as Collection[]
    } catch (error) {
      console.error('Error in CollectionsService.getCompleted:', error)
      throw error
    }
  }
  
  /**
   * Marca un cobro como completado
   */
  async markAsCompleted(id: string): Promise<Collection> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError('Error marking collection as completed', error)
      }
      
      return data as Collection
    } catch (error) {
      console.error('Error in CollectionsService.markAsCompleted:', error)
      throw error
    }
  }
  
  /**
   * Marca un cobro como vencido
   */
  async markAsOverdue(id: string): Promise<Collection> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          status: 'overdue',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError('Error marking collection as overdue', error)
      }
      
      return data as Collection
    } catch (error) {
      console.error('Error in CollectionsService.markAsOverdue:', error)
      throw error
    }
  }
  
  /**
   * Obtiene el total de cobros por período
   */
  async getTotalByPeriod(startDate: string, endDate: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('amount')
        .eq('status', 'completed')
        .gte('collection_date', startDate)
        .lte('collection_date', endDate)
      
      if (error) {
        throw new DatabaseError('Error fetching total by period', error)
      }
      
      return (data || []).reduce((sum, collection) => sum + (collection.amount || 0), 0)
    } catch (error) {
      console.error('Error in CollectionsService.getTotalByPeriod:', error)
      throw error
    }
  }
  
  /**
   * Obtiene el total de cobros por cliente
   */
  async getTotalByClient(clientId: string): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('amount')
        .eq('client_id', clientId)
        .eq('status', 'completed')
      
      if (error) {
        throw new DatabaseError('Error fetching total by client', error)
      }
      
      return (data || []).reduce((sum, collection) => sum + (collection.amount || 0), 0)
    } catch (error) {
      console.error('Error in CollectionsService.getTotalByClient:', error)
      throw error
    }
  }
  
  /**
   * Procesa estadísticas de cobros
   */
  private processStats(data: any[]): CollectionStats {
    const total = data.length
    const completed = data.filter(c => c.status === 'completed').length
    const pending = data.filter(c => c.status === 'pending').length
    const overdue = data.filter(c => c.status === 'overdue').length
    
    const totalAmountCollected = data
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => sum + (c.amount || 0), 0)
    
    const totalAmountPending = data
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + (c.amount || 0), 0)
    
    const totalAmountOverdue = data
      .filter(c => c.status === 'overdue')
      .reduce((sum, c) => sum + (c.amount || 0), 0)
    
    const averageCollectionAmount = total > 0 ? totalAmountCollected / total : 0
    const collectionRate = total > 0 ? (completed / total) * 100 : 0
    
    return {
      total_collections: total,
      completed_collections: completed,
      pending_collections: pending,
      overdue_collections: overdue,
      total_amount_collected: totalAmountCollected,
      total_amount_pending: totalAmountPending,
      total_amount_overdue: totalAmountOverdue,
      average_collection_amount: averageCollectionAmount,
      collection_rate: collectionRate
    }
  }
  
  /**
   * Validación específica para crear cobros
   */
  protected validateCreateData(data: CreateCollectionData): void {
    const validation = validateData(createCollectionSchema, data)
    if (!validation.success) {
      throw new Error(`Validation failed: ${Object.values(validation.errors || {}).join(', ')}`)
    }
  }
  
  /**
   * Validación específica para actualizar cobros
   */
  protected validateUpdateData(data: UpdateCollectionData): void {
    const validation = validateData(updateCollectionSchema, data)
    if (!validation.success) {
      throw new Error(`Validation failed: ${Object.values(validation.errors || {}).join(', ')}`)
    }
  }
  
  /**
   * Transformación de datos antes de crear
   */
  protected transformCreateData(data: CreateCollectionData): any {
    return {
      ...data,
      organization_id: data.organization_id || '00000000-0000-0000-0000-000000000000',
      amount: Number(data.amount),
      collection_date: data.collection_date,
      payment_method: data.payment_method,
      status: data.status || 'pending'
    }
  }
  
  /**
   * Transformación de datos antes de actualizar
   */
  protected transformUpdateData(data: UpdateCollectionData): any {
    return {
      ...data,
      amount: data.amount ? Number(data.amount) : undefined
    }
  }
  
  /**
   * Transformación de datos después de obtener
   */
  protected transformResponseData(data: any): Collection {
    return {
      ...data,
      amount: Number(data.amount || 0)
    } as Collection
  }
}
