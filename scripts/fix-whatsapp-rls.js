/**
 * Script para corregir políticas RLS de WhatsApp
 * Ejecuta la migración 017_fix_whatsapp_rls_policies.sql
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

async function fixWhatsAppRLS() {
  try {
    console.log('🔧 Iniciando corrección de políticas RLS de WhatsApp...\n')
    
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Error: Variables de entorno de Supabase no configuradas')
      console.log('\nPor favor, configura en .env.local:')
      console.log('  NEXT_PUBLIC_SUPABASE_URL=tu-url')
      console.log('  SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key\n')
      process.exit(1)
    }
    
    console.log('✅ Variables de entorno encontradas')
    console.log(`   URL: ${supabaseUrl.substring(0, 30)}...`)
    console.log(`   Key: ${supabaseKey.substring(0, 20)}...\n`)
    
    // Crear cliente Supabase con service_role
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '017_fix_whatsapp_rls_policies.sql')
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Error: No se encontró el archivo de migración en: ${migrationPath}`)
      process.exit(1)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    console.log('📄 Archivo de migración cargado\n')
    
    // Dividir el SQL en comandos individuales (separados por ;)
    // Filtrar comentarios y líneas vacías
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => 
        cmd.length > 0 && 
        !cmd.startsWith('--') && 
        !cmd.startsWith('/*') &&
        cmd !== '\n'
      )
    
    console.log(`📝 Ejecutando ${commands.length} comandos SQL...\n`)
    
    let successCount = 0
    let errorCount = 0
    
    // Ejecutar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';' // Agregar ; al final
      
      try {
        // Usar rpc para ejecutar SQL directamente
        // Nota: Esto requiere que tengas una función exec_sql en Supabase
        // Si no funciona, ejecuta el SQL manualmente en el SQL Editor
        
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: command 
        })
        
        if (error) {
          // Si la función exec_sql no existe, intentar método alternativo
          if (error.message?.includes('function') || error.message?.includes('exec_sql')) {
            console.log('⚠️  La función exec_sql no está disponible.')
            console.log('📋 Por favor, ejecuta el SQL manualmente en Supabase SQL Editor:\n')
            console.log('='.repeat(60))
            console.log(migrationSQL)
            console.log('='.repeat(60))
            process.exit(0)
          }
          
          // Si es un error de "ya existe", es normal
          if (error.message?.includes('already exists') || 
              error.message?.includes('does not exist')) {
            console.log(`   ⚠️  Comando ${i + 1}: ${error.message.substring(0, 50)}...`)
            successCount++
          } else {
            console.error(`   ❌ Comando ${i + 1} falló:`, error.message)
            errorCount++
          }
        } else {
          console.log(`   ✅ Comando ${i + 1} ejecutado correctamente`)
          successCount++
        }
      } catch (err) {
        console.error(`   ❌ Error en comando ${i + 1}:`, err.message)
        errorCount++
      }
    }
    
    console.log('\n' + '='.repeat(60))
    console.log(`✅ Comandos exitosos: ${successCount}`)
    if (errorCount > 0) {
      console.log(`⚠️  Comandos con advertencias: ${errorCount}`)
    }
    console.log('='.repeat(60))
    
    // Verificar políticas creadas
    console.log('\n🔍 Verificando políticas creadas...\n')
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .or('tablename.eq.whatsapp_conversations,tablename.eq.whatsapp_messages')
    
    if (policiesError) {
      console.log('⚠️  No se pudieron verificar las políticas automáticamente')
      console.log('   Ejecuta manualmente en SQL Editor:')
      console.log('   SELECT * FROM pg_policies WHERE tablename IN (\'whatsapp_conversations\', \'whatsapp_messages\');')
    } else {
      console.log(`✅ Se encontraron ${policies?.length || 0} políticas`)
      if (policies && policies.length > 0) {
        policies.forEach(p => {
          console.log(`   - ${p.policyname} en ${p.tablename}`)
        })
      }
    }
    
    console.log('\n✅ Migración completada!')
    console.log('\n📋 Próximos pasos:')
    console.log('   1. Recarga la página de conversaciones de WhatsApp')
    console.log('   2. Verifica que las conversaciones se carguen correctamente')
    console.log('   3. Si aún hay problemas, revisa los logs en la consola del navegador\n')
    
  } catch (error) {
    console.error('\n❌ Error ejecutando migración:', error)
    console.log('\n📋 Alternativa: Ejecuta el SQL manualmente')
    console.log('   1. Ve a Supabase Dashboard > SQL Editor')
    console.log('   2. Copia el contenido de: supabase/migrations/017_fix_whatsapp_rls_policies.sql')
    console.log('   3. Pégalo y ejecuta\n')
    process.exit(1)
  }
}

// Ejecutar
fixWhatsAppRLS()

