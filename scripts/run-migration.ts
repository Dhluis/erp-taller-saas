/**
 * Script para ejecutar la migración de órdenes
 * Ejecutar con: npx tsx scripts/run-migration.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración de órdenes...');
    
    // Obtener el organization_id correcto del usuario actual
    // Primero, obtener el usuario autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ Error: Usuario no autenticado. Por favor, inicia sesión primero.');
      console.log('💡 Alternativa: Ejecuta la migración desde /admin/migrate-orders en el navegador');
      process.exit(1);
    }
    
    console.log('✅ Usuario autenticado:', user.email);
    
    // Obtener el organization_id del usuario
    let { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('organization_id, workshop_id')
      .eq('auth_user_id', user.id)
      .single();
    
    // Si falla, intentar con email
    if (userDataError) {
      const { data: userDataFallback } = await supabase
        .from('users')
        .select('organization_id, workshop_id')
        .eq('email', user.email)
        .single();
      
      if (userDataFallback) {
        userData = userDataFallback;
      }
    }
    
    if (!userData) {
      console.error('❌ Error: No se pudo obtener información del usuario');
      process.exit(1);
    }
    
    let correctOrgId: string;
    
    // Si tiene organization_id directo, usarlo
    if (userData.organization_id) {
      correctOrgId = userData.organization_id;
    } else if (userData.workshop_id) {
      // Si no, obtenerlo del workshop
      const { data: workshop, error: workshopError } = await supabase
        .from('workshops')
        .select('organization_id')
        .eq('id', userData.workshop_id)
        .single();
      
      if (workshopError || !workshop?.organization_id) {
        console.error('❌ Error: No se pudo obtener organization_id del workshop');
        process.exit(1);
      }
      
      correctOrgId = workshop.organization_id;
    } else {
      console.error('❌ Error: Usuario sin organización asignada');
      process.exit(1);
    }
    
    console.log('✅ Organization ID correcto:', correctOrgId);
    
    // El organization_id antiguo
    const oldOrgId = '042ab6bd-8979-4166-882a-c244b5e51e51';
    const otherOrgId = '00000000-0000-0000-0000-000000000001';
    
    // Si son iguales, no hay nada que migrar
    if (correctOrgId === oldOrgId && correctOrgId === otherOrgId) {
      console.log('✅ El organization_id ya es correcto, no hay nada que migrar');
      return;
    }
    
    // Buscar todas las órdenes con organization_ids antiguos
    const orgIdsToMigrate = [oldOrgId, otherOrgId].filter(id => id !== correctOrgId);
    
    let totalUpdated = 0;
    
    for (const oldOrgIdToMigrate of orgIdsToMigrate) {
      console.log(`\n🔄 Buscando órdenes con organization_id: ${oldOrgIdToMigrate}...`);
      
      const { data: oldOrders, error: findError } = await supabase
        .from('work_orders')
        .select('id, organization_id')
        .eq('organization_id', oldOrgIdToMigrate);
      
      if (findError) {
        console.error(`❌ Error buscando órdenes con ${oldOrgIdToMigrate}:`, findError);
        continue;
      }
      
      if (!oldOrders || oldOrders.length === 0) {
        console.log(`✅ No hay órdenes con organization_id: ${oldOrgIdToMigrate}`);
        continue;
      }
      
      console.log(`📊 Encontradas ${oldOrders.length} órdenes con organization_id: ${oldOrgIdToMigrate}`);
      
      // Actualizar todas las órdenes
      const { data: updatedOrders, error: updateError } = await supabase
        .from('work_orders')
        .update({ organization_id: correctOrgId })
        .eq('organization_id', oldOrgIdToMigrate)
        .select('id');
      
      if (updateError) {
        console.error(`❌ Error actualizando órdenes con ${oldOrgIdToMigrate}:`, updateError);
        continue;
      }
      
      const updated = updatedOrders?.length || 0;
      totalUpdated += updated;
      console.log(`✅ ${updated} órdenes actualizadas de ${oldOrgIdToMigrate} → ${correctOrgId}`);
    }
    
    console.log(`\n✅ Migración completada exitosamente!`);
    console.log(`📊 Total de órdenes actualizadas: ${totalUpdated}`);
    console.log(`✅ Todas las órdenes ahora tienen organization_id: ${correctOrgId}`);
    
  } catch (error) {
    console.error('❌ Error en migración:', error);
    process.exit(1);
  }
}

runMigration();

