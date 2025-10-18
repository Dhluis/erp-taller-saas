import { createClient } from '@/lib/supabase/server';

/**
 * Seed simplificado para datos de prueba
 */
export async function seedDatabase() {
  const supabase = await createClient();
  
  try {
    console.log('🌱 Iniciando seed de base de datos...');
    
    const organizationId = '00000000-0000-0000-0000-000000000001';
    
    // 1. Insertar clientes
    console.log('📝 Insertando clientes...');
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .insert([
        {
          organization_id: organizationId,
          name: 'Juan Pérez García',
          email: 'juan.perez@email.com',
          phone: '4491234567',
          address: 'Av. Tecnológico #123',
          notes: 'Cliente frecuente, prefiere servicio express'
        },
        {
          organization_id: organizationId,
          name: 'María González López',
          email: 'maria.gonzalez@email.com',
          phone: '4491234568',
          address: 'Blvd. Zacatecas Norte #456',
          notes: 'Puntual con sus pagos'
        },
        {
          organization_id: organizationId,
          name: 'Carlos Martínez Ruiz',
          email: 'carlos.martinez@email.com',
          phone: '4491234569',
          address: 'Av. Convención #789'
        }
      ])
      .select();
    
    if (customersError) {
      console.error('❌ Error insertando clientes:', customersError);
    } else {
      console.log(`✅ ${customers.length} clientes insertados`);
    }
    
    // 2. Insertar categorías de inventario
    console.log('📝 Insertando categorías...');
    const { data: categories, error: categoriesError } = await supabase
      .from('inventory_categories')
      .insert([
        {
          organization_id: organizationId,
          name: 'Lubricantes',
          description: 'Aceites y lubricantes para motor'
        },
        {
          organization_id: organizationId,
          name: 'Filtros',
          description: 'Filtros de aceite, aire y combustible'
        },
        {
          organization_id: organizationId,
          name: 'Frenos',
          description: 'Pastillas, discos y líquido de frenos'
        }
      ])
      .select();
    
    if (categoriesError) {
      console.error('❌ Error insertando categorías:', categoriesError);
    } else {
      console.log(`✅ ${categories.length} categorías insertadas`);
    }
    
    // 3. Insertar artículos de inventario
    console.log('📝 Insertando artículos...');
    const { data: items, error: itemsError } = await supabase
      .from('inventory')
      .insert([
        {
          organization_id: organizationId,
          name: 'Aceite Motor 5W-30',
          description: 'Aceite sintético para motor 5W-30, 1L',
          sku: 'PROD-001',
          code: 'ACE-001',
          quantity: 45,
          min_quantity: 10,
          unit_price: 250.00,
          category: 'Lubricantes',
          status: 'active'
        },
        {
          organization_id: organizationId,
          name: 'Filtro de Aceite',
          description: 'Filtro de aceite universal',
          sku: 'PROD-002',
          code: 'FIL-001',
          quantity: 32,
          min_quantity: 15,
          unit_price: 85.00,
          category: 'Filtros',
          status: 'active'
        }
      ])
      .select();
    
    if (itemsError) {
      console.error('❌ Error insertando artículos:', itemsError);
    } else {
      console.log(`✅ ${items.length} artículos insertados`);
    }
    
    console.log('🎉 Seed de base de datos completado');
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

/**
 * Limpia los datos de prueba
 */
export async function cleanSeedData() {
  const supabase = await createClient();
  
  try {
    console.log('🧹 Limpiando datos de prueba...');
    
    const organizationId = '00000000-0000-0000-0000-000000000001';
    
    // Eliminar en orden inverso para respetar las foreign keys
    const tables = [
      'inventory',
      'inventory_categories',
      'customers'
    ];
    
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('organization_id', organizationId);
      
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
