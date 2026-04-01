const { createClient } = require('@supabase/supabase-js')

const supabase = createClient('http://localhost:8000', 'dummy')
let q = supabase.from('customers').select('*')
q = q.or('name.ilike.%foo%,email.ilike.%foo%')
q = q.or('name.ilike.%bar%,email.ilike.%bar%')

console.log(q.url.toString())
