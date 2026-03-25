import { getSupabaseServiceClient } from './src/lib/supabase/server.ts'

async function diagnose() {
  const supabase = getSupabaseServiceClient()
  const orgId = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4' // From user logs
  
  console.log('--- DIAGNOSTIC START ---')
  console.log('Target Organization:', orgId)
  
  // 1. Check workshops
  const { data: workshops, error: wError } = await supabase
    .from('workshops')
    .select('*')
    .eq('organization_id', orgId)
    
  if (wError) {
    console.error('Error fetching workshops:', wError.message)
  } else {
    console.log('Workshops found:', workshops.length)
    console.table(workshops.map(w => ({ id: w.id, name: w.name })))
  }
  
  // 2. Check users in that org
  const { data: users, error: uError } = await supabase
    .from('users')
    .select('id, auth_user_id, email, full_name, organization_id, workshop_id')
    .eq('organization_id', orgId)
    
  if (uError) {
    console.error('Error fetching users:', uError.message)
  } else {
    console.log('Users in org:', users.length)
    console.table(users.map(u => ({ id: u.id, email: u.email, workshop_id: u.workshop_id })))
  }
  
  console.log('--- DIAGNOSTIC END ---')
}

diagnose().catch(console.error)
