// ✅ CORRECTO: Script para ejecutar datos de inventario

import { createClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Ejecuta el script de datos de inventario
 */
export async function seedInventoryData() {
  const supabase = await createClient();
  
  try {
    console.log('🌱 Iniciando seed de datos de inventario...');
    
    // Leer el archivo SQL
    const sqlPath = join(process.cwd(), 'src/lib/database/seed-inventory.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    // Dividir el SQL en statements individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Ejecutando ${statements.length} statements de inventario...`);
    
    // Ejecutar cada statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.error(`❌ Error en statement ${i + 1}:`, error);
            // Continuar con el siguiente statement
            continue;
          }
          
          console.log(`✅ Statement ${i + 1} ejecutado correctamente`);
        } catch (err) {
          console.error(`❌ Error ejecutando statement ${i + 1}:`, err);
          // Continuar con el siguiente statement
          continue;
        }
      }
    }
    
    console.log('🎉 Seed de inventario completado');
    
    // Verificar datos insertados
    await verifyInventoryData(supabase);
    
  } catch (error) {
    console.error('❌ Error durante el seed de inventario:', error);
    throw error;
  }
}

/**
 * Verifica que los datos de inventario se insertaron correctamente
 */
async function verifyInventoryData(supabase: any) {
  console.log('🔍 Verificando datos de inventario insertados...');
  
  try {
    // Verificar artículos de inventario
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id', 'name', 'sku', 'item_type', 'quantity')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (itemsError) {
      console.error('❌ Error verificando artículos:', itemsError);
    } else {
      console.log(`✅ ${items.length} artículos de inventario insertados`);
      
      // Mostrar algunos artículos
      const products = items.filter(item => item.item_type === 'product');
      const services = items.filter(item => item.item_type === 'service');
      
      console.log(`   - ${products.length} productos`);
      console.log(`   - ${services.length} servicios`);
    }
    
    // Verificar movimientos de inventario
    const { data: movements, error: movementsError } = await supabase
      .from('inventory_movements')
      .select('id', 'movement_type', 'quantity', 'total_cost')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (movementsError) {
      console.error('❌ Error verificando movimientos:', movementsError);
    } else {
      console.log(`✅ ${movements.length} movimientos de inventario insertados`);
      
      // Mostrar resumen de movimientos
      const movementsByType = movements.reduce((acc: any, movement: any) => {
        acc[movement.movement_type] = (acc[movement.movement_type] || 0) + 1;
        return acc;
      }, {});
      
      console.log('   - Movimientos por tipo:', movementsByType);
    }
    
    // Verificar categorías de inventario
    const { data: categories, error: categoriesError } = await supabase
      .from('inventory_categories')
      .select('id', 'name')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (categoriesError) {
      console.error('❌ Error verificando categorías:', categoriesError);
    } else {
      console.log(`✅ ${categories.length} categorías de inventario insertadas`);
    }
    
    // Verificar productos con stock bajo
    const { data: lowStockItems, error: lowStockError } = await supabase
      .from('inventory_items')
      .select('name', 'quantity', 'minimum_stock')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001')
      .eq('item_type', 'product')
      .lt('quantity', 'minimum_stock');
    
    if (lowStockError) {
      console.error('❌ Error verificando stock bajo:', lowStockError);
    } else {
      if (lowStockItems.length > 0) {
        console.log(`⚠️ ${lowStockItems.length} productos con stock bajo:`);
        lowStockItems.forEach((item: any) => {
          console.log(`   - ${item.name}: ${item.quantity}/${item.minimum_stock}`);
        });
      } else {
        console.log('✅ Todos los productos tienen stock suficiente');
      }
    }
    
    // Verificar servicios disponibles
    const { data: services, error: servicesError } = await supabase
      .from('inventory_items')
      .select('name', 'unit_price', 'category')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001')
      .eq('item_type', 'service');
    
    if (servicesError) {
      console.error('❌ Error verificando servicios:', servicesError);
    } else {
      console.log(`✅ ${services.length} servicios disponibles`);
    }
    
    console.log('🎉 Verificación de inventario completada');
    
  } catch (error) {
    console.error('❌ Error durante la verificación de inventario:', error);
  }
}

/**
 * Limpia los datos de inventario
 */
export async function cleanInventoryData() {
  const supabase = await createClient();
  
  try {
    console.log('🧹 Limpiando datos de inventario...');
    
    // Eliminar en orden inverso para respetar las foreign keys
    const tables = [
      'inventory_movements',
      'inventory_items',
      'inventory_categories'
    ];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', '00000000-0000-0000-0000-000000000001');
      
      if (error) {
        console.error(`❌ Error limpiando ${table}:`, error);
      } else {
        console.log(`✅ ${table} limpiado`);
      }
    }
    
    console.log('🎉 Limpieza de inventario completada');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza de inventario:', error);
  }
}

/**
 * Ejecuta el seed de inventario si se llama directamente
 */
if (require.main === module) {
  seedInventoryData()
    .then(() => {
      console.log('✅ Seed de inventario completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en seed de inventario:', error);
      process.exit(1);
    });
}

















