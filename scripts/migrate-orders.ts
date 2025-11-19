/**
 * Script para migrar órdenes antiguas al organization_id correcto
 * 
 * Ejecutar con: npx tsx scripts/migrate-orders.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateOrders() {
  try {
    console.log('🔄 Iniciando migración de órdenes...');
    
    // El organization_id antiguo
    const oldOrgId = '042ab6bd-8979-4166-882a-c244b5e51e51';
    
    // El organization_id correcto (obtener del usuario actual o configurar manualmente)
    // Por ahora, vamos a usar el que está en los logs: 042ab6bd-8979-4166-882a-c244b5e51e51
    // Pero necesitamos verificar cuál es el correcto del usuario actual
    
    // Primero, buscar todas las órdenes con el organization_id antiguo
    const { data: oldOrders, error: findError } = await supabase
      .from('work_orders')
      .select('id, organization_id, created_at')
      .eq('organization_id', oldOrgId)
      .limit(100);
    
    if (findError) {
      console.error('❌ Error buscando órdenes antiguas:', findError);
      return;
    }
    
    if (!oldOrders || oldOrders.length === 0) {
      console.log('✅ No hay órdenes con organization_id antiguo');
      return;
    }
    
    console.log(`📊 Encontradas ${oldOrders.length} órdenes con organization_id antiguo`);
    
    // Obtener el organization_id correcto de la primera orden nueva
    const { data: newOrders } = await supabase
      .from('work_orders')
      .select('organization_id')
      .neq('organization_id', oldOrgId)
      .limit(1)
      .single();
    
    if (!newOrders) {
      console.error('❌ No se pudo determinar el organization_id correcto');
      return;
    }
    
    const correctOrgId = newOrders.organization_id;
    console.log(`✅ Organization ID correcto detectado: ${correctOrgId}`);
    
    if (correctOrgId === oldOrgId) {
      console.log('✅ El organization_id ya es correcto, no hay nada que migrar');
      return;
    }
    
    // Actualizar todas las órdenes
    console.log('🔄 Actualizando órdenes...');
    const { data: updatedOrders, error: updateError } = await supabase
      .from('work_orders')
      .update({ organization_id: correctOrgId })
      .eq('organization_id', oldOrgId)
      .select('id');
    
    if (updateError) {
      console.error('❌ Error actualizando órdenes:', updateError);
      return;
    }
    
    console.log(`✅ ${updatedOrders?.length || 0} órdenes actualizadas correctamente`);
    console.log('✅ Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error en migración:', error);
  }
}

migrateOrders();

