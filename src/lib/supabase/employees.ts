/**
 * Servicio de Empleados
 * Funciones para manejar empleados del taller
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Employee, EmployeeInsert, EmployeeUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Employee

export interface CreateEmployeeData {
  name: string
  email: string
  phone?: string
  role: string
  specialties?: string[]
  hourly_rate?: number
  hire_date?: string
}

export interface UpdateEmployeeData {
  name?: string
  email?: string
  phone?: string
  role?: string
  specialties?: string[]
  hourly_rate?: number
  is_active?: boolean
  hire_date?: string
}

/**
 * Obtener empleados
 */
export async function getEmployees(filters?: {
  role?: string
  is_active?: boolean
  specialty?: string
}): Promise<Employee[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('employees').select('*')
      
      if (filters) {
        if (filters.role) {
          query = query.eq('role', filters.role)
        }
        if (filters.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active)
        }
        if (filters.specialty) {
          query = query.contains('specialties', [filters.specialty])
        }
      }
      
      const { data, error } = await query
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch employees: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getEmployees',
      table: 'employees'
    }
  )
}

/**
 * Obtener empleado por ID
 */
export async function getEmployeeById(id: string): Promise<Employee | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('employees')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null
        }
        throw new Error(`Failed to fetch employee: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getEmployeeById',
      table: 'employees'
    }
  )
}

/**
 * Crear empleado
 */
export async function createEmployee(employee: CreateEmployeeData): Promise<Employee> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('employees')
        .insert({
          ...employee,
          is_active: true
        })
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create employee: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createEmployee',
      table: 'employees'
    }
  )
}

/**
 * Actualizar empleado
 */
export async function updateEmployee(id: string, employee: UpdateEmployeeData): Promise<Employee> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('employees')
        .update({
          ...employee,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update employee: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateEmployee',
      table: 'employees'
    }
  )
}

/**
 * Desactivar empleado
 */
export async function deactivateEmployee(id: string): Promise<Employee> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('employees')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to deactivate employee: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'deactivateEmployee',
      table: 'employees'
    }
  )
}

/**
 * Activar empleado
 */
export async function activateEmployee(id: string): Promise<Employee> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('employees')
        .update({
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to activate employee: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'activateEmployee',
      table: 'employees'
    }
  )
}

/**
 * Buscar empleados por nombre o email
 */
export async function searchEmployees(searchTerm: string): Promise<Employee[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('employees')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to search employees: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchEmployees',
      table: 'employees'
    }
  )
}

/**
 * Obtener mecánicos activos
 */
export async function getActiveMechanics(): Promise<Employee[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .or('role.eq.mechanic,role.eq.technician')
        .order('name', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch mechanics: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getActiveMechanics',
      table: 'employees'
    }
  )
}

/**
 * Estadísticas de empleado/mecánico
 */
export interface EmployeeStats {
  employee_id: string
  total_orders: number
  in_progress_orders: number
  completed_orders: number
  avg_completion_time: number | null
  efficiency_rate: number
}

/**
 * Obtener estadísticas de un empleado
 */
export async function getEmployeeStats(employeeId: string): Promise<EmployeeStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Obtener todas las órdenes del empleado
      const { data: orders, error } = await client
        .from('work_orders')
        .select('id, status, entry_date, completed_at')
        .eq('assigned_to', employeeId)
      
      if (error) {
        throw new Error(`Failed to fetch employee stats: ${error.message}`)
      }
      
      const total_orders = orders?.length || 0
      const completed = orders?.filter(o => o.status === 'completed') || []
      const in_progress = orders?.filter(o => 
        o.status !== 'completed' && o.status !== 'cancelled'
      ) || []
      
      // Calcular tiempo promedio de completación
      let avg_completion_time = null
      if (completed.length > 0) {
        const times = completed
          .filter(o => o.completed_at && o.entry_date)
          .map(o => {
            const start = new Date(o.entry_date).getTime()
            const end = new Date(o.completed_at!).getTime()
            return (end - start) / (1000 * 60 * 60 * 24) // días
          })
        
        if (times.length > 0) {
          avg_completion_time = times.reduce((a, b) => a + b, 0) / times.length
        }
      }
      
      // Calcular eficiencia (órdenes completadas / total)
      const efficiency_rate = total_orders > 0 
        ? (completed.length / total_orders) * 100 
        : 0
      
      return {
        employee_id: employeeId,
        total_orders,
        in_progress_orders: in_progress.length,
        completed_orders: completed.length,
        avg_completion_time,
        efficiency_rate: Math.round(efficiency_rate * 100) / 100
      }
    },
    {
      operation: 'getEmployeeStats',
      table: 'work_orders'
    }
  )
}

/**
 * Obtener órdenes asignadas a un empleado
 */
export async function getEmployeeOrders(
  employeeId: string,
  filters?: {
    status?: string
    limit?: number
  }
): Promise<any[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client
        .from('work_orders')
        .select(`
          *,
          customer:customers(id, name, phone, email),
          vehicle:vehicles(id, brand, model, year, license_plate)
        `)
        .eq('assigned_to', employeeId)
      
      if (filters?.status) {
        query = query.eq('status', filters.status)
      }
      
      if (filters?.limit) {
        query = query.limit(filters.limit)
      }
      
      const { data, error } = await query
        .order('entry_date', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to fetch employee orders: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getEmployeeOrders',
      table: 'work_orders'
    }
  )
}

/**
 * Asignar orden a un empleado
 */
export async function assignOrderToEmployee(
  orderId: string,
  employeeId: string
): Promise<any> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('work_orders')
        .update({
          assigned_to: employeeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to assign order: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'assignOrderToEmployee',
      table: 'work_orders'
    }
  )
}

/**
 * Remover asignación de orden
 */
export async function unassignOrder(orderId: string): Promise<any> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('work_orders')
        .update({
          assigned_to: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to unassign order: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'unassignOrder',
      table: 'work_orders'
    }
  )
}

/**
 * Obtener resumen de todos los empleados con sus estadísticas
 */
export async function getAllEmployeesWithStats(): Promise<any[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // Obtener todos los empleados activos
      const { data: employees, error: empError } = await client
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })
      
      if (empError) {
        throw new Error(`Failed to fetch employees: ${empError.message}`)
      }
      
      if (!employees || employees.length === 0) {
        return []
      }
      
      // Obtener estadísticas para cada empleado
      const employeesWithStats = await Promise.all(
        employees.map(async (emp) => {
          const stats = await getEmployeeStats(emp.id)
          return {
            ...emp,
            stats
          }
        })
      )
      
      return employeesWithStats
    },
    {
      operation: 'getAllEmployeesWithStats',
      table: 'employees'
    }
  )
}






