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






