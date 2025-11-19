/**
 * Script de migración para actualizar el organization_id de órdenes antiguas
 * 
 * Este script actualiza todas las órdenes que tienen el organization_id antiguo
 * para que tengan el organization_id correcto del usuario actual.
 * 
 * ⚠️ EJECUTAR SOLO UNA VEZ después de verificar que el organization_id es correcto
 */

import { getSupabaseClient } from '@/lib/supabase/client';
import { getOrganizationId } from '@/lib/auth/organization-client';

/**
 * Migra las órdenes antiguas al organization_id correcto
 * @returns Número de órdenes actualizadas
 */
export async function migrateOrdersOrganizationId(): Promise<number> {
  const supabase = getSupabaseClient();
  
  try {
    // Obtener el organization_id correcto del usuario actual
    const correctOrgId = await getOrganizationId();
    console.log('🔄 [migrateOrders] Organization ID correcto:', correctOrgId);
    
    // El organization_id antiguo que se usaba antes
    const oldOrgId = '042ab6bd-8979-4166-882a-c244b5e51e51';
    
    // Si son iguales, no hay nada que migrar
    if (correctOrgId === oldOrgId) {
      console.log('✅ [migrateOrders] El organization_id ya es correcto, no hay nada que migrar');
      return 0;
    }
    
    // Buscar todas las órdenes con el organization_id antiguo
    const { data: oldOrders, error: findError } = await supabase
      .from('work_orders')
      .select('id, organization_id')
      .eq('organization_id', oldOrgId);
    
    if (findError) {
      console.error('❌ [migrateOrders] Error buscando órdenes antiguas:', findError);
      throw findError;
    }
    
    if (!oldOrders || oldOrders.length === 0) {
      console.log('✅ [migrateOrders] No hay órdenes con organization_id antiguo');
      return 0;
    }
    
    console.log(`🔄 [migrateOrders] Encontradas ${oldOrders.length} órdenes con organization_id antiguo`);
    
    // Actualizar todas las órdenes
    const { data: updatedOrders, error: updateError } = await supabase
      .from('work_orders')
      .update({ organization_id: correctOrgId })
      .eq('organization_id', oldOrgId)
      .select('id');
    
    if (updateError) {
      console.error('❌ [migrateOrders] Error actualizando órdenes:', updateError);
      throw updateError;
    }
    
    console.log(`✅ [migrateOrders] ${updatedOrders?.length || 0} órdenes actualizadas correctamente`);
    
    return updatedOrders?.length || 0;
  } catch (error) {
    console.error('❌ [migrateOrders] Error en migración:', error);
    throw error;
  }
}

