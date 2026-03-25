
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function runMigration() {
  const sql = fs.readFileSync('scripts/add_signature_columns.sql', 'utf8')
  console.log('Running migration...')
  
  const { error } = await supabase.rpc('exec_sql', { query: sql })

  if (error) {
    console.error('❌ Migration failed:', error.message)
    console.log('You might need to run the SQL manually in Supabase Dashboard.')
  } else {
    console.log('✅ Migration successful! Columns added.')
  }
}

runMigration()
