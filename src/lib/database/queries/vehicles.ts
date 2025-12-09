import { createClient } from '@/lib/supabase/server'

/**
 * Tipo para el modelo Vehicle
 */
export interface Vehicle {
  id: string
  customer_id: string
  brand: string
  model: string
  year: number | null
  license_plate: string | null
  vin?: string | null
  color?: string | null
  mileage?: number | null
  created_at: string
  updated_at: string
  // Relación con customer
  customer?: {
    id: string
    name: string
    email: string
    phone: string
  }
}

export interface CreateVehicleData {
  customer_id: string
  brand: string
  model: string
  year?: number | null
  license_plate?: string | null
  vin?: string | null
  color?: string | null
  mileage?: number | null
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {}

/**
 * Obtener todos los vehículos de una organización
 */
export async function getAllVehicles(organizationId: string) {
  const supabase = await createClient()

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      )
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vehicles:', error)
    throw new Error('Error al obtener vehículos')
  }

  return vehicles || []
}

/**
 * Obtener un vehículo por ID y organización
 */
export async function getVehicleById(id: string, organizationId: string) {
  const supabase = await createClient()

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      )
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (error) {
    console.error('Error fetching vehicle by id:', error)
    throw new Error('Error al obtener el vehículo')
  }

  return vehicle
}

/**
 * Obtener vehículos por ID de cliente dentro de una organización
 */
export async function getVehiclesByCustomerId(customerId: string, organizationId: string) {
  const supabase = await createClient()

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customerId)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching vehicles by customer id:', error)
    throw new Error('Error al obtener vehículos del cliente')
  }

  return vehicles || []
}

/**
 * Crear un nuevo vehículo para la organización
 */
export async function createVehicle(data: CreateVehicleData, organizationId: string) {
  console.log('🔧 createVehicle - Iniciando creación en base de datos');
  console.log('📊 Datos a insertar:', JSON.stringify(data, null, 2));
  
  const supabase = await createClient()

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .insert({ ...data, organization_id: organizationId } as any)
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      )
    `)
    .single()

  if (error) {
    console.error('❌ Error creating vehicle:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    throw new Error(`Error al crear el vehículo: ${error.message}`)
  }

  console.log('✅ Vehículo creado en BD:', vehicle.id)
  return vehicle
}

/**
 * Actualizar un vehículo (validando organización)
 */
export async function updateVehicle(id: string, data: UpdateVehicleData, organizationId: string) {
  const supabase = await createClient()

  const updateData = {
    ...data,
    updated_at: new Date().toISOString(),
  }

  const { data: vehicle, error } = await supabase
    .from('vehicles')
    .update(updateData as any)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      )
    `)
    .single()

  if (error) {
    console.error('Error updating vehicle:', error)
    throw new Error('Error al actualizar el vehículo')
  }

  return vehicle
}

/**
 * Eliminar un vehículo (validando organización)
 */
export async function deleteVehicle(id: string, organizationId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)
    .eq('organization_id', organizationId)

  if (error) {
    console.error('Error deleting vehicle:', error)
    throw new Error('Error al eliminar el vehículo')
  }

  return { success: true }
}

/**
 * Buscar vehículos dentro de una organización
 */
export async function searchVehicles(searchTerm: string, organizationId: string) {
  const supabase = await createClient()

  const { data: vehicles, error } = await supabase
    .from('vehicles')
    .select(`
      *,
      customer:customers(
        id,
        name,
        email,
        phone
      )
    `)
    .eq('organization_id', organizationId)
    .or(`brand.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,license_plate.ilike.%${searchTerm}%,vin.ilike.%${searchTerm}%`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error searching vehicles:', error)
    throw new Error('Error al buscar vehículos')
  }

  return vehicles || []
}

// TODO: Implementar estas funciones cuando se necesiten
export async function getVehiclesByCustomer(customerId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching vehicles by customer:', error)
    throw error
  }
  
  return data || []
}

export async function getVehicleWithHistory(vehicleId: string) {
  const supabase = await createClient()
  
  // Obtener vehículo
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*, customers(*)')
    .eq('id', vehicleId)
    .single()
  
  if (vehicleError) {
    console.error('Error fetching vehicle:', vehicleError)
    throw vehicleError
  }
  
  // Obtener historial de órdenes
  const { data: workOrders, error: ordersError } = await supabase
    .from('work_orders')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('created_at', { ascending: false })
  
  if (ordersError) {
    console.error('Error fetching work orders:', ordersError)
  }
  
  return {
    ...(vehicle || {}),
    work_orders: workOrders || []
  }
}