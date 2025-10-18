import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Necesitamos la service key

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const usersToCreate = [
  {
    email: 'test@ejemplo.com',
    password: 'Test123456!', // Contraseña temporal
    user_metadata: {
      first_name: 'Luis',
      last_name: 'Diaz'
    }
  },
  {
    email: 'exclusicoparaclientes@gmail.com',
    password: 'Test123456!', // Contraseña temporal
    user_metadata: {
      first_name: 'Luis',
      last_name: 'Diaz'
    }
  }
]

async function syncUsers() {
  console.log('🔄 Iniciando sincronización de usuarios con Auth...')

  for (const user of usersToCreate) {
    console.log(`\n📝 Creando usuario: ${user.email}`)
    
    try {
      // Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: user.user_metadata
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  Usuario ${user.email} ya existe en Auth`)
        } else {
          console.error(`❌ Error: ${error.message}`)
        }
      } else {
        console.log(`✅ Usuario creado: ${user.email}`)
        console.log(`   Auth ID: ${data.user.id}`)
        
        // Actualizar la tabla system_users con el auth_user_id
        const { error: updateError } = await supabase
          .from('system_users')
          .update({ auth_user_id: data.user.id })
          .eq('email', user.email)
        
        if (updateError) {
          console.error(`❌ Error actualizando auth_user_id: ${updateError.message}`)
        } else {
          console.log(`✅ auth_user_id actualizado en tabla system_users`)
        }
      }
    } catch (error: any) {
      console.error(`💥 Excepción: ${error.message}`)
    }
  }

  console.log('\n✨ Sincronización completada')
  console.log('\n📋 Credenciales de acceso:')
  usersToCreate.forEach(u => {
    console.log(`   Email: ${u.email}`)
    console.log(`   Password: ${u.password}`)
  })
}

syncUsers()

import { resolve } from 'path'

// Cargar variables de entorno
config({ path: resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Necesitamos la service key

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const usersToCreate = [
  {
    email: 'test@ejemplo.com',
    password: 'Test123456!', // Contraseña temporal
    user_metadata: {
      first_name: 'Luis',
      last_name: 'Diaz'
    }
  },
  {
    email: 'exclusicoparaclientes@gmail.com',
    password: 'Test123456!', // Contraseña temporal
    user_metadata: {
      first_name: 'Luis',
      last_name: 'Diaz'
    }
  }
]

async function syncUsers() {
  console.log('🔄 Iniciando sincronización de usuarios con Auth...')

  for (const user of usersToCreate) {
    console.log(`\n📝 Creando usuario: ${user.email}`)
    
    try {
      // Crear usuario en Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Auto-confirmar email
        user_metadata: user.user_metadata
      })

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`⚠️  Usuario ${user.email} ya existe en Auth`)
        } else {
          console.error(`❌ Error: ${error.message}`)
        }
      } else {
        console.log(`✅ Usuario creado: ${user.email}`)
        console.log(`   Auth ID: ${data.user.id}`)
        
        // Actualizar la tabla system_users con el auth_user_id
        const { error: updateError } = await supabase
          .from('system_users')
          .update({ auth_user_id: data.user.id })
          .eq('email', user.email)
        
        if (updateError) {
          console.error(`❌ Error actualizando auth_user_id: ${updateError.message}`)
        } else {
          console.log(`✅ auth_user_id actualizado en tabla system_users`)
        }
      }
    } catch (error: any) {
      console.error(`💥 Excepción: ${error.message}`)
    }
  }

  console.log('\n✨ Sincronización completada')
  console.log('\n📋 Credenciales de acceso:')
  usersToCreate.forEach(u => {
    console.log(`   Email: ${u.email}`)
    console.log(`   Password: ${u.password}`)
  })
}

syncUsers()






