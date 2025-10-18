// ✅ CORRECTO: Script para ejecutar datos de prueba

import { createClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Ejecuta el script de datos de prueba
 */
export async function seedDatabase() {
  const supabase = await createClient();
  
  try {
    console.log('🌱 Iniciando seed de base de datos...');
    
    // Leer el archivo SQL
    const sqlPath = join(process.cwd(), 'src/lib/database/seed-data.sql');
    const sqlContent = readFileSync(sqlPath, 'utf-8');
    
    // Dividir el SQL en statements individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Ejecutando ${statements.length} statements...`);
    
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
    
    console.log('🎉 Seed de base de datos completado');
    
    // Verificar datos insertados
    await verifySeedData(supabase);
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

/**
 * Verifica que los datos se insertaron correctamente
 */
async function verifySeedData(supabase: any) {
  console.log('🔍 Verificando datos insertados...');
  
  try {
    // Verificar clientes
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id', 'first_name', 'last_name', 'email')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (customersError) {
      console.error('❌ Error verificando clientes:', customersError);
    } else {
      console.log(`✅ ${customers.length} clientes insertados`);
    }
    
    // Verificar vehículos
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id', 'make', 'model', 'license_plate')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (vehiclesError) {
      console.error('❌ Error verificando vehículos:', vehiclesError);
    } else {
      console.log(`✅ ${vehicles.length} vehículos insertados`);
    }
    
    // Verificar categorías de inventario
    const { data: categories, error: categoriesError } = await supabase
      .from('inventory_categories')
      .select('id', 'name')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (categoriesError) {
      console.error('❌ Error verificando categorías:', categoriesError);
    } else {
      console.log(`✅ ${categories.length} categorías insertadas`);
    }
    
    // Verificar artículos de inventario
    const { data: items, error: itemsError } = await supabase
      .from('inventory')
      .select('id', 'name', 'sku')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (itemsError) {
      console.error('❌ Error verificando artículos:', itemsError);
    } else {
      console.log(`✅ ${items.length} artículos insertados`);
    }
    
    // Verificar órdenes de trabajo
    const { data: workOrders, error: workOrdersError } = await supabase
      .from('work_orders')
      .select('id', 'order_number', 'status')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (workOrdersError) {
      console.error('❌ Error verificando órdenes:', workOrdersError);
    } else {
      console.log(`✅ ${workOrders.length} órdenes insertadas`);
    }
    
    // Verificar cotizaciones
    const { data: quotations, error: quotationsError } = await supabase
      .from('quotations')
      .select('id', 'quotation_number', 'status')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (quotationsError) {
      console.error('❌ Error verificando cotizaciones:', quotationsError);
    } else {
      console.log(`✅ ${quotations.length} cotizaciones insertadas`);
    }
    
    // Verificar facturas
    const { data: invoices, error: invoicesError } = await supabase
      .from('sales_invoices')
      .select('id', 'invoice_number', 'status')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (invoicesError) {
      console.error('❌ Error verificando facturas:', invoicesError);
    } else {
      console.log(`✅ ${invoices.length} facturas insertadas`);
    }
    
    // Verificar pagos
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('id', 'amount', 'payment_method')
      .eq('organization_id', '00000000-0000-0000-0000-000000000001');
    
    if (paymentsError) {
      console.error('❌ Error verificando pagos:', paymentsError);
    } else {
      console.log(`✅ ${payments.length} pagos insertados`);
    }
    
    console.log('🎉 Verificación completada');
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  }
}

/**
 * Limpia los datos de prueba
 */
export async function cleanSeedData() {
  const supabase = await createClient();
  
  try {
    console.log('🧹 Limpiando datos de prueba...');
    
    // Eliminar en orden inverso para respetar las foreign keys
    const tables = [
      'payments',
      'sales_invoices',
      'quotations',
      'work_orders',
      'inventory',
      'inventory_categories',
      'vehicles',
      'customers'
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
    
    console.log('🎉 Limpieza completada');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

/**
 * Ejecuta el seed si se llama directamente
 */
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seed completado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en seed:', error);
      process.exit(1);
    });
}