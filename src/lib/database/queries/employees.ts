import { createClient } from '@/lib/supabase/server'

/**
 * Tipo para el modelo Employee
 */
export interface Employee {
  id: string
  name: string
  email?: string
  phone?: string
  role: string
  specialties?: string[]
  hourly_rate?: number
  is_active: boolean
  hire_date?: string
  workshop_id: string
  created_at: string
  updated_at: string
}

/**
 * Obtener todos los empleados
 */
export async function getAllEmployees(workshopId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('employees')
    .select('*')
    .order('name')

  // Si se proporciona workshopId, filtrar por taller
  if (workshopId) {
    query = query.eq('workshop_id', workshopId)
  }

  const { data: employees, error } = await query

  if (error) {
    console.error('Error fetching employees:', error)
    throw new Error('Error al obtener empleados')
  }

  return employees || []
}

/**
 * Obtener un empleado por ID
 */
export async function getEmployeeById(id: string) {
  const supabase = await createClient()

  const { data: employee, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching employee by id:', error)
    throw new Error('Error al obtener el empleado')
  }

  return employee
}

/**
 * Obtener mecánicos activos
 */
export async function getActiveMechanics(workshopId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .in('role', ['mechanic', 'supervisor', 'technician'])
    .order('name')

  if (workshopId) {
    query = query.eq('workshop_id', workshopId)
  }

  const { data: mechanics, error } = await query

  if (error) {
    console.error('Error fetching mechanics:', error)
    throw new Error('Error al obtener mecánicos')
  }

  return mechanics || []
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
  const supabase = await createClient()
  
  const { data: orders, error } = await supabase
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
  
  let avg_completion_time = null
  if (completed.length > 0) {
    const times = completed
      .filter(o => o.completed_at && o.entry_date)
      .map(o => {
        const start = new Date(o.entry_date).getTime()
        const end = new Date(o.completed_at!).getTime()
        return (end - start) / (1000 * 60 * 60 * 24)
      })
    
    if (times.length > 0) {
      avg_completion_time = times.reduce((a, b) => a + b, 0) / times.length
    }
  }
  
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
}

export async function getEmployeeOrders(
  employeeId: string,
  filters?: {
    status?: string
    limit?: number
  }
): Promise<any[]> {
  const supabase = await createClient()
  
  let query = supabase
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
}

export async function assignOrderToEmployee(
  orderId: string,
  employeeId: string
): Promise<any> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
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
}

export async function unassignOrder(orderId: string): Promise<any> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
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
}

export async function getAllEmployeesWithStats(): Promise<any[]> {
  const supabase = await createClient()
  
  const { data: employees, error: empError } = await supabase
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
}
