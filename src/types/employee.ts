export interface CreateEmployeeRequest {
  name: string
  email?: string
  phone?: string
  role?: 'mechanic' | 'receptionist' | 'supervisor'
  specialties?: string[]
  hourly_rate?: number
  hire_date?: string
}

export interface Employee {
  id: string
  organization_id: string
  user_id?: string // Opcional, solo si tiene cuenta de usuario
  name: string
  email?: string
  phone?: string
  role: string
  specialties?: string[]
  hourly_rate?: number
  hire_date?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

