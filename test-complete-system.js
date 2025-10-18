// Script de prueba completo para verificar TODAS las funciones del sistema
// Ejecutar con: node test-complete-system.js

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase (reemplaza con tus valores reales)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCompleteSystem() {
  console.log('🧪 Probando SISTEMA COMPLETO...\n')
  let allTestsPassed = true

  try {
    // =====================================================
    // 1. PROBAR INVENTORY_MOVEMENTS
    // =====================================================
    console.log('1. 🔄 Probando INVENTORY_MOVEMENTS...')
    
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
      console.error('❌ Error en inventory_movements:', movementsError)
      allTestsPassed = false
    } else {
      console.log('✅ inventory_movements OK')
      console.log(`   - Encontrados ${movements?.length || 0} movimientos`)
    }

    // =====================================================
    // 2. PROBAR PURCHASE_ORDERS
    // =====================================================
    console.log('\n2. 🛒 Probando PURCHASE_ORDERS...')
    
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        supplier_id,
        order_date,
        expected_delivery_date,
        status,
        subtotal,
        tax_amount,
        total,
        notes,
        created_at,
        updated_at
      `)
      .order('order_date', { ascending: false })

    if (ordersError) {
      console.error('❌ Error en purchase_orders:', ordersError)
      allTestsPassed = false
    } else {
      console.log('✅ purchase_orders OK')
      console.log(`   - Encontradas ${orders?.length || 0} órdenes`)
    }

    // =====================================================
    // 3. PROBAR SUPPLIERS
    // =====================================================
    console.log('\n3. 🏢 Probando SUPPLIERS...')
    
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true })

    if (suppliersError) {
      console.error('❌ Error en suppliers:', suppliersError)
      allTestsPassed = false
    } else {
      console.log('✅ suppliers OK')
      console.log(`   - Encontrados ${suppliers?.length || 0} proveedores`)
    }

    // =====================================================
    // 4. PROBAR ESTADÍSTICAS DE MOVIMIENTOS
    // =====================================================
    console.log('\n4. 📊 Probando ESTADÍSTICAS DE MOVIMIENTOS...')
    
    const { data: statsData, error: statsError } = await supabase
      .from('inventory_movements')
      .select('movement_type, quantity, created_at')

    if (statsError) {
      console.error('❌ Error en estadísticas de movimientos:', statsError)
      allTestsPassed = false
    } else {
      console.log('✅ Estadísticas de movimientos OK')
      
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
      }
    }

    // =====================================================
    // 5. PROBAR ESTADÍSTICAS DE ÓRDENES
    // =====================================================
    console.log('\n5. 📈 Probando ESTADÍSTICAS DE ÓRDENES...')
    
    const { data: orderStatsData, error: orderStatsError } = await supabase
      .from('purchase_orders')
      .select('status, total')

    if (orderStatsError) {
      console.error('❌ Error en estadísticas de órdenes:', orderStatsError)
      allTestsPassed = false
    } else {
      console.log('✅ Estadísticas de órdenes OK')
      
      if (orderStatsData && orderStatsData.length > 0) {
        const totalOrders = orderStatsData.length
        const pendingOrders = orderStatsData.filter(o => o.status === 'pending').length
        const confirmedOrders = orderStatsData.filter(o => o.status === 'confirmed').length
        const shippedOrders = orderStatsData.filter(o => o.status === 'shipped').length
        const deliveredOrders = orderStatsData.filter(o => o.status === 'delivered').length
        const cancelledOrders = orderStatsData.filter(o => o.status === 'cancelled').length
        const totalValue = orderStatsData.reduce((sum, order) => sum + (Number(order.total) || 0), 0)

        console.log('   - Estadísticas calculadas:')
        console.log(`     * Total órdenes: ${totalOrders}`)
        console.log(`     * Pendientes: ${pendingOrders}`)
        console.log(`     * Confirmadas: ${confirmedOrders}`)
        console.log(`     * Enviadas: ${shippedOrders}`)
        console.log(`     * Entregadas: ${deliveredOrders}`)
        console.log(`     * Canceladas: ${cancelledOrders}`)
        console.log(`     * Valor total: $${totalValue.toLocaleString()}`)
      }
    }

    // =====================================================
    // 6. PROBAR INSERCIÓN DE DATOS
    // =====================================================
    console.log('\n6. ➕ Probando INSERCIÓN DE DATOS...')
    
    // Probar inserción de movimiento
    const { data: newMovement, error: insertMovementError } = await supabase
      .from('inventory_movements')
      .insert([{
        organization_id: '00000000-0000-0000-0000-000000000000',
        product_id: '00000000-0000-0000-0000-000000000011',
        movement_type: 'in',
        quantity: 1,
        reference_type: 'adjustment',
        reference_id: 'TEST-MOVEMENT',
        notes: 'Movimiento de prueba',
        user_id: null
      }])
      .select()
      .single()

    if (insertMovementError) {
      console.error('❌ Error insertando movimiento:', insertMovementError)
      allTestsPassed = false
    } else {
      console.log('✅ Inserción de movimiento OK')
      
      // Limpiar movimiento de prueba
      const { error: deleteMovementError } = await supabase
        .from('inventory_movements')
        .delete()
        .eq('id', newMovement.id)
      
      if (deleteMovementError) {
        console.log('⚠️  No se pudo limpiar el movimiento de prueba')
      } else {
        console.log('✅ Movimiento de prueba eliminado')
      }
    }

    // Probar inserción de orden
    const { data: newOrder, error: insertOrderError } = await supabase
      .from('purchase_orders')
      .insert([{
        organization_id: '00000000-0000-0000-0000-000000000000',
        supplier_id: '00000000-0000-0000-0000-000000000001',
        order_number: 'TEST-ORDER-001',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending',
        subtotal: 100.00,
        tax_amount: 16.00,
        total: 116.00,
        notes: 'Orden de prueba'
      }])
      .select()
      .single()

    if (insertOrderError) {
      console.error('❌ Error insertando orden:', insertOrderError)
      allTestsPassed = false
    } else {
      console.log('✅ Inserción de orden OK')
      
      // Limpiar orden de prueba
      const { error: deleteOrderError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', newOrder.id)
      
      if (deleteOrderError) {
        console.log('⚠️  No se pudo limpiar la orden de prueba')
      } else {
        console.log('✅ Orden de prueba eliminada')
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error)
    allTestsPassed = false
  }

  // =====================================================
  // RESULTADO FINAL
  // =====================================================
  console.log('\n' + '='.repeat(50))
  if (allTestsPassed) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON!')
    console.log('✅ El sistema está funcionando correctamente')
    console.log('✅ No deberías ver más errores en la consola')
  } else {
    console.log('❌ ALGUNOS TESTS FALLARON')
    console.log('⚠️  Revisa los errores anteriores')
  }
  console.log('='.repeat(50))
}

// Ejecutar las pruebas
testCompleteSystem()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en las pruebas:', error)
    process.exit(1)
  })


