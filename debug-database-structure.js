// Script de debug para verificar la estructura de la base de datos
// Ejecutar con: node debug-database-structure.js

const { createClient } = require('@supabase/supabase-js')

// Configuración de Supabase (reemplaza con tus valores reales)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDatabaseStructure() {
  console.log('🔍 DEBUGGING: Verificando estructura de la base de datos...\n')

  try {
    // =====================================================
    // 1. VERIFICAR SI LAS TABLAS EXISTEN
    // =====================================================
    console.log('1. 📋 Verificando existencia de tablas...')
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['inventory_movements', 'purchase_orders', 'suppliers'])

    if (tablesError) {
      console.error('❌ Error verificando tablas:', tablesError)
    } else {
      console.log('✅ Tablas encontradas:', tables?.map(t => t.table_name) || [])
    }

    // =====================================================
    // 2. VERIFICAR ESTRUCTURA DE INVENTORY_MOVEMENTS
    // =====================================================
    console.log('\n2. 🔄 Verificando estructura de inventory_movements...')
    
    const { data: inventoryColumns, error: inventoryError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'inventory_movements')
      .eq('table_schema', 'public')

    if (inventoryError) {
      console.error('❌ Error verificando inventory_movements:', inventoryError)
    } else {
      console.log('✅ Columnas de inventory_movements:')
      inventoryColumns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
    }

    // =====================================================
    // 3. VERIFICAR ESTRUCTURA DE PURCHASE_ORDERS
    // =====================================================
    console.log('\n3. 🛒 Verificando estructura de purchase_orders...')
    
    const { data: purchaseColumns, error: purchaseError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'purchase_orders')
      .eq('table_schema', 'public')

    if (purchaseError) {
      console.error('❌ Error verificando purchase_orders:', purchaseError)
    } else {
      console.log('✅ Columnas de purchase_orders:')
      purchaseColumns?.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
      })
    }

    // =====================================================
    // 4. PROBAR CONSULTAS DIRECTAS
    // =====================================================
    console.log('\n4. 🧪 Probando consultas directas...')
    
    // Probar inventory_movements
    console.log('   - Probando inventory_movements...')
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select('*')
      .limit(1)

    if (movementsError) {
      console.error('❌ Error en inventory_movements:', movementsError)
    } else {
      console.log('✅ inventory_movements funciona')
    }

    // Probar purchase_orders
    console.log('   - Probando purchase_orders...')
    const { data: orders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('*')
      .limit(1)

    if (ordersError) {
      console.error('❌ Error en purchase_orders:', ordersError)
    } else {
      console.log('✅ purchase_orders funciona')
    }

    // =====================================================
    // 5. VERIFICAR DATOS DE EJEMPLO
    // =====================================================
    console.log('\n5. 📊 Verificando datos de ejemplo...')
    
    const { data: movementsCount, error: movementsCountError } = await supabase
      .from('inventory_movements')
      .select('id', { count: 'exact' })

    if (movementsCountError) {
      console.error('❌ Error contando movimientos:', movementsCountError)
    } else {
      console.log(`✅ Movimientos en BD: ${movementsCount?.length || 0}`)
    }

    const { data: ordersCount, error: ordersCountError } = await supabase
      .from('purchase_orders')
      .select('id', { count: 'exact' })

    if (ordersCountError) {
      console.error('❌ Error contando órdenes:', ordersCountError)
    } else {
      console.log(`✅ Órdenes en BD: ${ordersCount?.length || 0}`)
    }

    // =====================================================
    // 6. PROBAR LAS FUNCIONES EXACTAS DEL CÓDIGO
    // =====================================================
    console.log('\n6. 🔧 Probando funciones exactas del código...')
    
    // Probar getPurchaseOrders exactamente como en el código
    console.log('   - Probando getPurchaseOrders...')
    const { data: purchaseOrders, error: purchaseOrdersError } = await supabase
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

    if (purchaseOrdersError) {
      console.error('❌ Error en getPurchaseOrders:', purchaseOrdersErrorError)
      console.error('   Detalles del error:', {
        message: purchaseOrdersError?.message,
        details: purchaseOrdersError?.details,
        hint: purchaseOrdersError?.hint,
        code: purchaseOrdersError?.code
      })
    } else {
      console.log('✅ getPurchaseOrders funciona correctamente')
      console.log(`   - Encontradas ${purchaseOrders?.length || 0} órdenes`)
    }

  } catch (error) {
    console.error('❌ Error general en debug:', error)
  }
}

// Ejecutar el debug
debugDatabaseStructure()
  .then(() => {
    console.log('\n🎯 Debug completado')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error en debug:', error)
    process.exit(1)
  })



