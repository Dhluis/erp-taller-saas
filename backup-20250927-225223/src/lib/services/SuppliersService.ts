/**
 * Servicio de Suppliers (Proveedores)
 * Maneja todas las operaciones relacionadas con proveedores
 */

import { BaseService } from './BaseService'
import { Supplier, CreateSupplierData, UpdateSupplierData } from '@/types/entities'
import { createSupplierSchema, updateSupplierSchema } from '@/lib/validation/schemas'
import { DatabaseError } from '@/lib/errors'

export interface SupplierStats {
  total_suppliers: number
  active_suppliers: number
  inactive_suppliers: number
  new_suppliers_this_month: number
  suppliers_with_orders: number
  average_order_value: number
  total_spent: number
}

export class SuppliersService extends BaseService<Supplier, CreateSupplierData, UpdateSupplierData> {
  constructor() {
    super('suppliers')
  }
  
  /**
   * Obtiene estadísticas de proveedores
   */
  async getStats(): Promise<SupplierStats> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('status, created_at, total_orders, total_spent')
      
      if (error) {
        throw new DatabaseError('Error fetching supplier stats', error)
      }
      
      return this.processStats(data || [])
    } catch (error) {
      console.error('Error in SuppliersService.getStats:', error)
      throw error
    }
  }
  
  /**
   * Obtiene proveedores por estado
   */
  async getByStatus(status: string): Promise<Supplier[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching suppliers by status', error)
      }
      
      return (data || []) as Supplier[]
    } catch (error) {
      console.error('Error in SuppliersService.getByStatus:', error)
      throw error
    }
  }
  
  /**
   * Obtiene proveedores activos
   */
  async getActive(): Promise<Supplier[]> {
    return this.getByStatus('active')
  }
  
  /**
   * Obtiene proveedores inactivos
   */
  async getInactive(): Promise<Supplier[]> {
    return this.getByStatus('inactive')
  }
  
  /**
   * Busca proveedores por nombre o contacto
   */
  async searchByNameOrContact(term: string): Promise<Supplier[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .or(`name.ilike.%${term}%,contact_person.ilike.%${term}%,email.ilike.%${term}%`)
        .order('name', { ascending: true })
      
      if (error) {
        throw new DatabaseError('Error searching suppliers', error)
      }
      
      return (data || []) as Supplier[]
    } catch (error) {
      console.error('Error in SuppliersService.searchByNameOrContact:', error)
      throw error
    }
  }
  
  /**
   * Obtiene proveedores con órdenes
   */
  async getWithOrders(): Promise<Supplier[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gt('total_orders', 0)
        .order('total_spent', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching suppliers with orders', error)
      }
      
      return (data || []) as Supplier[]
    } catch (error) {
      console.error('Error in SuppliersService.getWithOrders:', error)
      throw error
    }
  }
  
  /**
   * Obtiene proveedores por rango de gasto
   */
  async getBySpendingRange(minAmount: number, maxAmount: number): Promise<Supplier[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('total_spent', minAmount)
        .lte('total_spent', maxAmount)
        .order('total_spent', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching suppliers by spending range', error)
      }
      
      return (data || []) as Supplier[]
    } catch (error) {
      console.error('Error in SuppliersService.getBySpendingRange:', error)
      throw error
    }
  }
  
  /**
   * Obtiene proveedores por fecha de creación
   */
  async getByCreationDate(startDate: string, endDate: string): Promise<Supplier[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching suppliers by creation date', error)
      }
      
      return (data || []) as Supplier[]
    } catch (error) {
      console.error('Error in SuppliersService.getByCreationDate:', error)
      throw error
    }
  }
  
  /**
   * Obtiene proveedores por última orden
   */
  async getByLastOrderDate(startDate: string, endDate: string): Promise<Supplier[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('last_order_date', startDate)
        .lte('last_order_date', endDate)
        .order('last_order_date', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching suppliers by last order date', error)
      }
      
      return (data || []) as Supplier[]
    } catch (error) {
      console.error('Error in SuppliersService.getByLastOrderDate:', error)
      throw error
    }
  }
  
  /**
   * Obtiene proveedores principales (alto gasto)
   */
  async getTopSuppliers(threshold: number = 5000): Promise<Supplier[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('total_spent', threshold)
        .order('total_spent', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching top suppliers', error)
      }
      
      return (data || []) as Supplier[]
    } catch (error) {
      console.error('Error in SuppliersService.getTopSuppliers:', error)
      throw error
    }
  }
  
  /**
   * Obtiene proveedores inactivos (sin órdenes recientes)
   */
  async getInactive(months: number = 6): Promise<Supplier[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - months)
      const cutoffDateString = cutoffDate.toISOString().split('T')[0]
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .or(`last_order_date.is.null,last_order_date.lt.${cutoffDateString}`)
        .order('last_order_date', { ascending: true })
      
      if (error) {
        throw new DatabaseError('Error fetching inactive suppliers', error)
      }
      
      return (data || []) as Supplier[]
    } catch (error) {
      console.error('Error in SuppliersService.getInactive:', error)
      throw error
    }
  }
  
  /**
   * Actualiza el total gastado de un proveedor
   */
  async updateTotalSpent(supplierId: string, amount: number): Promise<Supplier> {
    try {
      // Obtener el proveedor actual
      const currentSupplier = await this.getById(supplierId)
      if (!currentSupplier) {
        throw new Error('Supplier not found')
      }
      
      const newTotalSpent = (currentSupplier.total_spent || 0) + amount
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          total_spent: newTotalSpent,
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError('Error updating supplier total spent', error)
      }
      
      return data as Supplier
    } catch (error) {
      console.error('Error in SuppliersService.updateTotalSpent:', error)
      throw error
    }
  }
  
  /**
   * Actualiza el total de órdenes de un proveedor
   */
  async updateTotalOrders(supplierId: string): Promise<Supplier> {
    try {
      // Obtener el proveedor actual
      const currentSupplier = await this.getById(supplierId)
      if (!currentSupplier) {
        throw new Error('Supplier not found')
      }
      
      const newTotalOrders = (currentSupplier.total_orders || 0) + 1
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          total_orders: newTotalOrders,
          last_order_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError('Error updating supplier total orders', error)
      }
      
      return data as Supplier
    } catch (error) {
      console.error('Error in SuppliersService.updateTotalOrders:', error)
      throw error
    }
  }
  
  /**
   * Procesa estadísticas de proveedores
   */
  private processStats(data: any[]): SupplierStats {
    const total = data.length
    const active = data.filter(s => s.status === 'active').length
    const inactive = data.filter(s => s.status === 'inactive').length
    
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const thisMonthString = thisMonth.toISOString().split('T')[0]
    const newThisMonth = data.filter(s => s.created_at >= thisMonthString).length
    
    const withOrders = data.filter(s => (s.total_orders || 0) > 0).length
    
    const totalSpent = data.reduce((sum, s) => sum + (s.total_spent || 0), 0)
    const averageOrderValue = withOrders > 0 ? totalSpent / withOrders : 0
    
    return {
      total_suppliers: total,
      active_suppliers: active,
      inactive_suppliers: inactive,
      new_suppliers_this_month: newThisMonth,
      suppliers_with_orders: withOrders,
      average_order_value: averageOrderValue,
      total_spent: totalSpent
    }
  }
  
  /**
   * Validación específica para crear proveedores
   */
  protected validateCreateData(data: CreateSupplierData): void {
    const validation = validateData(createSupplierSchema, data)
    if (!validation.success) {
      throw new Error(`Validation failed: ${Object.values(validation.errors || {}).join(', ')}`)
    }
  }
  
  /**
   * Validación específica para actualizar proveedores
   */
  protected validateUpdateData(data: UpdateSupplierData): void {
    const validation = validateData(updateSupplierSchema, data)
    if (!validation.success) {
      throw new Error(`Validation failed: ${Object.values(validation.errors || {}).join(', ')}`)
    }
  }
  
  /**
   * Transformación de datos antes de crear
   */
  protected transformCreateData(data: CreateSupplierData): any {
    return {
      ...data,
      organization_id: data.organization_id || '00000000-0000-0000-0000-000000000000',
      status: data.status || 'active',
      total_orders: 0,
      total_spent: 0
    }
  }
  
  /**
   * Transformación de datos antes de actualizar
   */
  protected transformUpdateData(data: UpdateSupplierData): any {
    return {
      ...data
    }
  }
  
  /**
   * Transformación de datos después de obtener
   */
  protected transformResponseData(data: any): Supplier {
    return {
      ...data,
      total_orders: data.total_orders || 0,
      total_spent: data.total_spent || 0
    } as Supplier
  }
}
