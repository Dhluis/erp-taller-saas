
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkColumns() {
  console.log('Checking columns in work_orders table...')
  const { error: woError } = await supabase
    .from('work_orders')
    .select('id, customer_signature, terms_type, terms_text, terms_accepted, terms_file_url')
    .limit(1)

  if (woError && (woError.message.includes('column') || woError.message.includes('does not exist'))) {
    console.log('❌ One or more columns DO NOT EXIST in work_orders:', woError.message)
  } else if (!woError) {
    console.log('✅ All columns EXIST in work_orders table!')
  }

  console.log('\nChecking columns in vehicle_inspections table...')
  const { error: viError } = await supabase
    .from('vehicle_inspections')
    .select('id, customer_signature, terms_type, terms_text, terms_accepted, terms_file_url')
    .limit(1)

  if (viError && (viError.message.includes('column') || viError.message.includes('does not exist'))) {
    console.log('❌ One or more columns DO NOT EXIST in vehicle_inspections:', viError.message)
  } else if (!viError) {
    console.log('✅ All columns EXIST in vehicle_inspections table!')
  }
}

checkColumns()
