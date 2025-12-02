import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/auth/organization-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServiceClient();
    
    const correctOrgId = await getOrganizationId(request);
    console.log('🔄 [Migrate Customers API] Organization ID correcto:', correctOrgId);
    
    const oldOrgIds = [
      '042ab6bd-8979-4166-882a-c244b5e51e51',
      '00000000-0000-0000-0000-000000000001',
    ].filter(id => id !== correctOrgId);
    
    if (oldOrgIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'El organization_id ya es correcto, no hay nada que migrar',
        customersUpdated: 0,
      });
    }
    
    let totalUpdated = 0;
    const migrationResults: Array<{ oldOrgId: string; updated: number }> = [];
    
    for (const oldOrgId of oldOrgIds) {
      console.log(`🔄 [Migrate Customers API] Buscando clientes con organization_id: ${oldOrgId}...`);
      
      const { data: oldCustomers, error: findError } = await supabase
        .from('customers')
        .select('id, organization_id')
        .eq('organization_id', oldOrgId);
      
      if (findError) {
        console.error(`❌ [Migrate Customers API] Error buscando clientes con ${oldOrgId}:`, findError);
        continue;
      }
      
      if (!oldCustomers || oldCustomers.length === 0) {
        console.log(`✅ [Migrate Customers API] No hay clientes con organization_id: ${oldOrgId}`);
        continue;
      }
      
      console.log(`📊 [Migrate Customers API] Encontrados ${oldCustomers.length} clientes con organization_id: ${oldOrgId}`);
      
      const { data: updatedCustomers, error: updateError } = await supabase
        .from('customers')
        .update({ organization_id: correctOrgId })
        .eq('organization_id', oldOrgId)
        .select('id');
      
      if (updateError) {
        console.error(`❌ [Migrate Customers API] Error actualizando clientes con ${oldOrgId}:`, updateError);
        continue;
      }
      
      const updated = updatedCustomers?.length || 0;
      totalUpdated += updated;
      migrationResults.push({ oldOrgId, updated });
      console.log(`✅ [Migrate Customers API] ${updated} clientes actualizados de ${oldOrgId} → ${correctOrgId}`);
    }
    
    console.log(`✅ [Migrate Customers API] Migración completada. Total: ${totalUpdated} clientes actualizados`);
    
    return NextResponse.json({
      success: true,
      message: `Migración completada exitosamente. ${totalUpdated} clientes actualizados.`,
      customersUpdated: totalUpdated,
      correctOrgId,
      migrationResults,
    });
  } catch (error) {
    console.error('❌ [Migrate Customers API] Error en migración:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido durante la migración',
      },
      { status: 500 }
    );
  }
}

