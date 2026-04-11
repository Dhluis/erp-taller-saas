import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const USER_ID = 'c5102f74-81e2-4e0a-a360-8daad7206888'

async function diagnose() {
  console.log('🔍 Diagnosticando usuario:', USER_ID)
  
  // 1. Probar lookup simple
  console.log('\n--- Intento 1: eq(auth_user_id) ---')
  const { data: d1, error: e1 } = await supabase
    .from('users')
    .select('id, organization_id, auth_user_id')
    .eq('auth_user_id', USER_ID)
    .maybeSingle()
  console.log('Resultado:', d1)
  if (e1) console.error('Error:', e1)

  // 2. Probar lookup por ID
  console.log('\n--- Intento 2: eq(id) ---')
  const { data: d2, error: e2 } = await supabase
    .from('users')
    .select('id, organization_id, auth_user_id')
    .eq('id', USER_ID)
    .maybeSingle()
  console.log('Resultado:', d2)
  if (e2) console.error('Error:', e2)

  // 3. Probar lookup .or (el que falla)
  console.log('\n--- Intento 3: .or(...) ---')
  try {
    const { data: d3, error: e3 } = await supabase
      .from('users')
      .select('id, organization_id, auth_user_id')
      .or(`auth_user_id.eq.${USER_ID},id.eq.${USER_ID}`)
      .maybeSingle()
    console.log('Resultado:', d3)
    if (e3) console.error('Error:', e3)
  } catch (err) {
    console.error('Excepción en .or:', err)
  }

  // 4. Revisar system_users
  console.log('\n--- Intento 4: system_users ---')
  const { data: d4, error: e4 } = await supabase
    .from('system_users')
    .select('id, organization_id, auth_user_id, email')
    .eq('auth_user_id', USER_ID)
    .maybeSingle()
  console.log('Resultado:', d4)
  if (e4) console.error('Error:', e4)
}

diagnose().catch(console.error)
