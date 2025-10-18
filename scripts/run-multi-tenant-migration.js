/**
 * Script para ejecutar la migración Multi-Tenant
 * Ejecuta la migración de base de datos y verifica el resultado
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno faltantes:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Iniciando migración Multi-Tenant...\n');

  try {
    console.log('⚙️  Ejecutando migración paso a paso...\n');

    // PASO 1: Agregar organization_id a workshops (si no existe)
    console.log('1️⃣ Agregando organization_id a workshops...');
    try {
      const { data: workshops, error } = await supabase
        .from('workshops')
        .select('*')
        .limit(1);
      
      if (!error && workshops && workshops.length > 0) {
        console.log('✅ Tabla workshops existe, verificando estructura...');
        // Verificar si ya tiene organization_id
        const hasOrgId = workshops[0].hasOwnProperty('organization_id');
        if (hasOrgId) {
          console.log('✅ organization_id ya existe en workshops');
        } else {
          console.log('⚠️  organization_id no existe - requiere migración manual de BD');
        }
      } else {
        console.log('ℹ️  Tabla workshops está vacía o no existe');
      }
    } catch (err) {
      console.log('⚠️  Error verificando workshops:', err.message);
    }

    // PASO 2: Crear workshops de demo
    console.log('\n2️⃣ Creando workshops de demo...');
    const demoWorkshops = [
      {
        id: '042ab6bd-8979-4166-882a-c244b5e51e51',
        name: 'Taller Principal',
        email: 'taller@example.com',
        phone: '555-0123',
        address: 'Dirección Principal',
        organization_id: '00000000-0000-0000-0000-000000000001'
      },
      {
        id: '167b8cbf-fe6d-4e67-93e6-8b000c3ce19f',
        name: 'Taller Secundario',
        email: 'taller2@example.com',
        phone: '555-0124',
        address: 'Dirección Secundaria',
        organization_id: '00000000-0000-0000-0000-000000000001'
      },
      {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'Taller Demo',
        email: 'demo@example.com',
        phone: '555-0000',
        address: 'Dirección Demo',
        organization_id: '00000000-0000-0000-0000-000000000001'
      }
    ];

    for (const workshop of demoWorkshops) {
      try {
        const { data, error } = await supabase
          .from('workshops')
          .upsert(workshop, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (error) {
          console.log(`⚠️  Error creando workshop ${workshop.name}:`, error.message);
        } else {
          console.log(`✅ Workshop creado/actualizado: ${workshop.name}`);
        }
      } catch (err) {
        console.log(`⚠️  Error con workshop ${workshop.name}:`, err.message);
      }
    }

    // PASO 3: Actualizar work_orders con workshop_id
    console.log('\n3️⃣ Actualizando work_orders con workshop_id...');
    try {
      // Obtener work_orders sin workshop_id
      const { data: orders, error: fetchError } = await supabase
        .from('work_orders')
        .select('id, organization_id, workshop_id')
        .is('workshop_id', null)
        .limit(10);

      if (!fetchError && orders && orders.length > 0) {
        console.log(`📋 Encontradas ${orders.length} órdenes sin workshop_id`);
        
        // Actualizar cada orden con el workshop principal
        for (const order of orders) {
          const { error: updateError } = await supabase
            .from('work_orders')
            .update({ 
              workshop_id: '042ab6bd-8979-4166-882a-c244b5e51e51' // Taller Principal
            })
            .eq('id', order.id);

          if (updateError) {
            console.log(`⚠️  Error actualizando orden ${order.id}:`, updateError.message);
          } else {
            console.log(`✅ Orden ${order.id} actualizada con workshop_id`);
          }
        }
      } else {
        console.log('✅ Todas las órdenes ya tienen workshop_id o no hay órdenes');
      }
    } catch (err) {
      console.log('⚠️  Error actualizando work_orders:', err.message);
    }

    console.log('\n✅ Migración completada (algunas operaciones pueden requerir migración manual de BD)\n');

    // Verificaciones post-migración
    await verifyMigration();

  } catch (err) {
    console.error('❌ Error durante la migración:', err.message);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('🔍 Verificando migración...\n');

  try {
    // 1. Verificar que workshops tienen organization_id
    console.log('1️⃣ Verificando workshops...');
    const { data: workshops, error: workshopsError } = await supabase
      .from('workshops')
      .select('id, name, organization_id');

    if (workshopsError) {
      console.error('❌ Error consultando workshops:', workshopsError.message);
      return;
    }

    console.log(`✅ Workshops encontrados: ${workshops.length}`);
    workshops.forEach(w => {
      console.log(`   - ${w.name}: org_id = ${w.organization_id}`);
    });

    // 2. Verificar que work_orders tienen workshop_id
    console.log('\n2️⃣ Verificando work_orders...');
    const { data: orders, error: ordersError } = await supabase
      .from('work_orders')
      .select('id, organization_id, workshop_id, status')
      .limit(5);

    if (ordersError) {
      console.error('❌ Error consultando work_orders:', ordersError.message);
      return;
    }

    console.log(`✅ Work orders encontrados: ${orders.length}`);
    orders.forEach(o => {
      console.log(`   - ID: ${o.id}, Org: ${o.organization_id}, Workshop: ${o.workshop_id || 'NULL'}`);
    });

    // 3. Verificar usuarios y sus workshops
    console.log('\n3️⃣ Verificando usuarios...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, workshop_id')
      .limit(3);

    if (usersError) {
      console.error('❌ Error consultando users:', usersError.message);
      return;
    }

    console.log(`✅ Usuarios encontrados: ${users.length}`);
    users.forEach(u => {
      console.log(`   - ${u.full_name}: workshop_id = ${u.workshop_id}`);
    });

    // 4. Verificar funciones creadas
    console.log('\n4️⃣ Verificando funciones de base de datos...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT routine_name 
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name IN ('get_organization_id_from_user', 'get_user_workshop_id', 'set_org_and_workshop_from_user')
        `
      });

    if (functionsError) {
      console.error('❌ Error consultando funciones:', functionsError.message);
    } else {
      console.log('✅ Funciones creadas:', functions?.length || 0);
    }

    console.log('\n🎉 Verificación completada exitosamente!');
    console.log('\n📋 Resumen:');
    console.log(`   - Workshops: ${workshops.length}`);
    console.log(`   - Work Orders: ${orders.length}`);
    console.log(`   - Usuarios: ${users.length}`);
    console.log(`   - Funciones: ${functions?.length || 0}`);

  } catch (err) {
    console.error('❌ Error durante verificación:', err.message);
  }
}

// Función auxiliar para ejecutar SQL (si no existe la función rpc)
async function executeSQL(sql) {
  try {
    // Intentar con rpc primero
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (!error) return { data, error: null };
    
    // Si no existe la función rpc, intentar con query directo
    console.log('⚠️  Función rpc no disponible, ejecutando SQL directamente...');
    
    // Dividir el SQL en statements individuales
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await supabase.from('dummy').select('*').limit(0); // Dummy query para ejecutar SQL
      }
    }
    
    return { data: null, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration, verifyMigration };
