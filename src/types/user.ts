import { UserRole } from '@/lib/auth/permissions'

export interface CreateUserRequest {
  email: string
  password: string
  name: string
  role: UserRole
  phone?: string
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  phone?: string
  is_active: boolean
  organization_id: string
  organization_name?: string
  created_at: string
  updated_at: string
}

