/**
 * Servicio de Servicios del Taller
 * Funciones para manejar servicios ofrecidos
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Service, ServiceInsert, ServiceUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Service

export interface CreateServiceData {
  work_order_id?: string
  name: string
  description?: string
  quantity: number
  unit_price?: number
  total_price?: number
}

export interface UpdateServiceData {
  name?: string
  description?: string
  quantity?: number
  unit_price?: number
  total_price?: number
}

/**
 * Obtener servicios
 */
export async function getServices(filters?: {
  work_order_id?: string
  name?: string
}): Promise<Service[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('services').select('*')
      
      if (filters) {
        if (filters.work_order_id) {
          query = query.eq('work_order_id', filters.work_order_id)
        }
        if (filters.name) {
          query = query.ilike('name', `%${filters.name}%`)
        }
      }
      
      const { data, error } = await query
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch services: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getServices',
      table: 'services'
    }
  )
}

/**
 * Obtener servicio por ID
 */
export async function getServiceById(id: string): Promise<Service | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('services')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch service: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getServiceById',
      table: 'services'
    }
  )
}

/**
 * Crear servicio
 */
export async function createService(service: CreateServiceData): Promise<Service> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('services')
        .insert(service)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create service: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createService',
      table: 'services'
    }
  )
}

/**
 * Actualizar servicio
 */
export async function updateService(id: string, service: UpdateServiceData): Promise<Service> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('services')
        .update(service)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update service: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateService',
      table: 'services'
    }
  )
}

/**
 * Eliminar servicio
 */
export async function deleteService(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('services')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete service: ${error.message}`)
      }
    },
    {
      operation: 'deleteService',
      table: 'services'
    }
  )
}

/**
 * Buscar servicios por nombre
 */
export async function searchServices(searchTerm: string): Promise<Service[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('services')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to search services: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchServices',
      table: 'services'
    }
  )
}

/**
 * Obtener servicios por orden de trabajo
 */
export async function getServicesByWorkOrder(workOrderId: string): Promise<Service[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('services')
        .select('*')
        .eq('work_order_id', workOrderId)
        .order('created_at', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch services by work order: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getServicesByWorkOrder',
      table: 'services'
    }
  )
}






