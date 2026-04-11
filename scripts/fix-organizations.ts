import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixOrgs() {
  console.log('🔍 Buscando organizaciones sin taller o con trial obsoleto...')
  
  // 1. Obtener todas las organizaciones
  const { data: orgs, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, email, phone, address')

  if (orgsError) throw orgsError

  for (const org of orgs) {
    // A. Verificar si tiene workshop
    const { data: workshops, error: wsError } = await supabase
      .from('workshops')
      .select('id')
      .eq('organization_id', org.id)

    if (wsError) {
      console.error(`Error buscando taller para ${org.name}:`, wsError.message)
      continue
    }

    if (workshops.length === 0) {
      console.log(`🛠️ Creando taller principal para: ${org.name}`)
      const { data: newWs, error: createError } = await supabase
        .from('workshops')
        .insert({
          organization_id: org.id,
          name: 'Taller Principal',
          email: org.email,
          phone: org.phone || '',
          address: org.address || 'Dirección no especificada'
        })
        .select()
        .single()

      if (createError) {
        console.error(`❌ Falló creación de taller para ${org.name}:`, createError.message)
      } else {
        console.log(`✅ Taller creado con ID: ${newWs.id}`)
        
        // B. Vincular usuarios de la organización al nuevo taller
        const { error: updateUserError } = await supabase
          .from('users')
          .update({ workshop_id: newWs.id })
          .eq('organization_id', org.id)
          .is('workshop_id', null)

        if (updateUserError) console.warn(`⚠️ Error vinculando usuarios en 'users':`, updateUserError.message)

        const { error: updateSystemUserError } = await supabase
          .from('system_users')
          .update({ workshop_id: newWs.id })
          .eq('organization_id', org.id)
          .is('workshop_id', null)

        if (updateSystemUserError) console.warn(`⚠️ Error vinculando usuarios en 'system_users':`, updateSystemUserError.message)
      }
    }

    // C. Limpiar trial obsoleto (si tiene trial_ends_at pero el usuario quiere Free permanente)
    // Nota: Solo lo hacemos si el plan_tier es 'free'
    const { error: cleanOrgError } = await supabase
      .from('organizations')
      .update({ 
        subscription_status: 'active',
        trial_ends_at: null 
      })
      .eq('id', org.id)
      .eq('plan_tier', 'free')
      .not('trial_ends_at', 'is', null)

    if (cleanOrgError) console.error(`❌ Error limpiando trial para ${org.name}:`, cleanOrgError.message)
  }

  console.log('🎉 Proceso de reparación finalizado.')
}

fixOrgs().catch(console.error)
