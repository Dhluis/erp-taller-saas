import { createClient } from '@/lib/supabase/client'

export interface InventoryCategory {
  id: string
  name: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface CreateInventoryCategoryData {
  name: string
  description?: string
  parent_id?: string
  status: 'active' | 'inactive'
}

export interface CategoryStats {
  totalCategories: number
  activeCategories: number
  inactiveCategories: number
  topLevelCategories: number
}

export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching inventory categories:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return []
    }

    if (!data || data.length === 0) {
      console.log('No inventory categories found in database')
      return []
    }

    return data.map(category => ({
      id: category.id,
      name: category.name || 'Categoría sin nombre',
      description: category.description || undefined,
      parent_id: category.parent_id || undefined,
      status: category.status || 'active',
      created_at: category.created_at || new Date().toISOString(),
      updated_at: category.updated_at || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Unexpected error fetching inventory categories:', error)
    return []
  }
}

export async function createInventoryCategory(categoryData: CreateInventoryCategoryData): Promise<InventoryCategory | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('inventory_categories')
      .insert([{
        organization_id: '00000000-0000-0000-0000-000000000000',
        name: categoryData.name,
        description: categoryData.description,
        parent_id: categoryData.parent_id && categoryData.parent_id.trim() !== '' ? categoryData.parent_id : null,
        status: categoryData.status
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating inventory category:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating inventory category:', error)
    return null
  }
}

export async function updateInventoryCategory(id: string, categoryData: Partial<CreateInventoryCategoryData>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (categoryData.name) updateData.name = categoryData.name
    if (categoryData.description !== undefined) updateData.description = categoryData.description
    if (categoryData.parent_id !== undefined) {
      updateData.parent_id = categoryData.parent_id && categoryData.parent_id.trim() !== '' ? categoryData.parent_id : null
    }
    if (categoryData.status) updateData.status = categoryData.status

    const { error } = await supabase
      .from('inventory_categories')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating inventory category:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating inventory category:', error)
    return false
  }
}

export async function deleteInventoryCategory(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('inventory_categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting inventory category:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting inventory category:', error)
    return false
  }
}

export async function getCategoryStats(): Promise<CategoryStats> {
  const supabase = createClient()
  
  try {
    const { data: categories, error } = await supabase
      .from('inventory_categories')
      .select('status, parent_id')

    if (error) {
      console.error('Error fetching category stats:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return {
        totalCategories: 0,
        activeCategories: 0,
        inactiveCategories: 0,
        topLevelCategories: 0
      }
    }

    if (!categories || categories.length === 0) {
      console.log('No categories found for stats calculation')
      return {
        totalCategories: 0,
        activeCategories: 0,
        inactiveCategories: 0,
        topLevelCategories: 0
      }
    }

    const totalCategories = categories.length
    const activeCategories = categories.filter(c => c.status === 'active').length
    const inactiveCategories = categories.filter(c => c.status === 'inactive').length
    const topLevelCategories = categories.filter(c => !c.parent_id).length

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
      topLevelCategories
    }
  } catch (error) {
    console.error('Unexpected error fetching category stats:', error)
    return {
      totalCategories: 0,
      activeCategories: 0,
      inactiveCategories: 0,
      topLevelCategories: 0
    }
  }
}