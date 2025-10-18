/**
 * Servicio de Customers (Clientes)
 * Maneja todas las operaciones relacionadas con clientes
 */

import { BaseService } from './BaseService'
import { Customer, CreateCustomerData, UpdateCustomerData } from '@/types/entities'
import { createCustomerSchema, updateCustomerSchema } from '@/lib/validation/schemas'
import { DatabaseError } from '@/lib/errors'

export interface CustomerStats {
  total_customers: number
  active_customers: number
  inactive_customers: number
  new_customers_this_month: number
  customers_with_orders: number
  average_order_value: number
  total_revenue: number
}

export class CustomersService extends BaseService<Customer, CreateCustomerData, UpdateCustomerData> {
  constructor() {
    super('customers')
  }
  
  /**
   * Obtiene estadísticas de clientes
   */
  async getStats(): Promise<CustomerStats> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('status, created_at, total_orders, total_spent')
      
      if (error) {
        throw new DatabaseError('Error fetching customer stats', error)
      }
      
      return this.processStats(data || [])
    } catch (error) {
      console.error('Error in CustomersService.getStats:', error)
      throw error
    }
  }
  
  /**
   * Obtiene clientes por estado
   */
  async getByStatus(status: string): Promise<Customer[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching customers by status', error)
      }
      
      return (data || []) as Customer[]
    } catch (error) {
      console.error('Error in CustomersService.getByStatus:', error)
      throw error
    }
  }
  
  /**
   * Obtiene clientes activos
   */
  async getActive(): Promise<Customer[]> {
    return this.getByStatus('active')
  }
  
  /**
   * Obtiene clientes inactivos
   */
  async getInactive(): Promise<Customer[]> {
    return this.getByStatus('inactive')
  }
  
  /**
   * Busca clientes por nombre o email
   */
  async searchByNameOrEmail(term: string): Promise<Customer[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .or(`name.ilike.%${term}%,email.ilike.%${term}%`)
        .order('name', { ascending: true })
      
      if (error) {
        throw new DatabaseError('Error searching customers', error)
      }
      
      return (data || []) as Customer[]
    } catch (error) {
      console.error('Error in CustomersService.searchByNameOrEmail:', error)
      throw error
    }
  }
  
  /**
   * Obtiene clientes con órdenes
   */
  async getWithOrders(): Promise<Customer[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gt('total_orders', 0)
        .order('total_spent', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching customers with orders', error)
      }
      
      return (data || []) as Customer[]
    } catch (error) {
      console.error('Error in CustomersService.getWithOrders:', error)
      throw error
    }
  }
  
  /**
   * Obtiene clientes por rango de gasto
   */
  async getBySpendingRange(minAmount: number, maxAmount: number): Promise<Customer[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('total_spent', minAmount)
        .lte('total_spent', maxAmount)
        .order('total_spent', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching customers by spending range', error)
      }
      
      return (data || []) as Customer[]
    } catch (error) {
      console.error('Error in CustomersService.getBySpendingRange:', error)
      throw error
    }
  }
  
  /**
   * Obtiene clientes por fecha de creación
   */
  async getByCreationDate(startDate: string, endDate: string): Promise<Customer[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching customers by creation date', error)
      }
      
      return (data || []) as Customer[]
    } catch (error) {
      console.error('Error in CustomersService.getByCreationDate:', error)
      throw error
    }
  }
  
  /**
   * Obtiene clientes por última orden
   */
  async getByLastOrderDate(startDate: string, endDate: string): Promise<Customer[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('last_order_date', startDate)
        .lte('last_order_date', endDate)
        .order('last_order_date', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching customers by last order date', error)
      }
      
      return (data || []) as Customer[]
    } catch (error) {
      console.error('Error in CustomersService.getByLastOrderDate:', error)
      throw error
    }
  }
  
  /**
   * Obtiene clientes VIP (alto gasto)
   */
  async getVIP(threshold: number = 10000): Promise<Customer[]> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .gte('total_spent', threshold)
        .order('total_spent', { ascending: false })
      
      if (error) {
        throw new DatabaseError('Error fetching VIP customers', error)
      }
      
      return (data || []) as Customer[]
    } catch (error) {
      console.error('Error in CustomersService.getVIP:', error)
      throw error
    }
  }
  
  /**
   * Obtiene clientes inactivos (sin órdenes recientes)
   */
  async getInactive(months: number = 6): Promise<Customer[]> {
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
        throw new DatabaseError('Error fetching inactive customers', error)
      }
      
      return (data || []) as Customer[]
    } catch (error) {
      console.error('Error in CustomersService.getInactive:', error)
      throw error
    }
  }
  
  /**
   * Actualiza el total gastado de un cliente
   */
  async updateTotalSpent(customerId: string, amount: number): Promise<Customer> {
    try {
      // Obtener el cliente actual
      const currentCustomer = await this.getById(customerId)
      if (!currentCustomer) {
        throw new Error('Customer not found')
      }
      
      const newTotalSpent = (currentCustomer.total_spent || 0) + amount
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          total_spent: newTotalSpent,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError('Error updating customer total spent', error)
      }
      
      return data as Customer
    } catch (error) {
      console.error('Error in CustomersService.updateTotalSpent:', error)
      throw error
    }
  }
  
  /**
   * Actualiza el total de órdenes de un cliente
   */
  async updateTotalOrders(customerId: string): Promise<Customer> {
    try {
      // Obtener el cliente actual
      const currentCustomer = await this.getById(customerId)
      if (!currentCustomer) {
        throw new Error('Customer not found')
      }
      
      const newTotalOrders = (currentCustomer.total_orders || 0) + 1
      
      const { data, error } = await this.supabase
        .from(this.tableName)
        .update({
          total_orders: newTotalOrders,
          last_order_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId)
        .select()
        .single()
      
      if (error) {
        throw new DatabaseError('Error updating customer total orders', error)
      }
      
      return data as Customer
    } catch (error) {
      console.error('Error in CustomersService.updateTotalOrders:', error)
      throw error
    }
  }
  
  /**
   * Procesa estadísticas de clientes
   */
  private processStats(data: any[]): CustomerStats {
    const total = data.length
    const active = data.filter(c => c.status === 'active').length
    const inactive = data.filter(c => c.status === 'inactive').length
    
    const thisMonth = new Date()
    thisMonth.setDate(1)
    const thisMonthString = thisMonth.toISOString().split('T')[0]
    const newThisMonth = data.filter(c => c.created_at >= thisMonthString).length
    
    const withOrders = data.filter(c => (c.total_orders || 0) > 0).length
    
    const totalRevenue = data.reduce((sum, c) => sum + (c.total_spent || 0), 0)
    const averageOrderValue = withOrders > 0 ? totalRevenue / withOrders : 0
    
    return {
      total_customers: total,
      active_customers: active,
      inactive_customers: inactive,
      new_customers_this_month: newThisMonth,
      customers_with_orders: withOrders,
      average_order_value: averageOrderValue,
      total_revenue: totalRevenue
    }
  }
  
  /**
   * Validación específica para crear clientes
   */
  protected validateCreateData(data: CreateCustomerData): void {
    const validation = validateData(createCustomerSchema, data)
    if (!validation.success) {
      throw new Error(`Validation failed: ${Object.values(validation.errors || {}).join(', ')}`)
    }
  }
  
  /**
   * Validación específica para actualizar clientes
   */
  protected validateUpdateData(data: UpdateCustomerData): void {
    const validation = validateData(updateCustomerSchema, data)
    if (!validation.success) {
      throw new Error(`Validation failed: ${Object.values(validation.errors || {}).join(', ')}`)
    }
  }
  
  /**
   * Transformación de datos antes de crear
   */
  protected transformCreateData(data: CreateCustomerData): any {
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
  protected transformUpdateData(data: UpdateCustomerData): any {
    return {
      ...data
    }
  }
  
  /**
   * Transformación de datos después de obtener
   */
  protected transformResponseData(data: any): Customer {
    return {
      ...data,
      total_orders: data.total_orders || 0,
      total_spent: data.total_spent || 0
    } as Customer
  }
}
