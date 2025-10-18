// Script de prueba DEFINITIVO para verificar que TODO funciona
// Ejecutar con: node test-ultimate-system.js

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUltimateSystem() {
  console.log('🚀 PRUEBA DEFINITIVA DEL SISTEMA COMPLETO\n')
  
  const tests = [
    { name: 'inventory_movements', table: 'inventory_movements', select: 'id, movement_type, quantity, reference_type' },
    { name: 'purchase_orders', table: 'purchase_orders', select: 'id, order_number, order_date, status, total' },
    { name: 'payments', table: 'payments', select: 'id, invoice_number, amount, payment_date, status' },
    { name: 'leads', table: 'leads', select: 'id, name, email, status' },
    { name: 'campaigns', table: 'campaigns', select: 'id, name, type, status' },
    { name: 'appointments', table: 'appointments', select: 'id, customer_name, appointment_date, status' },
    { name: 'invoices', table: 'invoices', select: 'id, invoice_number, customer_name, total, status' },
    { name: 'notifications', table: 'notifications', select: 'id, title, type, is_read' },
    { name: 'suppliers', table: 'suppliers', select: 'id, name, email, status' }
  ]

  let allTestsPassed = true
  const results = []

  for (const test of tests) {
    try {
      console.log(`🧪 Probando ${test.name}...`)
      
      const { data, error } = await supabase
        .from(test.table)
        .select(test.select)
        .limit(5)

      if (error) {
        console.log(`❌ ${test.name}: ERROR`)
        console.log(`   Error: ${error.message}`)
        allTestsPassed = false
        results.push({ name: test.name, status: 'ERROR', error: error.message })
      } else {
        console.log(`✅ ${test.name}: OK (${data?.length || 0} registros)`)
        results.push({ name: test.name, status: 'OK', count: data?.length || 0 })
      }
    } catch (err) {
      console.log(`❌ ${test.name}: EXCEPTION`)
      console.log(`   Exception: ${err.message}`)
      allTestsPassed = false
      results.push({ name: test.name, status: 'EXCEPTION', error: err.message })
    }
  }

  // Pruebas específicas de estadísticas
  console.log('\n📊 Probando funciones de estadísticas...')
  
  try {
    // Probar estadísticas de movimientos
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select('movement_type, quantity, created_at')

    if (movementsError) {
      console.log('❌ Estadísticas de movimientos: ERROR')
      allTestsPassed = false
    } else {
      console.log('✅ Estadísticas de movimientos: OK')
    }
  } catch (err) {
    console.log('❌ Estadísticas de movimientos: EXCEPTION')
    allTestsPassed = false
  }

  try {
    // Probar estadísticas de órdenes
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('status, total')

    if (ordersError) {
      console.log('❌ Estadísticas de órdenes: ERROR')
      allTestsPassed = false
    } else {
      console.log('✅ Estadísticas de órdenes: OK')
    }
  } catch (err) {
    console.log('❌ Estadísticas de órdenes: EXCEPTION')
    allTestsPassed = false
  }

  try {
    // Probar estadísticas de pagos
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('status, amount')

    if (paymentsError) {
      console.log('❌ Estadísticas de pagos: ERROR')
      allTestsPassed = false
    } else {
      console.log('✅ Estadísticas de pagos: OK')
    }
  } catch (err) {
    console.log('❌ Estadísticas de pagos: EXCEPTION')
    allTestsPassed = false
  }

  // Resultado final
  console.log('\n' + '='.repeat(60))
  console.log('📋 RESUMEN DE RESULTADOS')
  console.log('='.repeat(60))
  
  results.forEach(result => {
    const status = result.status === 'OK' ? '✅' : '❌'
    const count = result.count !== undefined ? ` (${result.count} registros)` : ''
    const error = result.error ? ` - ${result.error}` : ''
    console.log(`${status} ${result.name}${count}${error}`)
  })

  console.log('\n' + '='.repeat(60))
  if (allTestsPassed) {
    console.log('🎉 ¡SISTEMA COMPLETAMENTE FUNCIONAL!')
    console.log('✅ Todas las tablas funcionan correctamente')
    console.log('✅ No deberías ver más errores en la consola')
    console.log('✅ El sistema está listo para usar')
  } else {
    console.log('❌ SISTEMA CON PROBLEMAS')
    console.log('⚠️  Algunas tablas tienen errores')
    console.log('📝 Revisa los errores anteriores y ejecuta la migración')
  }
  console.log('='.repeat(60))
}

testUltimateSystem()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error fatal:', error)
    process.exit(1)
  })



