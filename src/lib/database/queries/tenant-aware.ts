/**
 * Tenant-Aware Database Queries
 * Funciones para crear registros con organization_id y workshop_id automático
 */

import { supabase } from '@/lib/supabase/client'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext, createTenantFilters } from '@/lib/core/multi-tenant'

// =====================================================
// WORK ORDERS
// =====================================================

export interface CreateWorkOrderData {
  customer_id: string
  vehicle_id: string
  description: string
  estimated_cost?: number
  notes?: string
  status?: string
}

export interface WorkOrderWithTenant extends CreateWorkOrderData {
  organization_id: string
  workshop_id: string
}

/**
 * Crea una orden de trabajo con tenant context automático
 */
export async function createWorkOrderWithTenant(orderData: CreateWorkOrderData): Promise<any> {
  const supabaseClient = await createClient()
  
  // Obtener contexto del tenant
  const tenantContext = await getTenantContext()
  
  // Crear datos completos con tenant info
  const fullOrderData: WorkOrderWithTenant = {
    ...orderData,
    organization_id: tenantContext.organizationId,
    workshop_id: tenantContext.workshopId,
    status: orderData.status || 'reception'
  }
  
  const { data, error } = await supabaseClient
    .from('work_orders')
    .insert(fullOrderData)
    .select(`
      *,
      customer:customers!customer_id (
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles!vehicle_id (
        id,
        brand,
        model,
        year,
        license_plate,
        color
      )
    `)
    .single()

  if (error) {
    throw new Error(`Error al crear orden de trabajo: ${error.message}`)
  }

  return data
}

/**
 * Obtiene órdenes de trabajo filtradas por tenant
 */
export async function getWorkOrdersByTenant(filters?: {
  status?: string
  search?: string
}): Promise<any[]> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  let query = supabaseClient
    .from('work_orders')
    .select(`
      *,
      customer:customers!customer_id (
        id,
        name,
        email,
        phone
      ),
      vehicle:vehicles!vehicle_id (
        id,
        brand,
        model,
        year,
        license_plate,
        color
      )
    `)
    .eq('organization_id', tenantContext.organizationId)
    .eq('workshop_id', tenantContext.workshopId)
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.search) {
    query = query.or(`
      description.ilike.%${filters.search}%,
      customer.name.ilike.%${filters.search}%,
      vehicle.license_plate.ilike.%${filters.search}%
    `)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener órdenes: ${error.message}`)
  }

  return data || []
}

// =====================================================
// CUSTOMERS
// =====================================================

export interface CreateCustomerData {
  name: string
  email?: string
  phone?: string
  address?: string
  company?: string
}

export interface CustomerWithTenant extends CreateCustomerData {
  organization_id: string
  workshop_id: string
}

/**
 * Crea un cliente con tenant context automático
 */
export async function createCustomerWithTenant(customerData: CreateCustomerData): Promise<any> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  const fullCustomerData: CustomerWithTenant = {
    ...customerData,
    organization_id: tenantContext.organizationId,
    workshop_id: tenantContext.workshopId
  }
  
  const { data, error } = await supabaseClient
    .from('customers')
    .insert(fullCustomerData)
    .select()
    .single()

  if (error) {
    throw new Error(`Error al crear cliente: ${error.message}`)
  }

  return data
}

/**
 * Obtiene clientes filtrados por tenant
 */
export async function getCustomersByTenant(search?: string): Promise<any[]> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  let query = supabaseClient
    .from('customers')
    .select('*')
    .eq('organization_id', tenantContext.organizationId)
    .eq('workshop_id', tenantContext.workshopId)
    .order('name')

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener clientes: ${error.message}`)
  }

  return data || []
}

// =====================================================
// VEHICLES
// =====================================================

export interface CreateVehicleData {
  customer_id: string
  brand: string
  model: string
  year: number
  license_plate: string
  color?: string
  vin?: string
}

export interface VehicleWithTenant extends CreateVehicleData {
  organization_id: string
  workshop_id: string
}

/**
 * Crea un vehículo con tenant context automático
 */
export async function createVehicleWithTenant(vehicleData: CreateVehicleData): Promise<any> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  const fullVehicleData: VehicleWithTenant = {
    ...vehicleData,
    organization_id: tenantContext.organizationId,
    workshop_id: tenantContext.workshopId
  }
  
  const { data, error } = await supabaseClient
    .from('vehicles')
    .insert(fullVehicleData)
    .select(`
      *,
      customer:customers!customer_id (
        id,
        name,
        email,
        phone
      )
    `)
    .single()

  if (error) {
    throw new Error(`Error al crear vehículo: ${error.message}`)
  }

  return data
}

/**
 * Obtiene vehículos filtrados por tenant
 */
export async function getVehiclesByTenant(customerId?: string): Promise<any[]> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  let query = supabaseClient
    .from('vehicles')
    .select(`
      *,
      customer:customers!customer_id (
        id,
        name,
        email,
        phone
      )
    `)
    .eq('organization_id', tenantContext.organizationId)
    .eq('workshop_id', tenantContext.workshopId)
    .order('brand, model')

  if (customerId) {
    query = query.eq('customer_id', customerId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener vehículos: ${error.message}`)
  }

  return data || []
}

// =====================================================
// INVENTORY
// =====================================================

export interface CreateInventoryData {
  name: string
  description?: string
  sku?: string
  quantity: number
  unit_price: number
  category?: string
  min_stock?: number
}

export interface InventoryWithTenant extends CreateInventoryData {
  organization_id: string
  workshop_id: string
}

/**
 * Crea un item de inventario con tenant context automático
 */
export async function createInventoryWithTenant(inventoryData: CreateInventoryData): Promise<any> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  const fullInventoryData: InventoryWithTenant = {
    ...inventoryData,
    organization_id: tenantContext.organizationId,
    workshop_id: tenantContext.workshopId
  }
  
  const { data, error } = await supabaseClient
    .from('inventory')
    .insert(fullInventoryData)
    .select()
    .single()

  if (error) {
    throw new Error(`Error al crear item de inventario: ${error.message}`)
  }

  return data
}

/**
 * Obtiene inventario filtrado por tenant
 */
export async function getInventoryByTenant(filters?: {
  category?: string
  lowStock?: boolean
  search?: string
}): Promise<any[]> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  let query = supabaseClient
    .from('inventory')
    .select('*')
    .eq('organization_id', tenantContext.organizationId)
    .eq('workshop_id', tenantContext.workshopId)
    .order('name')

  if (filters?.category) {
    query = query.eq('category', filters.category)
  }

  if (filters?.lowStock) {
    query = query.lte('quantity', 'min_stock')
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Error al obtener inventario: ${error.message}`)
  }

  return data || []
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Actualiza un registro existente con validación de tenant
 */
export async function updateRecordWithTenantValidation(
  table: string,
  id: string,
  updates: any
): Promise<any> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  // Primero verificar que el registro pertenece al tenant
  const { data: existingRecord, error: fetchError } = await supabaseClient
    .from(table)
    .select('id, organization_id, workshop_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingRecord) {
    throw new Error(`Registro no encontrado: ${id}`)
  }

  if (existingRecord.organization_id !== tenantContext.organizationId) {
    throw new Error('No autorizado para modificar este registro')
  }

  if (existingRecord.workshop_id && existingRecord.workshop_id !== tenantContext.workshopId) {
    throw new Error('No autorizado para modificar este registro del workshop')
  }

  // Actualizar el registro
  const { data, error } = await supabaseClient
    .from(table)
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Error al actualizar registro: ${error.message}`)
  }

  return data
}

/**
 * Elimina un registro con validación de tenant
 */
export async function deleteRecordWithTenantValidation(
  table: string,
  id: string
): Promise<boolean> {
  const supabaseClient = await createClient()
  const tenantContext = await getTenantContext()
  
  // Verificar que el registro pertenece al tenant
  const { data: existingRecord, error: fetchError } = await supabaseClient
    .from(table)
    .select('id, organization_id, workshop_id')
    .eq('id', id)
    .single()

  if (fetchError || !existingRecord) {
    throw new Error(`Registro no encontrado: ${id}`)
  }

  if (existingRecord.organization_id !== tenantContext.organizationId) {
    throw new Error('No autorizado para eliminar este registro')
  }

  if (existingRecord.workshop_id && existingRecord.workshop_id !== tenantContext.workshopId) {
    throw new Error('No autorizado para eliminar este registro del workshop')
  }

  // Eliminar el registro
  const { error } = await supabaseClient
    .from(table)
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Error al eliminar registro: ${error.message}`)
  }

  return true
}



