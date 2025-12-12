/**
 * Script de Diagnóstico de Supabase
 * Verifica configuración y conexión
 */

require('dotenv').config({ path: '.env.local' })

console.log('🔍 DIAGNÓSTICO DE SUPABASE\n')
console.log('=' .repeat(60))

// PASO 1: Verificar variables de entorno
console.log('\n📋 PASO 1: Variables de Entorno')
console.log('-'.repeat(60))

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log(`NEXT_PUBLIC_SUPABASE_URL: ${url ? '✅' : '❌'} ${url ? url.substring(0, 40) + '...' : 'NO CONFIGURADO'}`)
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? '✅' : '❌'} ${anonKey ? anonKey.substring(0, 30) + '...' : 'NO CONFIGURADO'}`)
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${serviceKey ? '✅' : '⚠️'} ${serviceKey ? serviceKey.substring(0, 30) + '...' : 'OPCIONAL'}`)

// Validaciones
const errors = []
const warnings = []

if (!url) {
  errors.push('❌ NEXT_PUBLIC_SUPABASE_URL no está configurado')
} else if (!url.includes('supabase.co')) {
  warnings.push('⚠️ La URL no contiene "supabase.co", verifica que sea correcta')
}

if (!anonKey) {
  errors.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurado')
} else if (!anonKey.startsWith('eyJ')) {
  warnings.push('⚠️ La ANON_KEY no parece ser un JWT válido (debe empezar con "eyJ")')
}

if (url && !url.includes('igshgleciwknpupbmvhn')) {
  warnings.push('⚠️ La URL no coincide con el proyecto mencionado en el error (igshgleciwknpupbmvhn)')
}

console.log('\n📊 Resumen:')
if (errors.length > 0) {
  console.log('\n❌ ERRORES:')
  errors.forEach(err => console.log(`  ${err}`))
}

if (warnings.length > 0) {
  console.log('\n⚠️ ADVERTENCIAS:')
  warnings.forEach(warn => console.log(`  ${warn}`))
}

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ Todas las variables están configuradas correctamente')
}

// PASO 2: Probar conexión
console.log('\n\n🌐 PASO 2: Prueba de Conexión')
console.log('-'.repeat(60))

if (!url || !anonKey) {
  console.log('❌ No se puede probar la conexión: faltan variables de entorno')
  process.exit(1)
}

async function testConnection() {
  try {
    const { createClient } = require('@supabase/supabase-js')
    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    console.log('🔄 Intentando conectar a Supabase...')
    
    // Probar con timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout: La conexión tardó más de 10 segundos')), 10000)
    })

    const testPromise = supabase.from('organizations').select('id').limit(1)
    
    const result = await Promise.race([testPromise, timeoutPromise])
    
    if (result.error) {
      console.log(`❌ Error de conexión: ${result.error.message}`)
      console.log(`   Código: ${result.error.code || 'N/A'}`)
      console.log(`   Detalles: ${result.error.details || 'N/A'}`)
      
      if (result.error.message.includes('Failed to fetch') || 
          result.error.message.includes('ERR_CONNECTION_CLOSED')) {
        console.log('\n💡 SUGERENCIAS:')
        console.log('   1. Verifica tu conexión a internet')
        console.log('   2. Verifica que el proyecto Supabase esté activo en el dashboard')
        console.log('   3. Verifica que la URL sea correcta')
        console.log('   4. Intenta acceder a: https://' + url.split('//')[1]?.split('/')[0])
      }
      
      return false
    }

    console.log('✅ Conexión exitosa a Supabase')
    console.log(`   Datos recibidos: ${result.data ? 'Sí' : 'No'}`)
    return true
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}`)
    
    if (error.message.includes('Timeout')) {
      console.log('\n💡 SUGERENCIAS:')
      console.log('   1. El servidor de Supabase puede estar lento o caído')
      console.log('   2. Verifica el estado del proyecto en: https://supabase.com/dashboard')
      console.log('   3. Verifica que el proyecto no esté pausado')
    }
    
    return false
  }
}

testConnection().then(success => {
  console.log('\n\n' + '='.repeat(60))
  console.log(success ? '✅ DIAGNÓSTICO COMPLETO: Todo está funcionando' : '❌ DIAGNÓSTICO COMPLETO: Hay problemas que resolver')
  console.log('='.repeat(60))
  process.exit(success ? 0 : 1)
})

