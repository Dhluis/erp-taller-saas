import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
if (!supaUrl || !supaKey) {
  console.log("Missing config")
  process.exit(1)
}

const supabaseAdmin = createClient(supaUrl, supaKey)

async function run() {
  const orgId = "b3962fe4-d238-42bc-9455-4ed84a38c6b4"
  console.log("Querying payments...")
  const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, supplier_id, amount, payment_date, payment_method, reference, notes, status, created_at')
      .eq('organization_id', orgId)
      .not('supplier_id', 'is', null)
      .order('payment_date', { ascending: false })
      .limit(50)
  
  if (error) {
    console.error("SUPABASE ERROR:", error)
  } else {
    console.log("SUCCESS. Rows found:", data?.length)
  }
}
run()
