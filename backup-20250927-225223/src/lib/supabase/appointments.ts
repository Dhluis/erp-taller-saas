import { createClient } from './client'

const supabase = createClient()

export interface Appointment {
  id: string
  organization_id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  vehicle_info: string
  service_type: string
  appointment_date: string
  appointment_time: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  estimated_duration: number
  created_at: string
  updated_at: string
}

export type CreateAppointmentData = Omit<Appointment, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
export type UpdateAppointmentData = Partial<CreateAppointmentData>

export async function getAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('appointment_date', { ascending: true })

  if (error) {
    console.error('Error fetching appointments:', error)
    return []
  }
  return data as Appointment[]
}

export async function getAppointment(id: string): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching appointment:', error)
    return null
  }
  return data as Appointment
}

export async function createAppointment(appointmentData: CreateAppointmentData): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .insert([appointmentData])
    .select()
    .single()

  if (error) {
    console.error('Error creating appointment:', error)
    return null
  }
  return data as Appointment
}

export async function updateAppointment(id: string, appointmentData: UpdateAppointmentData): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .update(appointmentData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating appointment:', error)
    return null
  }
  return data as Appointment
}

export async function deleteAppointment(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('appointments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting appointment:', error)
    return false
  }
  return true
}

export async function getAppointmentStats() {
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')

  if (error) {
    console.error('Error fetching appointment stats:', error)
    return {
      total: 0,
      today: 0,
      upcoming: 0,
      completed: 0,
      pending: 0
    }
  }

  const todayAppointments = appointments?.filter(apt => apt.appointment_date === today) || []
  const upcomingAppointments = appointments?.filter(apt => apt.appointment_date > today && apt.status !== 'completed') || []
  const completedAppointments = appointments?.filter(apt => apt.status === 'completed') || []
  const pendingAppointments = appointments?.filter(apt => apt.status === 'scheduled') || []

  return {
    total: appointments?.length || 0,
    today: todayAppointments.length,
    upcoming: upcomingAppointments.length,
    completed: completedAppointments.length,
    pending: pendingAppointments.length
  }
}

export async function searchAppointments(query: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .or(`customer_name.ilike.%${query}%,vehicle_info.ilike.%${query}%,service_type.ilike.%${query}%`)
    .order('appointment_date', { ascending: true })

  if (error) {
    console.error('Error searching appointments:', error)
    return []
  }
  return data as Appointment[]
}

export function subscribeToAppointments(callback: (payload: any) => void) {
  const subscription = supabase
    .channel('appointments_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'appointments' },
      callback
    )
    .subscribe()

  return subscription
}
