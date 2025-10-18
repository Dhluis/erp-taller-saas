import { createClient } from '@/lib/supabase/client'

export interface SystemUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'employee' | 'viewer'
  status: 'active' | 'inactive'
  last_login?: string
  created_at: string
  updated_at: string
}

export interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  usersByRole: {
    admin: number
    manager: number
    employee: number
    viewer: number
  }
}

export async function getSystemUsers(): Promise<SystemUser[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('system_users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching system users:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching system users:', error)
    return []
  }
}

export async function createSystemUser(userData: Partial<SystemUser>): Promise<SystemUser | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('system_users')
      .insert([{
        name: userData.name,
        email: userData.email,
        role: userData.role || 'employee',
        status: 'active'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating system user:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating system user:', error)
    return null
  }
}

export async function updateSystemUser(id: string, userData: Partial<SystemUser>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('system_users')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating system user:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating system user:', error)
    return false
  }
}

export async function deleteSystemUser(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('system_users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting system user:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting system user:', error)
    return false
  }
}

export async function getUserStats(): Promise<UserStats> {
  const supabase = createClient()
  
  try {
    const { data: users, error } = await supabase
      .from('system_users')
      .select('status, role')

    if (error) {
      console.error('Error fetching user stats:', error)
      return {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        usersByRole: {
          admin: 0,
          manager: 0,
          employee: 0,
          viewer: 0
        }
      }
    }

    const totalUsers = users?.length || 0
    const activeUsers = users?.filter(u => u.status === 'active').length || 0
    const inactiveUsers = users?.filter(u => u.status === 'inactive').length || 0

    const usersByRole = users?.reduce((acc, user) => {
      acc[user.role as keyof typeof acc]++
      return acc
    }, {
      admin: 0,
      manager: 0,
      employee: 0,
      viewer: 0
    }) || {
      admin: 0,
      manager: 0,
      employee: 0,
      viewer: 0
    }

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      usersByRole
    }
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      usersByRole: {
        admin: 0,
        manager: 0,
        employee: 0,
        viewer: 0
      }
    }
  }
}