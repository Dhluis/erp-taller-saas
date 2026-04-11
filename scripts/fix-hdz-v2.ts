import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Cargar variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan llaves de Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TARGET_EMAIL = 'hdzalfonsodigital@gmail.com'
const TARGET_AUTH_ID = 'f5a58de2-56a1-488c-844c-fa031f3c6b56'

async function repairLinkV2() {
  console.log(`\n🔍 Iniciando reparación V2 para: ${TARGET_EMAIL}`)
  
  try {
    // 1. Obtener datos de system_users
    const { data: systemUser, error: sysError } = await supabase
      .from('system_users')
      .select('*')
      .ilike('email', TARGET_EMAIL)
      .maybeSingle()
    
    if (sysError) throw sysError
    if (!systemUser) {
      console.error('❌ Usuario no encontrado en system_users')
      return
    }

    console.log(`✅ Datos encontrados en system_users: ${systemUser.first_name} ${systemUser.last_name}`)
    console.log(`🏢 Organización ID: ${systemUser.organization_id}`)

    // 2. Insertar o Actualizar en la tabla 'users'
    console.log('\n🚀 Creando/Vinculando perfil en tabla users...')
    const { data: finalProfile, error: profileError } = await supabase
      .from('users')
      .upsert({
        auth_user_id: TARGET_AUTH_ID,
        email: systemUser.email,
        full_name: `${systemUser.first_name || ''} ${systemUser.last_name || ''}`.trim(),
        role: systemUser.role || 'ADMIN',
        organization_id: systemUser.organization_id,
        workshop_id: systemUser.workshop_id || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'auth_user_id' })
      .select()
      .single()

    if (profileError) throw profileError

    console.log('✅✅✅ Perfil vinculado con éxito en la tabla users!')
    console.log(`👤 ID de perfil: ${finalProfile.id}`)
    console.log(`📌 Auth User ID: ${finalProfile.auth_user_id}`)

  } catch (error: any) {
    console.error(`\n💥 Error crítico: ${error.message}`)
  }
}

repairLinkV2()
