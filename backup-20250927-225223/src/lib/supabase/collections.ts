import { createClient } from '@/lib/supabase/client'

export interface Collection {
  id: string
  client_id: string
  invoice_id: string
  amount: number
  collection_date: string
  payment_method: 'cash' | 'transfer' | 'card' | 'check'
  reference?: string
  status: 'pending' | 'completed' | 'overdue'
  notes?: string
  created_at: string
  updated_at: string
}

export interface CreateCollectionData {
  client_id: string
  invoice_id: string
  amount: number
  collection_date: string
  payment_method: 'cash' | 'transfer' | 'card' | 'check'
  reference?: string
  status: 'pending' | 'completed' | 'overdue'
  notes?: string
}

export interface CollectionStats {
  total_collections: number
  completed_collections: number
  pending_collections: number
  overdue_collections: number
  total_amount_collected: number
  total_amount_pending: number
}

export async function getCollections(): Promise<Collection[]> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('collection_date', { ascending: false })

    if (error) {
      console.error('Error fetching collections:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return []
    }

    if (!data || data.length === 0) {
      console.log('No collections found in database')
      return []
    }

    return data.map(collection => ({
      id: collection.id,
      client_id: collection.client_id || '',
      invoice_id: collection.invoice_id || '',
      amount: Number(collection.amount) || 0,
      collection_date: collection.collection_date || new Date().toISOString(),
      payment_method: collection.payment_method || 'transfer',
      reference: collection.reference || undefined,
      status: collection.status || 'pending',
      notes: collection.notes || undefined,
      created_at: collection.created_at || new Date().toISOString(),
      updated_at: collection.updated_at || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Unexpected error fetching collections:', error)
    return []
  }
}

export async function createCollection(collectionData: CreateCollectionData): Promise<Collection | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from('collections')
      .insert([{
        client_id: collectionData.client_id,
        invoice_id: collectionData.invoice_id,
        amount: collectionData.amount,
        collection_date: collectionData.collection_date,
        payment_method: collectionData.payment_method,
        reference: collectionData.reference,
        status: collectionData.status,
        notes: collectionData.notes
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating collection:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating collection:', error)
    return null
  }
}

export async function updateCollection(id: string, collectionData: Partial<CreateCollectionData>): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (collectionData.client_id) updateData.client_id = collectionData.client_id
    if (collectionData.invoice_id) updateData.invoice_id = collectionData.invoice_id
    if (collectionData.amount !== undefined) updateData.amount = collectionData.amount
    if (collectionData.collection_date) updateData.collection_date = collectionData.collection_date
    if (collectionData.payment_method) updateData.payment_method = collectionData.payment_method
    if (collectionData.reference !== undefined) updateData.reference = collectionData.reference
    if (collectionData.status) updateData.status = collectionData.status
    if (collectionData.notes !== undefined) updateData.notes = collectionData.notes

    const { error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating collection:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating collection:', error)
    return false
  }
}

export async function deleteCollection(id: string): Promise<boolean> {
  const supabase = createClient()
  
  try {
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting collection:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error deleting collection:', error)
    return false
  }
}

export async function getCollectionStats(): Promise<CollectionStats> {
  const supabase = createClient()
  
  try {
    const { data: collections, error } = await supabase
      .from('collections')
      .select('status, amount')

    if (error) {
      console.error('Error fetching collection stats:', error)
      console.error('Error details:', {
        message: error?.message || 'Unknown error',
        details: error?.details || 'No details available',
        hint: error?.hint || 'No hint available',
        code: error?.code || 'No code available'
      })
      return {
        total_collections: 0,
        completed_collections: 0,
        pending_collections: 0,
        overdue_collections: 0,
        total_amount_collected: 0,
        total_amount_pending: 0
      }
    }

    if (!collections || collections.length === 0) {
      console.log('No collections found for stats calculation')
      return {
        total_collections: 0,
        completed_collections: 0,
        pending_collections: 0,
        overdue_collections: 0,
        total_amount_collected: 0,
        total_amount_pending: 0
      }
    }

    const total_collections = collections.length
    const completed_collections = collections.filter(c => c.status === 'completed').length
    const pending_collections = collections.filter(c => c.status === 'pending').length
    const overdue_collections = collections.filter(c => c.status === 'overdue').length
    const total_amount_collected = collections
      .filter(c => c.status === 'completed')
      .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0)
    const total_amount_pending = collections
      .filter(c => c.status === 'pending')
      .reduce((sum, collection) => sum + (Number(collection.amount) || 0), 0)

    return {
      total_collections,
      completed_collections,
      pending_collections,
      overdue_collections,
      total_amount_collected,
      total_amount_pending
    }
  } catch (error) {
    console.error('Unexpected error fetching collection stats:', error)
    return {
      total_collections: 0,
      completed_collections: 0,
      pending_collections: 0,
      overdue_collections: 0,
      total_amount_collected: 0,
      total_amount_pending: 0
    }
  }
}