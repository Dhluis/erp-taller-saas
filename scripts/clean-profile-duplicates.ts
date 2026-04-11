import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function cleanDuplicates() {
  console.log('🔍 Iniciando limpieza de perfiles duplicados...')
  
  // 1. Obtener todos los auth_user_id que tienen más de un perfil
  const { data: duplicates, error: dupError } = await supabase
    .rpc('get_duplicate_user_profiles') // Si no existe el RPC, lo haremos programáticamente

  if (dupError) {
    console.log('ℹ️ RPC no encontrado, procediendo programáticamente...')
    
    // Fallback: Obtener todos los usuarios con su conteo
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('auth_user_id')
      .not('auth_user_id', 'is', null)

    if (allUsersError) throw allUsersError

    const counts: Record<string, number> = {}
    allUsers.forEach((u: any) => {
      counts[u.auth_user_id] = (counts[u.auth_user_id] || 0) + 1
    })

    const duplicadosIds = Object.keys(counts).filter(id => counts[id] > 1)
    console.log(`📊 Encontrados ${duplicadosIds.length} IDs de usuario con duplicados.`)

    for (const authId of duplicadosIds) {
      console.log(`\n🛠️ Limpiando duplicados para: ${authId} (Conteo: ${counts[authId]})`)
      
      // Obtener todos los perfiles de ese usuario ordenados por fecha
      const { data: profiles, error: profError } = await supabase
        .from('users')
        .select('id, created_at, full_name, email')
        .eq('auth_user_id', authId)
        .order('created_at', { ascending: false })

      if (profError || !profiles) {
        console.error(`❌ Error obteniendo perfiles para ${authId}`)
        continue
      }

      // El primero (más reciente) se queda
      const [toKeep, ...toDelete] = profiles
      console.log(`✅ Quedando: ${toKeep.full_name} (${toKeep.email}) - ID: ${toKeep.id} - Creado: ${toKeep.created_at}`)
      
      const idsToDelete = toDelete.map(p => p.id)
      console.log(`🗑️ Eliminando ${idsToDelete.length} duplicados obsoletos...`)

      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .in('id', idsToDelete)

      if (deleteError) {
        console.error(`❌ Error al eliminar duplicados de ${authId}:`, deleteError.message)
      } else {
        console.log(`✨ Duplicados eliminados exitosamente.`)
      }
    }
  }

  console.log('\n🎉 Proceso de limpieza finalizado.')
}

cleanDuplicates().catch(console.error)
