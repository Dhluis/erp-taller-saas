'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useOrganization } from '@/lib/context/SessionContext'
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
  workshopId?: string // ⚠️ Opcional: si no se pasa, usa el del contexto
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
  const { workshopId: workshopIdParam, autoLoad = true } = options
  
  // ✅ FIX: Obtener workshopId del contexto si no se pasa como parámetro
  const { workshopId: contextWorkshopId, ready } = useOrganization()
  const workshopId = workshopIdParam || contextWorkshopId
  
  // Estado
  const [employees, setEmployees] = useState<Employee[]>([])
  const [mechanics, setMechanics] = useState<Employee[]>([])
  const [employeesWithStats, setEmployeesWithStats] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar empleados
  const loadEmployees = useCallback(async () => {
    // ✅ FIX: Solo cargar si el contexto está ready (no requiere workshopId específico)
    if (!ready) {
      console.log('⏳ [useEmployees] Esperando a que contexto esté ready...', { ready })
      setLoading(false)
      setEmployees([]) // Limpiar empleados mientras espera
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 [useEmployees] Cargando empleados desde API...')
      
      // ✅ FIX: Usar API route en lugar de query directa para evitar problemas de RLS
      const response = await fetch('/api/employees', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar empleados');
      }

      const result = await response.json();
      const employeesData = result.employees || result.data || [];
      
      // ✅ Filtrar por workshopId si está disponible (opcional)
      const filteredData = workshopId 
        ? employeesData.filter((emp: any) => emp.workshop_id === workshopId)
        : employeesData;
      
      setEmployees(filteredData)
      
      console.log('✅ [useEmployees] Empleados cargados:', filteredData.length)
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
  }, [workshopId, ready])

  // Cargar mecánicos
  const loadMechanics = useCallback(async () => {
    // ✅ FIX: Solo cargar si el contexto está ready
    if (!ready) {
      console.log('⏳ [useEmployees] Esperando a que contexto esté ready para mecánicos...', { ready })
      setLoading(false)
      setMechanics([]) // Limpiar mecánicos mientras espera
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 [useEmployees] Cargando mecánicos desde API...')
      
      // ✅ FIX: Usar API route en lugar de query directa para evitar problemas de RLS
      const response = await fetch('/api/employees', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar mecánicos');
      }

      const result = await response.json();
      const allEmployees = result.employees || result.data || [];
      
      // ✅ Filtrar por roles de mecánicos y workshopId si está disponible
      const mechanicsData = allEmployees.filter((emp: any) => {
        const isMechanic = ['mechanic', 'supervisor', 'receptionist', 'manager'].includes(emp.role);
        const matchesWorkshop = !workshopId || emp.workshop_id === workshopId;
        return isMechanic && matchesWorkshop && emp.is_active;
      });
      
      setMechanics(mechanicsData)
      
      console.log('✅ [useEmployees] Mecánicos cargados:', mechanicsData.length)
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
  }, [workshopId, ready])

  // Cargar empleados con estadísticas
  const loadEmployeesWithStats = useCallback(async () => {
    // ✅ FIX: Solo cargar si el contexto está ready
    if (!ready) {
      console.log('⏳ [useEmployees] Esperando a que contexto esté ready para empleados con stats...', { ready })
      setLoading(false)
      setEmployeesWithStats([])
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 [useEmployees] Cargando empleados con estadísticas desde API...')
      
      // ✅ FIX: Usar API route en lugar de query directa para evitar problemas de RLS
      const response = await fetch('/api/employees', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar empleados con estadísticas');
      }

      const result = await response.json();
      const employeesData = result.employees || result.data || [];
      
      // ✅ Filtrar por activos y agregar estadísticas básicas (si es necesario)
      // Por ahora, solo devolvemos los empleados activos
      // Las estadísticas detalladas se pueden calcular en el frontend o agregar un endpoint específico
      const activeEmployees = employeesData.filter((emp: any) => emp.is_active);
      
      setEmployeesWithStats(activeEmployees)
      
      console.log('✅ [useEmployees] Empleados con estadísticas cargados:', activeEmployees.length)
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
  }, [ready])

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

  // Asignar orden a empleado (usando API endpoint para evitar problemas de RLS)
  const assignOrder = useCallback(async (orderId: string, userId: string): Promise<boolean> => {
    setError(null)

    try {
      const payload = { assigned_to: userId }
      console.log('🔄 [useEmployees] Asignando orden vía API:', { orderId, payload })

      console.log('🔄 [useEmployees] Llamando API PUT /api/work-orders/' + orderId, {
        orderId,
        userId,
        payload
      })

      const response = await fetch(`/api/work-orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // ✅ CRÍTICO: Incluir cookies para autenticación
        body: JSON.stringify(payload)
      })

      console.log('📡 [useEmployees] Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      const data = await response.json().catch((err) => {
        console.error('❌ [useEmployees] Error parseando JSON:', err)
        return {}
      })

      console.log('📦 [useEmployees] Datos parseados:', data)

      if (!response.ok || data?.success === false) {
        const message = data?.error || response.statusText || 'Error al asignar orden'
        console.error('❌ [useEmployees] Error API asignar orden:', { 
          status: response.status, 
          statusText: response.statusText,
          data,
          message
        })
        throw new Error(message)
      }

      console.log('✅ [useEmployees] Orden asignada exitosamente:', { orderId, userId })
      toast.success('Orden asignada', {
        description: 'La orden ha sido asignada al mecánico'
      })

      // ✅ FIX: No refrescar empleados aquí
      // Es responsabilidad del componente padre refrescar las órdenes vía onSuccess()
      return true
    } catch (err: any) {
      const errorMessage = err?.message || 'Error al asignar orden'
      setError(errorMessage)
      console.error('❌ [useEmployees] Error asignando orden:', err)
      toast.error('Error al asignar', { description: errorMessage })
      return false
    }
  }, [])

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

  // ✅ FIX: Solo cargar cuando workshopId/contexto esté ready
  useEffect(() => {
    if (autoLoad && ready) {
      console.log('🔄 [useEmployees] useEffect triggered - contexto ready, workshopId:', workshopId)
      // Limpiar datos anteriores antes de cargar nuevos
      setEmployees([])
      setMechanics([])
      setEmployeesWithStats([])
      refreshEmployees()
    } else if (autoLoad && !ready) {
      console.log('⏳ [useEmployees] Esperando a que contexto esté ready...', { ready, workshopId: !!workshopId })
      // Limpiar datos si contexto cambia
      setEmployees([])
      setMechanics([])
      setEmployeesWithStats([])
    }
  }, [autoLoad, ready, workshopId, refreshEmployees])

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

// ✅ Hook simplificado solo para mecánicos
// Ahora obtiene workshopId del contexto automáticamente si no se pasa
export function useMechanics(workshopId?: string) {
  const { mechanics, loading, error, loadMechanics, refreshEmployees } = useEmployees({
    workshopId, // Opcional: si no se pasa, usa el del contexto
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

// ✅ Hook para estadísticas de empleados
// Usa el contexto automáticamente
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

