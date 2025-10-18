/**
 * Servicio Base Abstracto para Operaciones de Supabase
 * Proporciona funcionalidad común con manejo robusto de errores
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { getBrowserClient, getServerClient } from './supabase'
import { executeWithErrorHandling, AppError, ValidationError } from './errors'
import { z } from 'zod'

// Tipos base
export interface BaseEntity {
  id: string
  organization_id: string
  created_at: string
  updated_at: string
}

export interface PaginationOptions {
  page?: number
  limit?: number
  orderBy?: string
  ascending?: boolean
}

export interface SearchOptions extends PaginationOptions {
  searchTerm?: string
  searchColumns?: string[]
}

export interface OperationResult<T> {
  data: T | null
  error: string | null
  success: boolean
  details?: any
}

// Configuración del servicio
export interface ServiceConfig {
  tableName: string
  schema?: z.ZodSchema<any>
  searchColumns?: string[]
  defaultOrderBy?: string
  defaultLimit?: number
}

/**
 * Servicio Base Abstracto
 */
export abstract class BaseService<T extends BaseEntity> {
  protected client: SupabaseClient
  protected config: ServiceConfig

  constructor(config: ServiceConfig, useServerClient: boolean = false) {
    this.config = {
      defaultLimit: 10,
      defaultOrderBy: 'created_at',
      ...config
    }
    
    // Usar cliente apropiado
    this.client = useServerClient ? getServerClient() : getBrowserClient()
  }

  /**
   * Obtener todos los registros con paginación
   */
  async getAll(options: PaginationOptions = {}): Promise<T[]> {
    return executeWithErrorHandling(
      async () => {
        const {
          page = 1,
          limit = this.config.defaultLimit,
          orderBy = this.config.defaultOrderBy,
          ascending = false
        } = options

        const offset = (page - 1) * limit

        const { data, error } = await this.client
          .from(this.config.tableName)
          .select('*')
          .order(orderBy, { ascending })
          .range(offset, offset + limit - 1)

        if (error) throw error

        // Validar datos si hay esquema
        if (this.config.schema && data) {
          const validatedData = data.map(item => {
            const result = this.config.schema!.safeParse(item)
            if (!result.success) {
              console.warn(`⚠️ Datos inválidos en ${this.config.tableName}:`, result.error)
              return item // Retornar datos originales si la validación falla
            }
            return result.data
          })
          return validatedData as T[]
        }

        return data as T[] || []
      },
      {
        operation: `getAll_${this.config.tableName}`,
        table: this.config.tableName,
        query: `SELECT * FROM ${this.config.tableName} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`
      }
    )
  }

  /**
   * Obtener registro por ID
   */
  async getById(id: string): Promise<T | null> {
    if (!id) {
      throw new ValidationError('ID es requerido')
    }

    return executeWithErrorHandling(
      async () => {
        const { data, error } = await this.client
          .from(this.config.tableName)
          .select('*')
          .eq('id', id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            return null // No encontrado
          }
          throw error
        }

        // Validar datos si hay esquema
        if (this.config.schema && data) {
          const result = this.config.schema.safeParse(data)
          if (!result.success) {
            console.warn(`⚠️ Datos inválidos en ${this.config.tableName}:`, result.error)
            return data as T // Retornar datos originales si la validación falla
          }
          return result.data as T
        }

        return data as T
      },
      {
        operation: `getById_${this.config.tableName}`,
        table: this.config.tableName,
        query: `SELECT * FROM ${this.config.tableName} WHERE id = '${id}'`
      }
    )
  }

  /**
   * Crear nuevo registro
   */
  async create(data: Partial<T>): Promise<T> {
    // Validar datos si hay esquema
    if (this.config.schema) {
      const result = this.config.schema.safeParse(data)
      if (!result.success) {
        throw new ValidationError(`Datos inválidos: ${result.error.message}`)
      }
      data = result.data
    }

    return executeWithErrorHandling(
      async () => {
        const { data: newRecord, error } = await this.client
          .from(this.config.tableName)
          .insert([data])
          .select()
          .single()

        if (error) throw error

        return newRecord as T
      },
      {
        operation: `create_${this.config.tableName}`,
        table: this.config.tableName,
        query: `INSERT INTO ${this.config.tableName} (...) VALUES (...)`
      }
    )
  }

  /**
   * Actualizar registro
   */
  async update(id: string, data: Partial<T>): Promise<T> {
    if (!id) {
      throw new ValidationError('ID es requerido')
    }

    // Validar datos si hay esquema
    if (this.config.schema) {
      const result = this.config.schema.safeParse(data)
      if (!result.success) {
        throw new ValidationError(`Datos inválidos: ${result.error.message}`)
      }
      data = result.data
    }

    return executeWithErrorHandling(
      async () => {
        const { data: updatedRecord, error } = await this.client
          .from(this.config.tableName)
          .update({
            ...data,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single()

        if (error) throw error

        return updatedRecord as T
      },
      {
        operation: `update_${this.config.tableName}`,
        table: this.config.tableName,
        query: `UPDATE ${this.config.tableName} SET ... WHERE id = '${id}'`
      }
    )
  }

  /**
   * Eliminar registro
   */
  async delete(id: string): Promise<boolean> {
    if (!id) {
      throw new ValidationError('ID es requerido')
    }

    return executeWithErrorHandling(
      async () => {
        const { error } = await this.client
          .from(this.config.tableName)
          .delete()
          .eq('id', id)

        if (error) throw error

        return true
      },
      {
        operation: `delete_${this.config.tableName}`,
        table: this.config.tableName,
        query: `DELETE FROM ${this.config.tableName} WHERE id = '${id}'`
      }
    )
  }

  /**
   * Buscar registros
   */
  async search(options: SearchOptions = {}): Promise<T[]> {
    const {
      searchTerm = '',
      searchColumns = this.config.searchColumns || [],
      page = 1,
      limit = this.config.defaultLimit,
      orderBy = this.config.defaultOrderBy,
      ascending = false
    } = options

    if (!searchTerm || searchColumns.length === 0) {
      return this.getAll({ page, limit, orderBy, ascending })
    }

    return executeWithErrorHandling(
      async () => {
        const offset = (page - 1) * limit
        let query = this.client
          .from(this.config.tableName)
          .select('*')
          .order(orderBy, { ascending })

        // Construir condiciones de búsqueda
        const searchConditions = searchColumns.map(col => `${col}.ilike.%${searchTerm}%`).join(',')
        query = query.or(searchConditions)

        const { data, error } = await query.range(offset, offset + limit - 1)

        if (error) throw error

        return data as T[] || []
      },
      {
        operation: `search_${this.config.tableName}`,
        table: this.config.tableName,
        query: `SELECT * FROM ${this.config.tableName} WHERE ... ILIKE '%${searchTerm}%'`
      }
    )
  }

  /**
   * Contar registros
   */
  async count(filters?: Record<string, any>): Promise<number> {
    return executeWithErrorHandling(
      async () => {
        let query = this.client
          .from(this.config.tableName)
          .select('*', { count: 'exact', head: true })

        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value)
          })
        }

        const { count, error } = await query

        if (error) throw error

        return count || 0
      },
      {
        operation: `count_${this.config.tableName}`,
        table: this.config.tableName,
        query: `SELECT COUNT(*) FROM ${this.config.tableName}`
      }
    )
  }

  /**
   * Obtener estadísticas básicas
   */
  async getStats(): Promise<{
    total: number
    active?: number
    inactive?: number
    [key: string]: any
  }> {
    return executeWithErrorHandling(
      async () => {
        const total = await this.count()
        
        // Intentar obtener estadísticas por estado si existe la columna
        let active = 0
        let inactive = 0

        try {
          active = await this.count({ status: 'active' })
          inactive = await this.count({ status: 'inactive' })
        } catch {
          // Si no hay columna status, ignorar
        }

        return {
          total,
          active,
          inactive
        }
      },
      {
        operation: `getStats_${this.config.tableName}`,
        table: this.config.tableName,
        query: `SELECT COUNT(*) FROM ${this.config.tableName}`
      }
    )
  }

  /**
   * Obtener registros por filtros
   */
  async getByFilters(filters: Record<string, any>, options: PaginationOptions = {}): Promise<T[]> {
    return executeWithErrorHandling(
      async () => {
        const {
          page = 1,
          limit = this.config.defaultLimit,
          orderBy = this.config.defaultOrderBy,
          ascending = false
        } = options

        const offset = (page - 1) * limit

        let query = this.client
          .from(this.config.tableName)
          .select('*')
          .order(orderBy, { ascending })

        // Aplicar filtros
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value)
        })

        const { data, error } = await query.range(offset, offset + limit - 1)

        if (error) throw error

        return data as T[] || []
      },
      {
        operation: `getByFilters_${this.config.tableName}`,
        table: this.config.tableName,
        query: `SELECT * FROM ${this.config.tableName} WHERE ...`
      }
    )
  }

  /**
   * Verificar si existe un registro
   */
  async exists(id: string): Promise<boolean> {
    try {
      const record = await this.getById(id)
      return record !== null
    } catch {
      return false
    }
  }

  /**
   * Obtener cliente Supabase
   */
  protected getClient(): SupabaseClient {
    return this.client
  }

  /**
   * Obtener nombre de la tabla
   */
  protected getTableName(): string {
    return this.config.tableName
  }
}
