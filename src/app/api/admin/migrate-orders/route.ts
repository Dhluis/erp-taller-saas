import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/auth/organization-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServiceClient();
    
    // Obtener el organization_id correcto del usuario actual
    const correctOrgId = await getOrganizationId(request);
    console.log('🔄 [Migrate API] Organization ID correcto:', correctOrgId);
    
    // Los organization_ids antiguos que se usaban antes
    const oldOrgIds = [
      '042ab6bd-8979-4166-882a-c244b5e51e51',
      '00000000-0000-0000-0000-000000000001',
    ].filter(id => id !== correctOrgId); // Excluir el correcto si está en la lista
    
    if (oldOrgIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'El organization_id ya es correcto, no hay nada que migrar',
        ordersUpdated: 0,
      });
    }
    
    let totalUpdated = 0;
    const migrationResults: Array<{ oldOrgId: string; updated: number }> = [];
    
    // Migrar órdenes con cada organization_id antiguo
    for (const oldOrgId of oldOrgIds) {
      console.log(`🔄 [Migrate API] Buscando órdenes con organization_id: ${oldOrgId}...`);
      
      // Buscar todas las órdenes con este organization_id antiguo
      const { data: oldOrders, error: findError } = await supabase
        .from('work_orders')
        .select('id, organization_id')
        .eq('organization_id', oldOrgId);
      
      if (findError) {
        console.error(`❌ [Migrate API] Error buscando órdenes con ${oldOrgId}:`, findError);
        continue;
      }
      
      if (!oldOrders || oldOrders.length === 0) {
        console.log(`✅ [Migrate API] No hay órdenes con organization_id: ${oldOrgId}`);
        continue;
      }
      
      console.log(`📊 [Migrate API] Encontradas ${oldOrders.length} órdenes con organization_id: ${oldOrgId}`);
      
      // Actualizar todas las órdenes
      const { data: updatedOrders, error: updateError } = await supabase
        .from('work_orders')
        .update({ organization_id: correctOrgId })
        .eq('organization_id', oldOrgId)
        .select('id');
      
      if (updateError) {
        console.error(`❌ [Migrate API] Error actualizando órdenes con ${oldOrgId}:`, updateError);
        continue;
      }
      
      const updated = updatedOrders?.length || 0;
      totalUpdated += updated;
      migrationResults.push({ oldOrgId, updated });
      console.log(`✅ [Migrate API] ${updated} órdenes actualizadas de ${oldOrgId} → ${correctOrgId}`);
    }
    
    console.log(`✅ [Migrate API] Migración completada. Total: ${totalUpdated} órdenes actualizadas`);
    
    return NextResponse.json({
      success: true,
      message: `Migración completada exitosamente. ${totalUpdated} órdenes actualizadas.`,
      ordersUpdated: totalUpdated,
      correctOrgId,
      migrationResults,
    });
  } catch (error) {
    console.error('❌ [Migrate API] Error en migración:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido durante la migración',
      },
      { status: 500 }
    );
  }
}

