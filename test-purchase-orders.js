// Script de prueba para verificar las funciones de purchase_orders
// Ejecutar con: node test-purchase-orders.js

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase (reemplaza con tus valores reales)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testPurchaseOrders() {
  console.log('🧪 Probando funciones de purchase_orders...\n')

  try {
    // 1. Probar getPurchaseOrders
    console.log('1. Probando getPurchaseOrders...')
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
      console.error('❌ Error en getPurchaseOrders:', ordersError)
    } else {
      console.log('✅ getPurchaseOrders exitoso')
      console.log(`   - Encontradas ${orders?.length || 0} órdenes`)
      if (orders && orders.length > 0) {
        console.log('   - Primera orden:', {
          id: orders[0].id,
          order_number: orders[0].order_number,
          status: orders[0].status,
          total: orders[0].total
        })
      }
    }

    // 2. Probar getPurchaseOrderStats
    console.log('\n2. Probando getPurchaseOrderStats...')
    const { data: statsData, error: statsError } = await supabase
      .from('purchase_orders')
      .select('status, total')

    if (statsError) {
      console.error('❌ Error en getPurchaseOrderStats:', statsError)
    } else {
      console.log('✅ getPurchaseOrderStats exitoso')
      
      if (statsData && statsData.length > 0) {
        const totalOrders = statsData.length
        const pendingOrders = statsData.filter(o => o.status === 'pending').length
        const confirmedOrders = statsData.filter(o => o.status === 'confirmed').length
        const shippedOrders = statsData.filter(o => o.status === 'shipped').length
        const deliveredOrders = statsData.filter(o => o.status === 'delivered').length
        const cancelledOrders = statsData.filter(o => o.status === 'cancelled').length
        const totalValue = statsData.reduce((sum, order) => sum + (Number(order.total) || 0), 0)

        console.log('   - Estadísticas calculadas:')
        console.log(`     * Total órdenes: ${totalOrders}`)
        console.log(`     * Pendientes: ${pendingOrders}`)
        console.log(`     * Confirmadas: ${confirmedOrders}`)
        console.log(`     * Enviadas: ${shippedOrders}`)
        console.log(`     * Entregadas: ${deliveredOrders}`)
        console.log(`     * Canceladas: ${cancelledOrders}`)
        console.log(`     * Valor total: $${totalValue.toLocaleString()}`)
      } else {
        console.log('   - No hay datos para calcular estadísticas')
      }
    }

    // 3. Probar inserción de una orden de prueba
    console.log('\n3. Probando inserción de orden...')
    const { data: newOrder, error: insertError } = await supabase
      .from('purchase_orders')
      .insert([{
        organization_id: '00000000-0000-0000-0000-000000000000',
        supplier_id: '00000000-0000-0000-0000-000000000001', // Proveedor de prueba
        order_number: 'TEST-PO-001',
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

    if (insertError) {
      console.error('❌ Error insertando orden:', insertError)
    } else {
      console.log('✅ Inserción exitosa')
      console.log('   - ID de la orden:', newOrder.id)
      
      // Limpiar la orden de prueba
      const { error: deleteError } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', newOrder.id)
      
      if (deleteError) {
        console.log('⚠️  No se pudo limpiar la orden de prueba:', deleteError.message)
      } else {
        console.log('✅ Orden de prueba eliminada')
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error)
  }
}

// Ejecutar las pruebas
testPurchaseOrders()
  .then(() => {
    console.log('\n🎉 Pruebas completadas')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en las pruebas:', error)
    process.exit(1)
  })



