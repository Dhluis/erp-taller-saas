import { getSupabaseServiceClient } from './src/lib/supabase/server'

async function debug() {
  const id = 'cc579d59-f857-4c1f-8f9d-a7977eedcf7c'
  const supabase = getSupabaseServiceClient()
  
  console.log('🔍 Debugging Order ID:', id)
  
  const { data, error } = await supabase
    .from('work_orders')
    .select('id, order_number, status, deleted_at')
    .eq('id', id)
    .single()
    
  if (error) {
    console.error('❌ Error fetching order:', error)
  } else {
    console.log('✅ Order found:', data)
  }
  
  const { data: allOrders, error: allOrdersError } = await supabase
    .from('work_orders')
    .select('id, order_number')
    .limit(5)
    
  if (allOrdersError) {
    console.error('❌ Error fetching all orders:', allOrdersError)
  } else {
    console.log('📋 Sample Orders:', allOrders)
  }
}

debug()
