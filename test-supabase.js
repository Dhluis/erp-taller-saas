import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function test() {
  const org = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
  const supplierId = '0a359db2-182e-45c8-9ed8-0135fab52307'

  const { data, error } = await supabase.from('payments').insert({
    organization_id: org,
    supplier_id: supplierId,
    amount: 1000.00,
    payment_date: "2026-03-21",
    payment_method: "transfer",
    reference: "test-ref",
    invoice_number: "S/N",
    status: "completed"
  }).select()

  console.log("Error:", error)
  console.log("Data:", data)
}
test()
