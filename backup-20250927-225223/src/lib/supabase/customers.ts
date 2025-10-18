import { createClient } from '@/lib/supabase/client'

export interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  created_at: string
  updated_at: string
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching customers:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching customers:', error)
    return []
  }
}

export async function createCustomer(customerData: Partial<Customer>): Promise<Customer | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()
      .single()

    if (error) {
      console.error('Error creating customer:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating customer:', error)
    return null
  }
}

export async function updateCustomer(id: string, customerData: Partial<Customer>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('customers')
      .update({
        ...customerData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating customer:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating customer:', error)
    return false
  }
}

export async function deleteCustomer(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting customer:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting customer:', error)
    return false
  }
}
