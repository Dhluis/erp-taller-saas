/**
 * Wrapper de Operaciones Supabase con Manejo de Errores Robusto
 * Proporciona operaciones seguras con retry, logging y manejo de errores
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError, SupabaseError, ValidationError, handleError } from '@/lib/errors'
import { getBrowserClient } from './client-robust'

// Tipos para operaciones
export interface OperationResult<T> {
  data: T | null
  error: string | null
  success: boolean
  metadata?: {
    count?: number
    latency?: number
    retryCount?: number
  }
}

export interface QueryOptions {
  retries?: number
  timeout?: number
  requireAuth?: boolean
  logQuery?: boolean
}

export interface PaginationOptions {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

/**
 * Configuración por defecto
 */
const DEFAULT_OPTIONS: Required<QueryOptions> = {
  retries: 3,
  timeout: 10000,
  requireAuth: true,
  logQuery: false
}

/**
 * Wrapper para operaciones de Supabase con manejo de errores
 */
export class SupabaseOperations {
  private client: SupabaseClient
  private isServer: boolean

  constructor(client?: SupabaseClient, isServer: boolean = false) {
    this.client = client || (isServer ? getServerClient() as any : getBrowserClient())
    this.isServer = isServer
  }

  /**
   * Ejecutar operación con retry automático
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<OperationResult<T>> {
    const config = { ...DEFAULT_OPTIONS, ...options }
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        // Verificar autenticación si es requerida
        if (config.requireAuth && !this.isServer) {
          const { user } = await this.client.auth.getUser()
          if (!user) {
            throw new ValidationError('User not authenticated')
          }
        }

        // Ejecutar operación con timeout
        const result = await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), config.timeout)
          )
        ])

        const latency = Date.now() - startTime

        if (config.logQuery) {
          console.log(`✅ Query executed successfully in ${latency}ms (attempt ${attempt + 1})`)
        }

        return {
          data: result,
          error: null,
          success: true,
          metadata: {
            latency,
            retryCount: attempt
          }
        }
      } catch (error) {
        lastError = error as Error
        const appError = handleError(error)

        if (config.logQuery) {
          console.warn(`⚠️ Query attempt ${attempt + 1} failed:`, appError.message)
        }

        // No reintentar en ciertos errores
        if (this.shouldNotRetry(appError)) {
          break
        }

        // Esperar antes del siguiente intento
        if (attempt < config.retries) {
          await this.delay(Math.pow(2, attempt) * 1000) // Exponential backoff
        }
      }
    }

    const latency = Date.now() - startTime
    const finalError = handleError(lastError)

    return {
      data: null,
      error: finalError.message,
      success: false,
      metadata: {
        latency,
        retryCount: config.retries
      }
    }
  }

  /**
   * Determinar si un error no debe ser reintentado
   */
  private shouldNotRetry(error: any): boolean {
    const nonRetryableErrors = [
      'PGRST301', // Not found
      'PGRST116', // No rows found
      '23505',    // Unique constraint violation
      '23503',    // Foreign key constraint violation
      '23514',    // Check constraint violation
    ]

    return nonRetryableErrors.some(code => 
      error.message?.includes(code) || error.code === code
    )
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * SELECT con manejo de errores
   */
  async select<T>(
    table: string,
    columns: string = '*',
    filters?: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<OperationResult<T[]>> {
    return this.executeWithRetry(async () => {
      let query = this.client.from(table).select(columns)

      // Aplicar filtros
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      const { data, error } = await query

      if (error) {
        throw new SupabaseError(`Error selecting from ${table}`, error)
      }

      return data as T[]
    }, options)
  }

  /**
   * SELECT con paginación
   */
  async selectPaginated<T>(
    table: string,
    columns: string = '*',
    pagination: PaginationOptions = {},
    filters?: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<OperationResult<{ data: T[]; total: number; page: number; limit: number }>> {
    return this.executeWithRetry(async () => {
      const { page = 1, limit = 10, orderBy = 'created_at', orderDirection = 'desc' } = pagination
      const offset = (page - 1) * limit

      let query = this.client
        .from(table)
        .select(columns, { count: 'exact' })
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limit - 1)

      // Aplicar filtros
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      const { data, error, count } = await query

      if (error) {
        throw new SupabaseError(`Error selecting paginated from ${table}`, error)
      }

      return {
        data: data as T[],
        total: count || 0,
        page,
        limit
      }
    }, options)
  }

  /**
   * SELECT por ID
   */
  async selectById<T>(
    table: string,
    id: string,
    columns: string = '*',
    options: QueryOptions = {}
  ): Promise<OperationResult<T>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from(table)
        .select(columns)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw new SupabaseError(`Error selecting ${table} by ID`, error)
      }

      return data as T
    }, options)
  }

  /**
   * INSERT con manejo de errores
   */
  async insert<T>(
    table: string,
    data: T | T[],
    options: QueryOptions = {}
  ): Promise<OperationResult<T | T[]>> {
    return this.executeWithRetry(async () => {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()

      if (error) {
        throw new SupabaseError(`Error inserting into ${table}`, error)
      }

      return result as T | T[]
    }, options)
  }

  /**
   * INSERT y retornar un solo registro
   */
  async insertSingle<T>(
    table: string,
    data: T,
    options: QueryOptions = {}
  ): Promise<OperationResult<T>> {
    return this.executeWithRetry(async () => {
      const { data: result, error } = await this.client
        .from(table)
        .insert(data)
        .select()
        .single()

      if (error) {
        throw new SupabaseError(`Error inserting single into ${table}`, error)
      }

      return result as T
    }, options)
  }

  /**
   * UPDATE con manejo de errores
   */
  async update<T>(
    table: string,
    id: string,
    data: Partial<T>,
    options: QueryOptions = {}
  ): Promise<OperationResult<T>> {
    return this.executeWithRetry(async () => {
      const { data: result, error } = await this.client
        .from(table)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new SupabaseError(`Error updating ${table}`, error)
      }

      return result as T
    }, options)
  }

  /**
   * DELETE con manejo de errores
   */
  async delete(
    table: string,
    id: string,
    options: QueryOptions = {}
  ): Promise<OperationResult<boolean>> {
    return this.executeWithRetry(async () => {
      const { error } = await this.client
        .from(table)
        .delete()
        .eq('id', id)

      if (error) {
        throw new SupabaseError(`Error deleting from ${table}`, error)
      }

      return true
    }, options)
  }

  /**
   * COUNT con manejo de errores
   */
  async count(
    table: string,
    filters?: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<OperationResult<number>> {
    return this.executeWithRetry(async () => {
      let query = this.client
        .from(table)
        .select('*', { count: 'exact', head: true })

      // Aplicar filtros
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      const { count, error } = await query

      if (error) {
        throw new SupabaseError(`Error counting ${table}`, error)
      }

      return count || 0
    }, options)
  }

  /**
   * Búsqueda con manejo de errores
   */
  async search<T>(
    table: string,
    searchTerm: string,
    searchColumns: string[],
    pagination: PaginationOptions = {},
    options: QueryOptions = {}
  ): Promise<OperationResult<{ data: T[]; total: number; page: number; limit: number }>> {
    return this.executeWithRetry(async () => {
      const { page = 1, limit = 10, orderBy = 'created_at', orderDirection = 'desc' } = pagination
      const offset = (page - 1) * limit

      // Construir condiciones de búsqueda
      const searchConditions = searchColumns
        .map(col => `${col}.ilike.%${searchTerm}%`)
        .join(',')

      const { data, error, count } = await this.client
        .from(table)
        .select('*', { count: 'exact' })
        .or(searchConditions)
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .range(offset, offset + limit - 1)

      if (error) {
        throw new SupabaseError(`Error searching ${table}`, error)
      }

      return {
        data: data as T[],
        total: count || 0,
        page,
        limit
      }
    }, options)
  }

  /**
   * Ejecutar función RPC
   */
  async rpc<T>(
    functionName: string,
    params?: Record<string, any>,
    options: QueryOptions = {}
  ): Promise<OperationResult<T>> {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client.rpc(functionName, params)

      if (error) {
        throw new SupabaseError(`Error executing RPC ${functionName}`, error)
      }

      return data as T
    }, options)
  }
}

/**
 * Factory para crear instancias de operaciones
 */
export function createSupabaseOperations(client?: SupabaseClient, isServer: boolean = false): SupabaseOperations {
  return new SupabaseOperations(client, isServer)
}

/**
 * Operaciones del navegador (singleton)
 */
export const browserOperations = createSupabaseOperations()

/**
 * Operaciones del servidor (por request) - Solo para Server Components
 * Importar desde server-client.ts cuando sea necesario
 */
