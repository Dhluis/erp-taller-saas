import { createClient } from '@/lib/supabase/client'

export interface Supplier {
  id: string
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface SupplierStats {
  totalSuppliers: number
  activeSuppliers: number
  totalOrders: number
  totalAmount: number
}

export async function getSuppliers(): Promise<Supplier[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching suppliers:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return []
  }
}

export async function createSupplier(supplierData: Partial<Supplier>): Promise<Supplier | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([{
        name: supplierData.name,
        contact_person: supplierData.contact_person,
        phone: supplierData.phone,
        email: supplierData.email,
        address: supplierData.address,
        status: 'active'
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating supplier:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating supplier:', error)
    return null
  }
}

export async function updateSupplier(id: string, supplierData: Partial<Supplier>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('suppliers')
      .update({
        ...supplierData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating supplier:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating supplier:', error)
    return false
  }
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting supplier:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting supplier:', error)
    return false
  }
}

export async function getSupplierStats(): Promise<SupplierStats> {
  const supabase = createClient()
  
  try {
    // Get suppliers count
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('id, status')

    if (suppliersError) {
      console.error('Error fetching supplier stats:', suppliersError)
      return {
        totalSuppliers: 0,
        activeSuppliers: 0,
        totalOrders: 0,
        totalAmount: 0
      }
    }

    // Get purchase orders stats
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('total')

    const totalSuppliers = suppliers?.length || 0
    const activeSuppliers = suppliers?.filter(s => s.status === 'active').length || 0
    const totalOrders = orders?.length || 0
    const totalAmount = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0

    return {
      totalSuppliers,
      activeSuppliers,
      totalOrders,
      totalAmount
    }
  } catch (error) {
    console.error('Error fetching supplier stats:', error)
    return {
      totalSuppliers: 0,
      activeSuppliers: 0,
      totalOrders: 0,
      totalAmount: 0
    }
  }
}