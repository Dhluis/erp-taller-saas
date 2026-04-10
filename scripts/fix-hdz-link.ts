import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Cargar variables (intentar varios lugares)
dotenv.config({ path: resolve(process.cwd(), '.env.vercel') })
dotenv.config({ path: resolve(process.cwd(), '.env.local') })
dotenv.config({ path: resolve(process.cwd(), '.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan llaves de Supabase (URL o Service Role Key)')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TARGET_EMAIL = 'hdzalfonsodigital@gmail.com'
const TARGET_AUTH_ID = 'f5a58de2-56a1-488c-844c-fa031f3c6b56'

async function repairLink() {
  console.log(`\n🔍 Iniciando reparación para: ${TARGET_EMAIL}`)
  console.log(`📌 Nuevo Auth ID: ${TARGET_AUTH_ID}`)

  try {
    // 1. Verificar estado actual
    console.log('\n--- Estado Actual ---')
    const { data: userBefore, error: errorBefore } = await supabase
      .from('system_users')
      .select('id, email, auth_user_id, organization_id')
      .ilike('email', TARGET_EMAIL)
      .maybeSingle()

    if (errorBefore) throw errorBefore
    if (!userBefore) {
      console.error('❌ Error: Usuario no encontrado en system_users')
      return
    }

    console.log('ID:', userBefore.id)
    console.log('Email:', userBefore.email)
    console.log('Auth ID Actual:', userBefore.auth_user_id || '(vacío)')
    console.log('Org ID:', userBefore.organization_id)

    // 2. Realizar vinculación
    console.log('\n--- Aplicando Vinculación ---')
    const { data: updated, error: updateError } = await supabase
      .from('system_users')
      .update({ 
        auth_user_id: TARGET_AUTH_ID,
        updated_at: new Date().toISOString()
      })
      .eq('id', userBefore.id)
      .select()

    if (updateError) throw updateError
    
    console.log('✅ Vinculación completada con éxito')

    // 3. Verificar en tabla 'users' (si existe ahí)
    console.log('\n--- Verificando en tabla users ---')
    const { data: profile } = await supabase
        .from('users')
        .select('id, auth_user_id')
        .eq('auth_user_id', TARGET_AUTH_ID)
        .maybeSingle()
    
    if (profile) {
        console.log('✅ El perfil también existe en la tabla users principal.')
    } else {
        console.log('ℹ️ El perfil no existe en users (se creará automáticamente al entrar).')
    }

  } catch (error: any) {
    console.error(`\n💥 Error crítico: ${error.message}`)
  }
}

repairLink()
