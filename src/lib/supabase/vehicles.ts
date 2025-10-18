/**
 * Servicio de Vehículos
 * Funciones para manejar vehículos de clientes
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Vehicle, VehicleInsert, VehicleUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Vehicle

export interface CreateVehicleData {
  customer_id: string
  brand: string
  model: string
  year?: number
  license_plate?: string
  vin?: string
  color?: string
  mileage?: number
}

export interface UpdateVehicleData {
  brand?: string
  model?: string
  year?: number
  license_plate?: string
  vin?: string
  color?: string
  mileage?: number
}

/**
 * Obtener vehículos
 */
export async function getVehicles(filters?: {
  customer_id?: string
  brand?: string
  model?: string
  license_plate?: string
}): Promise<Vehicle[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('vehicles').select('*')
      
      if (filters) {
        if (filters.customer_id) {
          query = query.eq('customer_id', filters.customer_id)
        }
        if (filters.brand) {
          query = query.eq('brand', filters.brand)
        }
        if (filters.model) {
          query = query.eq('model', filters.model)
        }
        if (filters.license_plate) {
          query = query.eq('license_plate', filters.license_plate)
        }
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch vehicles: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getVehicles',
      table: 'vehicles'
    }
  )
}

/**
 * Obtener vehículo por ID
 */
export async function getVehicleById(id: string): Promise<Vehicle | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch vehicle: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getVehicleById',
      table: 'vehicles'
    }
  )
}

/**
 * Crear vehículo
 */
export async function createVehicle(vehicle: CreateVehicleData): Promise<Vehicle> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('vehicles')
        .insert(vehicle)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create vehicle: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createVehicle',
      table: 'vehicles'
    }
  )
}

/**
 * Actualizar vehículo
 */
export async function updateVehicle(id: string, vehicle: UpdateVehicleData): Promise<Vehicle> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('vehicles')
        .update({
          ...vehicle,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update vehicle: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateVehicle',
      table: 'vehicles'
    }
  )
}

/**
 * Eliminar vehículo
 */
export async function deleteVehicle(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('vehicles')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete vehicle: ${error.message}`)
      }
    },
    {
      operation: 'deleteVehicle',
      table: 'vehicles'
    }
  )
}

/**
 * Buscar vehículos por placa, VIN o modelo
 */
export async function searchVehicles(searchTerm: string): Promise<Vehicle[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('vehicles')
        .select('*')
        .or(`license_plate.ilike.%${searchTerm}%,vin.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to search vehicles: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchVehicles',
      table: 'vehicles'
    }
  )
}






