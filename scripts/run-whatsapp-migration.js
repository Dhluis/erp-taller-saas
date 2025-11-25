/**
 * Script para ejecutar la migración de campos de WhatsApp
 * Ejecuta: node scripts/run-whatsapp-migration.js
 * 
 * NOTA: Este script requiere ejecutar el SQL manualmente en Supabase
 * debido a restricciones de seguridad. El script solo valida la conexión.
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Faltan variables de entorno')
    console.error('Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  console.log('🔧 Conectando a Supabase...')
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verificar conexión
  const { data, error } = await supabase.from('ai_agent_config').select('id').limit(1)
  
  if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
    console.error('❌ Error conectando a Supabase:', error.message)
    process.exit(1)
  }

  console.log('✅ Conexión a Supabase establecida')
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 MIGRACIÓN SQL PARA EJECUTAR MANUALMENTE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')

  // Leer y mostrar el SQL
  const migrationPath = path.join(__dirname, '../supabase/migrations/012_add_whatsapp_fields.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log(sql)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('📋 INSTRUCCIONES:')
  console.log('')
  console.log('1. Abre el SQL Editor en Supabase Dashboard:')
  console.log('   https://supabase.com/dashboard/project/[tu-proyecto]/sql/new')
  console.log('')
  console.log('2. Copia y pega el SQL mostrado arriba')
  console.log('')
  console.log('3. Haz clic en "Run" o presiona Ctrl+Enter')
  console.log('')
  console.log('4. Verifica que aparezca el mensaje de éxito')
  console.log('')
  console.log('✅ Una vez ejecutado, las columnas estarán disponibles')
  console.log('')

  // Intentar verificar si las columnas ya existen
  try {
    const { data: columns, error: colError } = await supabase
      .rpc('exec_sql', { 
        query: `SELECT column_name FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'ai_agent_config' 
                AND column_name IN ('whatsapp_phone', 'whatsapp_connected')` 
      })
      .catch(() => ({ data: null, error: { message: 'RPC no disponible' } }))

    if (!colError && columns && columns.length > 0) {
      console.log('✅ Las columnas ya existen en la base de datos!')
      console.log('   Columnas encontradas:', columns.map(c => c.column_name).join(', '))
    } else {
      console.log('⚠️  Las columnas aún no existen. Ejecuta el SQL mostrado arriba.')
    }
  } catch (e) {
    // Ignorar error, solo es una verificación opcional
  }
}

runMigration()
