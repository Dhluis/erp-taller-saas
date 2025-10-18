// Script simple para verificar si la migración se ejecutó correctamente
// Ejecutar con: node check-migration-status.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMigrationStatus() {
  console.log('🔍 Verificando estado de la migración...\n')

  // Verificar si las columnas críticas existen
  const criticalChecks = [
    {
      table: 'inventory_movements',
      column: 'movement_type',
      description: 'Columna movement_type en inventory_movements'
    },
    {
      table: 'inventory_movements', 
      column: 'reference_type',
      description: 'Columna reference_type en inventory_movements'
    },
    {
      table: 'purchase_orders',
      column: 'order_date', 
      description: 'Columna order_date en purchase_orders'
    },
    {
      table: 'purchase_orders',
      column: 'subtotal',
      description: 'Columna subtotal en purchase_orders'
    },
    {
      table: 'purchase_orders',
      column: 'tax_amount',
      description: 'Columna tax_amount en purchase_orders'
    },
    {
      table: 'purchase_orders',
      column: 'total',
      description: 'Columna total en purchase_orders'
    }
  ]

  let allChecksPassed = true

  for (const check of criticalChecks) {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', check.table)
        .eq('column_name', check.column)
        .eq('table_schema', 'public')
        .single()

      if (error || !data) {
        console.log(`❌ ${check.description}: FALTA`)
        allChecksPassed = false
      } else {
        console.log(`✅ ${check.description}: OK`)
      }
    } catch (err) {
      console.log(`❌ ${check.description}: ERROR - ${err.message}`)
      allChecksPassed = false
    }
  }

  console.log('\n' + '='.repeat(50))
  if (allChecksPassed) {
    console.log('🎉 MIGRACIÓN COMPLETADA CORRECTAMENTE')
    console.log('✅ Todas las columnas críticas existen')
    console.log('✅ El problema debe estar en otro lado')
  } else {
    console.log('❌ MIGRACIÓN INCOMPLETA')
    console.log('⚠️  Faltan columnas críticas')
    console.log('📝 Necesitas ejecutar la migración 010_complete_schema_fix.sql')
  }
  console.log('='.repeat(50))
}

checkMigrationStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })



