/**
 * Script para ejecutar migración de base de datos
 * Ejecuta la migración completa en Supabase
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  try {
    console.log('🚀 Iniciando migración de base de datos...')
    
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Error: Variables de entorno de Supabase no configuradas')
      console.log('Por favor, configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local')
      process.exit(1)
    }
    
    // Crear cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Leer archivo de migración
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '001_complete_database.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Ejecutando migración SQL...')
    
    // Ejecutar migración
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Error ejecutando migración:', error)
      process.exit(1)
    }
    
    console.log('✅ Migración ejecutada exitosamente!')
    console.log('📊 Resultado:', data)
    
    // Verificar tablas creadas
    console.log('🔍 Verificando tablas creadas...')
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (tablesError) {
      console.warn('⚠️ No se pudieron verificar las tablas:', tablesError.message)
    } else {
      console.log('📋 Tablas encontradas:', tables.map(t => t.table_name))
    }
    
  } catch (error) {
    console.error('❌ Error en migración:', error)
    process.exit(1)
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runMigration()
}

module.exports = { runMigration }







