/**
 * Servicio de Citas
 * Funciones para manejar citas del sistema
 */

import { getSupabaseClient } from '../supabase'
import { executeWithErrorHandling } from '../core/errors'
import { Appointment, AppointmentInsert, AppointmentUpdate } from '@/types/supabase-simple'

// Re-exportar tipo generado: Appointment

export interface AppointmentStats {
  total: number
  scheduled: number
  confirmed: number
  in_progress: number
  completed: number
  cancelled: number
  no_show: number
  today: number
  thisWeek: number
  thisMonth: number
}

export interface CreateAppointment {
  customer_id: string
  vehicle_id?: string
  service_type: string
  appointment_date: string
  duration?: number
  status?: string
  notes?: string
  organization_id: string
}

export interface UpdateAppointment {
  service_type?: string
  appointment_date?: string
  duration?: number
  status?: string
  notes?: string
  actual_duration?: number
  updated_by?: string
}

/**
 * Obtener citas
 */
export async function getAppointments(filters?: {
  status?: string
  customer_id?: string
  vehicle_id?: string
  service_type?: string
  date_from?: string
  date_to?: string
}): Promise<Appointment[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      let query = client.from('appointments').select('*')
      
      if (filters) {
        if (filters.status) {
          query = query.eq('status', filters.status)
        }
        if (filters.customer_id) {
          query = query.eq('customer_id', filters.customer_id)
        }
        if (filters.vehicle_id) {
          query = query.eq('vehicle_id', filters.vehicle_id)
        }
        if (filters.service_type) {
          query = query.eq('service_type', filters.service_type)
        }
        if (filters.date_from) {
          query = query.gte('appointment_date', filters.date_from)
        }
        if (filters.date_to) {
          query = query.lte('appointment_date', filters.date_to)
        }
      }
      
      const { data, error } = await query
        .order('appointment_date', { ascending: true })
        .order('appointment_date', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to fetch appointments: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'getAppointments',
      table: 'appointments'
    }
  )
}

/**
 * Obtener estadísticas de citas
 */
export async function getAppointmentStats(): Promise<AppointmentStats> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('appointments')
        .select('status, appointment_date')
      
      if (error) {
        throw new Error(`Failed to fetch appointment stats: ${error.message}`)
      }
      
      const total = data?.length || 0
      const scheduled = data?.filter(a => a.status === 'scheduled').length || 0
      const confirmed = data?.filter(a => a.status === 'confirmed').length || 0
      const in_progress = data?.filter(a => a.status === 'in_progress').length || 0
      const completed = data?.filter(a => a.status === 'completed').length || 0
      const cancelled = data?.filter(a => a.status === 'cancelled').length || 0
      const no_show = data?.filter(a => a.status === 'no_show').length || 0
      
      const today = new Date().toISOString().split('T')[0]
      const todayCount = data?.filter(a => a.appointment_date === today).length || 0
      
      const thisWeek = data?.filter(a => {
        const appointmentDate = new Date(a.appointment_date)
        const now = new Date()
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))
        return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek
      }).length || 0
      
      const thisMonth = data?.filter(a => {
        const appointmentDate = new Date(a.appointment_date)
        const now = new Date()
        return appointmentDate.getMonth() === now.getMonth() && appointmentDate.getFullYear() === now.getFullYear()
      }).length || 0
      
      return {
        total,
        scheduled,
        confirmed,
        in_progress,
        completed,
        cancelled,
        no_show,
        today: todayCount,
        thisWeek,
        thisMonth
      }
    },
    {
      operation: 'getAppointmentStats',
      table: 'appointments'
    }
  )
}

/**
 * Crear cita
 */
export async function createAppointment(appointment: CreateAppointment): Promise<Appointment> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      // ✅ Crear cita sin appointment_number (esa columna no existe en la tabla)
      const insertData: any = {
        customer_id: appointment.customer_id,
        service_type: appointment.service_type,
        appointment_date: appointment.appointment_date,
        duration: appointment.duration || 60,
        organization_id: appointment.organization_id,
        status: appointment.status || 'scheduled',
        notes: appointment.notes
      }
      
      // Solo agregar vehicle_id si existe
      if (appointment.vehicle_id) {
        insertData.vehicle_id = appointment.vehicle_id
      }
      
      const { data, error } = await client
        .from('appointments')
        .insert(insertData)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to create appointment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'createAppointment',
      table: 'appointments'
    }
  )
}

/**
 * Actualizar cita
 */
export async function updateAppointment(id: string, appointment: UpdateAppointment): Promise<Appointment> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('appointments')
        .update(appointment)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to update appointment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'updateAppointment',
      table: 'appointments'
    }
  )
}

/**
 * Obtener cita por ID
 */
export async function getAppointmentById(id: string): Promise<Appointment | null> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // No encontrado
        }
        throw new Error(`Failed to fetch appointment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'getAppointmentById',
      table: 'appointments'
    }
  )
}

/**
 * Confirmar cita
 */
export async function confirmAppointment(id: string): Promise<Appointment> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('appointments')
        .update({
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to confirm appointment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'confirmAppointment',
      table: 'appointments'
    }
  )
}

/**
 * Marcar cita como completada
 */
export async function completeAppointment(id: string, actualDuration?: number): Promise<Appointment> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('appointments')
        .update({
          status: 'completed',
          actual_duration: actualDuration,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to complete appointment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'completeAppointment',
      table: 'appointments'
    }
  )
}

/**
 * Cancelar cita
 */
export async function cancelAppointment(id: string, reason?: string): Promise<Appointment> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('appointments')
        .update({
          status: 'cancelled',
          notes: reason ? `${reason}` : undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        throw new Error(`Failed to cancel appointment: ${error.message}`)
      }
      
      return data
    },
    {
      operation: 'cancelAppointment',
      table: 'appointments'
    }
  )
}

/**
 * Buscar citas
 */
export async function searchAppointments(searchTerm: string): Promise<Appointment[]> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { data, error } = await client
        .from('appointments')
        .select('*')
        .or(`appointment_number.ilike.%${searchTerm}%,service_type.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
        .order('appointment_date', { ascending: true })
        .order('appointment_date', { ascending: true })
      
      if (error) {
        throw new Error(`Failed to search appointments: ${error.message}`)
      }
      
      return data || []
    },
    {
      operation: 'searchAppointments',
      table: 'appointments'
    }
  )
}

/**
 * Eliminar cita
 */
export async function deleteAppointment(id: string): Promise<void> {
  return executeWithErrorHandling(
    async () => {
      const client = getSupabaseClient()
      
      const { error } = await client
        .from('appointments')
        .delete()
        .eq('id', id)
      
      if (error) {
        throw new Error(`Failed to delete appointment: ${error.message}`)
      }
    },
    {
      operation: 'deleteAppointment',
      table: 'appointments'
    }
  )
}

/**
 * Suscribirse a cambios en tiempo real de citas
 */
export function subscribeToAppointments(callback: (payload: any) => void) {
  const client = getSupabaseClient()

  const subscription = client
    .channel('appointments')
    .on('postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments'
      },
      callback
    )
    .subscribe()

  return subscription
}
