/**
 * Servicio Base Abstracto
 * Proporciona funcionalidad base para todos los servicios de datos
 */

import { getSupabaseClient } from '@/lib/supabase/client'
import { BaseEntity, BaseCreateData, BaseUpdateData, PaginationParams, SearchFilters, PaginatedResponse } from '@/types/base'
import { DatabaseError, NotFoundError, ValidationError } from '@/lib/errors'
import { validateData } from '@/lib/utils/validation'
import { z } from 'zod'

/**
 * Clase base abstracta para todos los servicios de datos
 */
export abstract class BaseService<
  T extends BaseEntity,
  CreateData extends BaseCreateData,
  UpdateData extends BaseUpdateData
> {
  protected supabase = getSupabaseClient()
  
  constructor(protected tableName: string) {}
  
  /**
   * Obtiene todos los registros
   */
  async getAll(filters?: SearchFilters): Promise<T[]> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })
      
      // Aplicar filtros si existen
      if (filters) {
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
        }
        
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        
        if (filters.date_from) {
          query = query.gte('created_at', filters.date_from)
        }
        
        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to)
        }
        
        if (filters.sort_by) {
          query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' })
        }
      }
      
      const { data, error } = await query
      
      if (error) {
        throw new DatabaseError(`Error fetching ${this.tableName}`, error)
      }
      
      return (data || []) as T[]
    } catch (error) {
      console.error(`Error in ${this.tableName}.getAll:`, error)
      throw error
    }
  }
  
  /**
   * Obtiene registros paginados
   */
  async getPaginated(params: PaginationParams & SearchFilters = {}): Promise<PaginatedResponse<T>> {
    try {
      const { page = 1, limit = 10, ...filters } = params
      const offset = (page - 1) * limit
      
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      // Aplicar filtros
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
      }
      
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to)
      }
      
      if (filters.sort_by) {
        query = query.order(filters.sort_by, { ascending: filters.sort_order === 'asc' })
      }
      
      const { data, error, count } = await query
      
      if (error) {
        throw new DatabaseError(`Error fetching paginated ${this.tableName}`, error)
      }
      
      const total = count || 0
      const totalPages = Math.ceil(total / limit)
      
      return {
        data: (data || []) as T[],
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    } catch (error) {
      console.error(`Error in ${this.tableName}.getPaginated:`, error)
      throw error
    }
  }
  
  /**
   * Obtiene un registro por ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new DatabaseError(`Error fetching ${this.tableName} by id`, error)
      }
      
      return data as T
    } catch (error) {
      console.error(`Error in ${this.tableName}.getById:`, error)
      throw error
    }
  }
  
  /**
   * Crea un nuevo registro
   */
  async create(data: CreateData, schema?: z.ZodSchema<CreateData>): Promise<T> {
    try {
      // Validar datos si se proporciona un esquema
      if (schema) {
        const validation = validateData(schema, data)
        if (!validation.success) {
          throw new ValidationError(`Validation failed: ${Object.values(validation.errors || {}).join(', ')}`)
        }
      }
      
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .insert([{
          ...data,
          organization_id: data.organization_id || '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError(`Error creating ${this.tableName}`, error)
      }
      
      return result as T
    } catch (error) {
      console.error(`Error in ${this.tableName}.create:`, error)
      throw error
    }
  }
  
  /**
   * Actualiza un registro existente
   */
  async update(id: string, data: UpdateData, schema?: z.ZodSchema<UpdateData>): Promise<T> {
    try {
      // Validar datos si se proporciona un esquema
      if (schema) {
        const validation = validateData(schema, data)
        if (!validation.success) {
          throw new ValidationError(`Validation failed: ${Object.values(validation.errors || {}).join(', ')}`)
        }
      }
      
      const { data: result, error } = await this.supabase
        .from(this.tableName)
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError(`Error updating ${this.tableName}`, error)
      }
      
      if (!result) {
        throw new NotFoundError(this.tableName, id)
      }
      
      return result as T
    } catch (error) {
      console.error(`Error in ${this.tableName}.update:`, error)
      throw error
    }
  }
  
  /**
   * Elimina un registro
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new DatabaseError(`Error deleting ${this.tableName}`, error)
      }
    } catch (error) {
      console.error(`Error in ${this.tableName}.delete:`, error)
      throw error
    }
  }
  
  /**
   * Elimina múltiples registros
   */
  async deleteMany(ids: string[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from(this.tableName)
        .delete()
        .in('id', ids)
      
      if (error) {
        throw new DatabaseError(`Error deleting multiple ${this.tableName}`, error)
      }
    } catch (error) {
      console.error(`Error in ${this.tableName}.deleteMany:`, error)
      throw error
    }
  }
  
  /**
   * Busca registros por término de búsqueda
   */
  async search(term: string, fields: string[] = ['name', 'email', 'phone']): Promise<T[]> {
    try {
      const searchConditions = fields.map(field => `${field}.ilike.%${term}%`).join(',')
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .or(searchConditions)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError(`Error searching ${this.tableName}`, error)
      }
      
      return (data || []) as T[]
    } catch (error) {
      console.error(`Error in ${this.tableName}.search:`, error)
      throw error
    }
  }
  
  /**
   * Cuenta registros
   */
  async count(filters?: SearchFilters): Promise<number> {
    try {
      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
      
      // Aplicar filtros si existen
      if (filters) {
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
        }
        
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        
        if (filters.date_from) {
          query = query.gte('created_at', filters.date_from)
        }
        
        if (filters.date_to) {
          query = query.lte('created_at', filters.date_to)
        }
      }
      
      const { count, error } = await query
      
      if (error) {
        throw new DatabaseError(`Error counting ${this.tableName}`, error)
      }
      
      return count || 0
    } catch (error) {
      console.error(`Error in ${this.tableName}.count:`, error)
      throw error
    }
  }
  
  /**
   * Verifica si existe un registro
   */
  async exists(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('id')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return false
        }
        throw new DatabaseError(`Error checking existence of ${this.tableName}`, error)
      }
      
      return !!data
    } catch (error) {
      console.error(`Error in ${this.tableName}.exists:`, error)
      throw error
    }
  }
  
  /**
   * Obtiene estadísticas básicas
   */
  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
    created_today: number
    created_this_week: number
    created_this_month: number
  }> {
    try {
      const today = new Date().toISOString().split('T')[0]
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      const [
        { count: total },
        { count: active },
        { count: inactive },
        { count: created_today },
        { count: created_this_week },
        { count: created_this_month }
      ] = await Promise.all([
        this.supabase.from(this.tableName).select('*', { count: 'exact', head: true }),
        this.supabase.from(this.tableName).select('*', { count: 'exact', head: true }).eq('status', 'active'),
        this.supabase.from(this.tableName).select('*', { count: 'exact', head: true }).eq('status', 'inactive'),
        this.supabase.from(this.tableName).select('*', { count: 'exact', head: true }).gte('created_at', today),
        this.supabase.from(this.tableName).select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
        this.supabase.from(this.tableName).select('*', { count: 'exact', head: true }).gte('created_at', monthAgo)
      ])
      
      return {
        total: total || 0,
        active: active || 0,
        inactive: inactive || 0,
        created_today: created_today || 0,
        created_this_week: created_this_week || 0,
        created_this_month: created_this_month || 0
      }
    } catch (error) {
      console.error(`Error in ${this.tableName}.getStats:`, error)
      throw error
    }
  }
  
  /**
   * Obtiene registros recientes
   */
  async getRecent(limit: number = 5): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) {
        throw new DatabaseError(`Error fetching recent ${this.tableName}`, error)
      }
      
      return (data || []) as T[]
    } catch (error) {
      console.error(`Error in ${this.tableName}.getRecent:`, error)
      throw error
    }
  }
  
  /**
   * Obtiene registros por rango de fechas
   */
  async getByDateRange(startDate: string, endDate: string): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError(`Error fetching ${this.tableName} by date range`, error)
      }
      
      return (data || []) as T[]
    } catch (error) {
      console.error(`Error in ${this.tableName}.getByDateRange:`, error)
      throw error
    }
  }
  
  /**
   * Obtiene registros por estado
   */
  async getByStatus(status: string): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError(`Error fetching ${this.tableName} by status`, error)
      }
      
      return (data || []) as T[]
    } catch (error) {
      console.error(`Error in ${this.tableName}.getByStatus:`, error)
      throw error
    }
  }
  
  /**
   * Obtiene registros por organización
   */
  async getByOrganization(organizationId: string): Promise<T[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError(`Error fetching ${this.tableName} by organization`, error)
      }
      
      return (data || []) as T[]
    } catch (error) {
      console.error(`Error in ${this.tableName}.getByOrganization:`, error)
      throw error
    }
  }
  
  /**
   * Método abstracto para validación específica de la entidad
   */
  protected abstract validateCreateData(data: CreateData): void
  protected abstract validateUpdateData(data: UpdateData): void
  
  /**
   * Método abstracto para transformación de datos antes de guardar
   */
  protected abstract transformCreateData(data: CreateData): any
  protected abstract transformUpdateData(data: UpdateData): any
  
  /**
   * Método abstracto para transformación de datos después de obtener
   */
  protected abstract transformResponseData(data: any): T
}
