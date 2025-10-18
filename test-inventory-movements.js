// Script de prueba para verificar las funciones de inventory_movements
// Ejecutar con: node test-inventory-movements.js

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase (reemplaza con tus valores reales)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testInventoryMovements() {
  console.log('🧪 Probando funciones de inventory_movements...\n')

  try {
    // 1. Probar getInventoryMovements
    console.log('1. Probando getInventoryMovements...')
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select(`
        id,
        product_id,
        movement_type,
        quantity,
        reference_type,
        reference_id,
        notes,
        user_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (movementsError) {
      console.error('❌ Error en getInventoryMovements:', movementsError)
    } else {
      console.log('✅ getInventoryMovements exitoso')
      console.log(`   - Encontrados ${movements?.length || 0} movimientos`)
      if (movements && movements.length > 0) {
        console.log('   - Primer movimiento:', {
          id: movements[0].id,
          movement_type: movements[0].movement_type,
          quantity: movements[0].quantity
        })
      }
    }

    // 2. Probar getMovementStats
    console.log('\n2. Probando getMovementStats...')
    const { data: statsData, error: statsError } = await supabase
      .from('inventory_movements')
      .select('movement_type, quantity, created_at')

    if (statsError) {
      console.error('❌ Error en getMovementStats:', statsError)
    } else {
      console.log('✅ getMovementStats exitoso')
      
      if (statsData && statsData.length > 0) {
        const today = new Date().toISOString().split('T')[0]
        
        const totalMovements = statsData.length
        const movementsIn = statsData.filter(m => m.movement_type === 'in').length
        const movementsOut = statsData.filter(m => m.movement_type === 'out').length
        const totalQuantityIn = statsData
          .filter(m => m.movement_type === 'in')
          .reduce((sum, movement) => sum + (movement.quantity || 0), 0)
        const totalQuantityOut = statsData
          .filter(m => m.movement_type === 'out')
          .reduce((sum, movement) => sum + (movement.quantity || 0), 0)
        const adjustmentsToday = statsData
          .filter(m => m.movement_type === 'adjustment' && m.created_at?.startsWith(today))
          .length

        console.log('   - Estadísticas calculadas:')
        console.log(`     * Total movimientos: ${totalMovements}`)
        console.log(`     * Entradas: ${movementsIn} (${totalQuantityIn} unidades)`)
        console.log(`     * Salidas: ${movementsOut} (${totalQuantityOut} unidades)`)
        console.log(`     * Ajustes hoy: ${adjustmentsToday}`)
      } else {
        console.log('   - No hay datos para calcular estadísticas')
      }
    }

    // 3. Probar inserción de un movimiento de prueba
    console.log('\n3. Probando inserción de movimiento...')
    const { data: newMovement, error: insertError } = await supabase
      .from('inventory_movements')
      .insert([{
        organization_id: '00000000-0000-0000-0000-000000000000',
        product_id: '00000000-0000-0000-0000-000000000011', // Aceite Motor
        movement_type: 'in',
        quantity: 5,
        reference_type: 'purchase',
        reference_id: 'TEST-001',
        notes: 'Movimiento de prueba',
        user_id: null
      }])
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error insertando movimiento:', insertError)
    } else {
      console.log('✅ Inserción exitosa')
      console.log('   - ID del movimiento:', newMovement.id)
      
      // Limpiar el movimiento de prueba
      const { error: deleteError } = await supabase
        .from('inventory_movements')
        .delete()
        .eq('id', newMovement.id)
      
      if (deleteError) {
        console.log('⚠️  No se pudo limpiar el movimiento de prueba:', deleteError.message)
      } else {
        console.log('✅ Movimiento de prueba eliminado')
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar las pruebas
testInventoryMovements()
  .then(() => {
    console.log('\n🎉 Pruebas completadas')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en las pruebas:', error)
    process.exit(1)
  })



