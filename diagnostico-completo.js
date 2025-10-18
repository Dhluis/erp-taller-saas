// Script de diagnóstico completo para identificar el problema exacto
// Ejecutar con: node diagnostico-completo.js

const { createClient } = require('@supabase/supabase-js')

// Usar variables de entorno del sistema o valores por defecto
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

console.log('🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA')
console.log('=====================================\n')

console.log('📋 Configuración detectada:')
console.log(`URL: ${supabaseUrl}`)
console.log(`Key: ${supabaseKey.substring(0, 20)}...`)

if (supabaseUrl === 'https://your-project.supabase.co' || supabaseKey === 'your-anon-key') {
  console.log('\n❌ ERROR: Variables de entorno no configuradas')
  console.log('📝 Necesitas configurar las variables de entorno:')
  console.log('   NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase')
  console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima')
  console.log('\n💡 Crea un archivo .env.local con estas variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnosticarSistema() {
  console.log('\n🧪 Iniciando diagnóstico...\n')

  // Lista de tablas críticas para verificar
  const tablasCriticas = [
    'inventory_movements',
    'purchase_orders', 
    'payments',
    'suppliers',
    'leads',
    'campaigns',
    'appointments',
    'invoices',
    'notifications'
  ]

  const resultados = []

  for (const tabla of tablasCriticas) {
    try {
      console.log(`🔍 Verificando tabla: ${tabla}`)
      
      // Intentar hacer una consulta simple
      const { data, error } = await supabase
        .from(tabla)
        .select('*')
        .limit(1)

      if (error) {
        console.log(`❌ ${tabla}: ERROR - ${error.message}`)
        resultados.push({
          tabla,
          estado: 'ERROR',
          error: error.message,
          codigo: error.code,
          detalles: error.details,
          hint: error.hint
        })
      } else {
        console.log(`✅ ${tabla}: OK (${data?.length || 0} registros)`)
        resultados.push({
          tabla,
          estado: 'OK',
          registros: data?.length || 0
        })
      }
    } catch (err) {
      console.log(`❌ ${tabla}: EXCEPCIÓN - ${err.message}`)
      resultados.push({
        tabla,
        estado: 'EXCEPCIÓN',
        error: err.message
      })
    }
  }

  // Verificar columnas específicas de tablas problemáticas
  console.log('\n🔍 Verificando columnas específicas...\n')

  // Verificar inventory_movements
  try {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('movement_type, reference_type, reference_id, user_id')
      .limit(1)

    if (error) {
      console.log('❌ inventory_movements: Columnas faltantes o error de estructura')
      console.log(`   Error: ${error.message}`)
    } else {
      console.log('✅ inventory_movements: Estructura correcta')
    }
  } catch (err) {
    console.log('❌ inventory_movements: Error de estructura')
  }

  // Verificar purchase_orders
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('order_date, subtotal, tax_amount, total')
      .limit(1)

    if (error) {
      console.log('❌ purchase_orders: Columnas faltantes o error de estructura')
      console.log(`   Error: ${error.message}`)
    } else {
      console.log('✅ purchase_orders: Estructura correcta')
    }
  } catch (err) {
    console.log('❌ purchase_orders: Error de estructura')
  }

  // Verificar payments
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('payment_date, amount, status')
      .limit(1)

    if (error) {
      console.log('❌ payments: Tabla no existe o error de estructura')
      console.log(`   Error: ${error.message}`)
    } else {
      console.log('✅ payments: Estructura correcta')
    }
  } catch (err) {
    console.log('❌ payments: Tabla no existe o error de estructura')
  }

  // Resumen final
  console.log('\n' + '='.repeat(60))
  console.log('📊 RESUMEN DEL DIAGNÓSTICO')
  console.log('='.repeat(60))

  const errores = resultados.filter(r => r.estado !== 'OK')
  const exitosos = resultados.filter(r => r.estado === 'OK')

  console.log(`✅ Tablas funcionando: ${exitosos.length}`)
  console.log(`❌ Tablas con problemas: ${errores.length}`)

  if (errores.length > 0) {
    console.log('\n❌ PROBLEMAS DETECTADOS:')
    errores.forEach(error => {
      console.log(`   - ${error.tabla}: ${error.error || error.estado}`)
    })
    
    console.log('\n💡 SOLUCIÓN:')
    console.log('   1. Ejecuta el script FIX_INMEDIATO.sql en Supabase SQL Editor')
    console.log('   2. O ejecuta la migración 011_ULTIMATE_SCHEMA_FIX.sql')
    console.log('   3. Refresca tu aplicación web')
  } else {
    console.log('\n🎉 ¡TODAS LAS TABLAS FUNCIONAN CORRECTAMENTE!')
    console.log('   El problema puede estar en otro lado.')
  }

  console.log('\n' + '='.repeat(60))
}

diagnosticarSistema()
  .then(() => {
    console.log('\n🏁 Diagnóstico completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error en el diagnóstico:', error)
    process.exit(1)
  })



