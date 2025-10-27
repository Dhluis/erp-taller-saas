'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { 
  getAllEmployees, 
  getEmployeeById, 
  getActiveMechanics,
  getEmployeeStats,
  getEmployeeOrders,
  assignOrderToEmployee,
  unassignOrder,
  getAllEmployeesWithStats,
  type Employee,
  type EmployeeStats
} from '@/lib/database/queries/employees'

interface UseEmployeesOptions {
  workshopId?: string
  autoLoad?: boolean
}

interface UseEmployeesReturn {
  // Estado
  employees: Employee[]
  mechanics: Employee[]
  employeesWithStats: any[]
  loading: boolean
  error: string | null
  
  // Acciones básicas
  loadEmployees: () => Promise<void>
  loadMechanics: () => Promise<void>
  loadEmployeesWithStats: () => Promise<void>
  refreshEmployees: () => Promise<void>
  
  // Acciones específicas
  getEmployee: (id: string) => Promise<Employee | null>
  getStats: (employeeId: string) => Promise<EmployeeStats | null>
  getOrders: (employeeId: string, filters?: { status?: string; limit?: number }) => Promise<any[]>
  assignOrder: (orderId: string, employeeId: string) => Promise<boolean>
  unassignOrderFromEmployee: (orderId: string) => Promise<boolean>
  
  // Utilidades
  clearError: () => void
}

export function useEmployees(options: UseEmployeesOptions = {}): UseEmployeesReturn {
  const { workshopId, autoLoad = true } = options
  
  // Estado
  const [employees, setEmployees] = useState<Employee[]>([])
  const [mechanics, setMechanics] = useState<Employee[]>([])
  const [employeesWithStats, setEmployeesWithStats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar empleados
  const loadEmployees = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getAllEmployees(workshopId)
      setEmployees(data)
      
      console.log('✅ [useEmployees] Empleados cargados:', data.length)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar empleados'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error:', errorMessage)
      toast.error('Error', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }, [workshopId])

  // Cargar mecánicos
  const loadMechanics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getActiveMechanics(workshopId)
      setMechanics(data)
      
      console.log('✅ [useEmployees] Mecánicos cargados:', data.length)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar mecánicos'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error:', errorMessage)
      toast.error('Error', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }, [workshopId])

  // Cargar empleados con estadísticas
  const loadEmployeesWithStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await getAllEmployeesWithStats()
      setEmployeesWithStats(data)
      
      console.log('✅ [useEmployees] Empleados con estadísticas cargados:', data.length)
    } catch (err: any) {
      const errorMessage = err.message || 'Error al cargar estadísticas de empleados'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error:', errorMessage)
      toast.error('Error', {
        description: errorMessage
      })
    } finally {
      setLoading(false)
    }
  }, [])

  // Refrescar todos los datos
  const refreshEmployees = useCallback(async () => {
    await Promise.all([
      loadEmployees(),
      loadMechanics(),
      loadEmployeesWithStats()
    ])
  }, [loadEmployees, loadMechanics, loadEmployeesWithStats])

  // Obtener empleado por ID
  const getEmployee = useCallback(async (id: string): Promise<Employee | null> => {
    try {
      setError(null)
      const employee = await getEmployeeById(id)
      return employee
    } catch (err: any) {
      const errorMessage = err.message || 'Error al obtener empleado'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error:', errorMessage)
      toast.error('Error', {
        description: errorMessage
      })
      return null
    }
  }, [])

  // Obtener estadísticas de empleado
  const getStats = useCallback(async (employeeId: string): Promise<EmployeeStats | null> => {
    try {
      setError(null)
      const stats = await getEmployeeStats(employeeId)
      return stats
    } catch (err: any) {
      const errorMessage = err.message || 'Error al obtener estadísticas'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error:', errorMessage)
      toast.error('Error', {
        description: errorMessage
      })
      return null
    }
  }, [])

  // Obtener órdenes de empleado
  const getOrders = useCallback(async (
    employeeId: string, 
    filters?: { status?: string; limit?: number }
  ): Promise<any[]> => {
    try {
      setError(null)
      const orders = await getEmployeeOrders(employeeId, filters)
      return orders
    } catch (err: any) {
      const errorMessage = err.message || 'Error al obtener órdenes del empleado'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error:', errorMessage)
      toast.error('Error', {
        description: errorMessage
      })
      return []
    }
  }, [])

  // Asignar orden a empleado
  const assignOrder = useCallback(async (orderId: string, employeeId: string): Promise<boolean> => {
    try {
      setError(null)
      await assignOrderToEmployee(orderId, employeeId)
      
      console.log('✅ [useEmployees] Orden asignada:', orderId, '→', employeeId)
      toast.success('Orden asignada', {
        description: 'La orden ha sido asignada al empleado'
      })
      
      // Refrescar datos
      await refreshEmployees()
      
      return true
    } catch (err: any) {
      const errorMessage = err.message || 'Error al asignar orden'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error:', errorMessage)
      toast.error('Error', {
        description: errorMessage
      })
      return false
    }
  }, [refreshEmployees])

  // Desasignar orden
  const unassignOrderFromEmployee = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      setError(null)
      await unassignOrder(orderId)
      
      console.log('✅ [useEmployees] Orden desasignada:', orderId)
      toast.success('Orden desasignada', {
        description: 'La orden ha sido desasignada'
      })
      
      // Refrescar datos
      await refreshEmployees()
      
      return true
    } catch (err: any) {
      const errorMessage = err.message || 'Error al desasignar orden'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error:', errorMessage)
      toast.error('Error', {
        description: errorMessage
      })
      return false
    }
  }, [refreshEmployees])

  // Limpiar error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Cargar datos automáticamente
  useEffect(() => {
    if (autoLoad) {
      refreshEmployees()
    }
  }, [autoLoad, refreshEmployees])

  return {
    // Estado
    employees,
    mechanics,
    employeesWithStats,
    loading,
    error,
    
    // Acciones básicas
    loadEmployees,
    loadMechanics,
    loadEmployeesWithStats,
    refreshEmployees,
    
    // Acciones específicas
    getEmployee,
    getStats,
    getOrders,
    assignOrder,
    unassignOrderFromEmployee,
    
    // Utilidades
    clearError
  }
}

// Hook simplificado solo para mecánicos
export function useMechanics(workshopId?: string) {
  const { mechanics, loading, error, loadMechanics, refreshEmployees } = useEmployees({
    workshopId,
    autoLoad: true
  })

  return {
    mechanics,
    loading,
    error,
    loadMechanics,
    refresh: refreshEmployees
  }
}

// Hook para estadísticas de empleados
export function useEmployeeStats() {
  const { employeesWithStats, loading, error, loadEmployeesWithStats, refreshEmployees } = useEmployees({
    autoLoad: true
  })

  return {
    employeesWithStats,
    loading,
    error,
    loadStats: loadEmployeesWithStats,
    refresh: refreshEmployees
  }
}
