/**
 * Servicio Base Robusto y Reutilizable
 * Proporciona operaciones CRUD consistentes con manejo de errores y validación
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../supabase'
import { 
  AppError, 
  ValidationError, 
  DatabaseError, 
  executeWithErrorHandling,
  isRecoverableError,
  withRetry
} from './errors'
import { z } from 'zod'

// Tipos base
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface FilterOptions {
  [key: string]: any
}

export interface SelectOptions {
  columns?: string[]
  filters?: FilterOptions
  pagination?: PaginationOptions
  include?: string[]
}

/**
 * Clase base para servicios de datos
 */
export abstract class BaseService<T extends BaseEntity> {
  protected client: SupabaseClient
  protected tableName: string
  protected schema: z.ZodSchema<T>

  constructor(tableName: string, schema: z.ZodSchema<T>) {
    this.client = getSupabaseClient()
    this.tableName = tableName
    this.schema = schema
  }

  /**
   * Validar datos con Zod
   */
  protected validateData(data: any): T {
    try {
      return this.schema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map(err => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ')
        
        throw new ValidationError(
          `Validation failed: ${validationErrors}`,
          { 
            errors: error.errors,
            data: data
          }
        )
      }
      throw error
    }
  }

  /**
   * Construir query con filtros
   */
  protected buildQuery(filters?: FilterOptions) {
    let query = this.client.from(this.tableName)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            query = query.in(key, value)
          } else if (typeof value === 'string' && value.includes('%')) {
            query = query.like(key, value)
          } else {
            query = query.eq(key, value)
          }
        }
      })
    }
    
    return query
  }

  /**
   * Aplicar paginación
   */
  protected applyPagination(query: any, options?: PaginationOptions) {
    if (!options) return query

    const { page = 1, limit = 10, orderBy, orderDirection = 'desc' } = options
    
    let paginatedQuery = query
    
    if (orderBy) {
      paginatedQuery = paginatedQuery.order(orderBy, { ascending: orderDirection === 'asc' })
    }
    
    const from = (page - 1) * limit
    const to = from + limit - 1
    
    return paginatedQuery.range(from, to)
  }

  /**
   * Obtener todos los registros
   */
  async getAll(options?: SelectOptions): Promise<T[]> {
    return executeWithErrorHandling(
      async () => {
        let query = this.buildQuery(options?.filters)
        
        if (options?.columns) {
          query = query.select(options.columns.join(','))
        } else {
          query = query.select('*')
        }
        
        if (options?.pagination) {
          query = this.applyPagination(query, options.pagination)
        }
        
        const { data, error } = await query
        
        if (error) {
          throw new DatabaseError(
            `Failed to fetch ${this.tableName}`,
            error,
            { table: this.tableName, operation: 'getAll' }
          )
        }
        
        return data || []
      },
      {
        operation: `getAll_${this.tableName}`,
        table: this.tableName
      }
    )
  }

  /**
   * Obtener registros paginados
   */
  async getPaginated(options?: SelectOptions): Promise<PaginatedResult<T>> {
    return executeWithErrorHandling(
      async () => {
        const { page = 1, limit = 10 } = options?.pagination || {}
        
        // Obtener total de registros
        const { count, error: countError } = await this.client
          .from(this.tableName)
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          throw new DatabaseError(
            `Failed to count ${this.tableName}`,
            countError,
            { table: this.tableName, operation: 'getPaginated' }
          )
        }
        
        // Obtener datos paginados
        const data = await this.getAll(options)
        
        const total = count || 0
        const totalPages = Math.ceil(total / limit)
        
        return {
          data,
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
        operation: `getPaginated_${this.tableName}`,
        table: this.tableName
      }
    )
  }

  /**
   * Obtener por ID
   */
  async getById(id: string): Promise<T | null> {
    return executeWithErrorHandling(
      async () => {
        const { data, error } = await this.client
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) {
          if (error.code === 'PGRST116') {
            return null // No encontrado
          }
          throw new DatabaseError(
            `Failed to fetch ${this.tableName} by id`,
            error,
            { table: this.tableName, operation: 'getById', id }
          )
        }
        
        return data
      },
      {
        operation: `getById_${this.tableName}`,
        table: this.tableName,
        query: `id=${id}`
      }
    )
  }

  /**
   * Crear registro
   */
  async create(data: Partial<T>): Promise<T> {
    return executeWithErrorHandling(
      async () => {
        // Validar datos
        const validatedData = this.validateData(data)
        
        const { data: result, error } = await this.client
          .from(this.tableName)
          .insert(validatedData)
          .select()
          .single()
        
        if (error) {
          throw new DatabaseError(
            `Failed to create ${this.tableName}`,
            error,
            { table: this.tableName, operation: 'create', data: validatedData }
          )
        }
        
        return result
      },
      {
        operation: `create_${this.tableName}`,
        table: this.tableName
      }
    )
  }

  /**
   * Actualizar registro
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    return executeWithErrorHandling(
      async () => {
        // Validar datos
        const validatedData = this.validateData(data)
        
        const { data: result, error } = await this.client
          .from(this.tableName)
          .update(validatedData)
          .eq('id', id)
          .select()
          .single()
        
        if (error) {
          throw new DatabaseError(
            `Failed to update ${this.tableName}`,
            error,
            { table: this.tableName, operation: 'update', id, data: validatedData }
          )
        }
        
        return result
      },
      {
        operation: `update_${this.tableName}`,
        table: this.tableName,
        query: `id=${id}`
      }
    )
  }

  /**
   * Eliminar registro
   */
  async delete(id: string): Promise<boolean> {
    return executeWithErrorHandling(
      async () => {
        const { error } = await this.client
          .from(this.tableName)
          .delete()
          .eq('id', id)
        
        if (error) {
          throw new DatabaseError(
            `Failed to delete ${this.tableName}`,
            error,
            { table: this.tableName, operation: 'delete', id }
          )
        }
        
        return true
      },
      {
        operation: `delete_${this.tableName}`,
        table: this.tableName,
        query: `id=${id}`
      }
    )
  }

  /**
   * Buscar registros
   */
  async search(searchTerm: string, searchFields: string[]): Promise<T[]> {
    return executeWithErrorHandling(
      async () => {
        let query = this.client.from(this.tableName)
        
        // Construir OR query para múltiples campos
        const orConditions = searchFields.map(field => 
          `${field}.ilike.%${searchTerm}%`
        ).join(',')
        
        const { data, error } = await query
          .or(orConditions)
          .select('*')
        
        if (error) {
          throw new DatabaseError(
            `Failed to search ${this.tableName}`,
            error,
            { table: this.tableName, operation: 'search', searchTerm, searchFields }
          )
        }
        
        return data || []
      },
      {
        operation: `search_${this.tableName}`,
        table: this.tableName,
        query: `search=${searchTerm}`
      }
    )
  }

  /**
   * Contar registros
   */
  async count(filters?: FilterOptions): Promise<number> {
    return executeWithErrorHandling(
      async () => {
        let query = this.client.from(this.tableName)
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value)
            }
          })
        }
        
        const { count, error } = await query
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          throw new DatabaseError(
            `Failed to count ${this.tableName}`,
            error,
            { table: this.tableName, operation: 'count', filters }
          )
        }
        
        return count || 0
      },
      {
        operation: `count_${this.tableName}`,
        table: this.tableName
      }
    )
  }

  /**
   * Verificar existencia
   */
  async exists(id: string): Promise<boolean> {
    try {
      const record = await this.getById(id)
      return record !== null
    } catch (error) {
      return false
    }
  }

  /**
   * Obtener estadísticas básicas
   */
  async getStats(): Promise<{
    total: number
    createdToday: number
    updatedToday: number
  }> {
    return executeWithErrorHandling(
      async () => {
        const today = new Date().toISOString().split('T')[0]
        
        const [totalResult, createdResult, updatedResult] = await Promise.all([
          this.count(),
          this.count({ created_at: `${today}%` }),
          this.count({ updated_at: `${today}%` })
        ])
        
        return {
          total: totalResult,
          createdToday: createdResult,
          updatedToday: updatedResult
        }
      },
      {
        operation: `getStats_${this.tableName}`,
        table: this.tableName
      }
    )
  }

  /**
   * Operación batch
   */
  async batchCreate(data: Partial<T>[]): Promise<T[]> {
    return executeWithErrorHandling(
      async () => {
        // Validar todos los datos
        const validatedData = data.map(item => this.validateData(item))
        
        const { data: result, error } = await this.client
          .from(this.tableName)
          .insert(validatedData)
          .select()
        
        if (error) {
          throw new DatabaseError(
            `Failed to batch create ${this.tableName}`,
            error,
            { table: this.tableName, operation: 'batchCreate', count: data.length }
          )
        }
        
        return result || []
      },
      {
        operation: `batchCreate_${this.tableName}`,
        table: this.tableName
      }
    )
  }

  /**
   * Operación batch update
   */
  async batchUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    return executeWithErrorHandling(
      async () => {
        const results: T[] = []
        
        for (const update of updates) {
          const result = await this.update(update.id, update.data)
          results.push(result)
        }
        
        return results
      },
      {
        operation: `batchUpdate_${this.tableName}`,
        table: this.tableName
      }
    )
  }

  /**
   * Operación batch delete
   */
  async batchDelete(ids: string[]): Promise<boolean> {
    return executeWithErrorHandling(
      async () => {
        const { error } = await this.client
          .from(this.tableName)
          .delete()
          .in('id', ids)
        
        if (error) {
          throw new DatabaseError(
            `Failed to batch delete ${this.tableName}`,
            error,
            { table: this.tableName, operation: 'batchDelete', count: ids.length }
          )
        }
        
        return true
      },
      {
        operation: `batchDelete_${this.tableName}`,
        table: this.tableName
      }
    )
  }
}