import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getOrganizationId } from '@/lib/auth/organization-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServiceClient();
    
    // Obtener el organization_id correcto del usuario actual
    const correctOrgId = await getOrganizationId();
    console.log('🔄 [Migrate API] Organization ID correcto:', correctOrgId);
    
    // El organization_id antiguo que se usaba antes
    const oldOrgId = '042ab6bd-8979-4166-882a-c244b5e51e51';
    
    // Si son iguales, no hay nada que migrar
    if (correctOrgId === oldOrgId) {
      return NextResponse.json({
        success: true,
        message: 'El organization_id ya es correcto, no hay nada que migrar',
        ordersUpdated: 0,
      });
    }
    
    // Buscar todas las órdenes con el organization_id antiguo
    const { data: oldOrders, error: findError } = await supabase
      .from('work_orders')
      .select('id, organization_id')
      .eq('organization_id', oldOrgId);
    
    if (findError) {
      console.error('❌ [Migrate API] Error buscando órdenes antiguas:', findError);
      return NextResponse.json(
        { success: false, error: findError.message },
        { status: 500 }
      );
    }
    
    if (!oldOrders || oldOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay órdenes con organization_id antiguo',
        ordersUpdated: 0,
      });
    }
    
    console.log(`🔄 [Migrate API] Encontradas ${oldOrders.length} órdenes con organization_id antiguo`);
    
    // Actualizar todas las órdenes
    const { data: updatedOrders, error: updateError } = await supabase
      .from('work_orders')
      .update({ organization_id: correctOrgId })
      .eq('organization_id', oldOrgId)
      .select('id');
    
    if (updateError) {
      console.error('❌ [Migrate API] Error actualizando órdenes:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }
    
    const ordersUpdated = updatedOrders?.length || 0;
    console.log(`✅ [Migrate API] ${ordersUpdated} órdenes actualizadas correctamente`);
    
    return NextResponse.json({
      success: true,
      message: `Migración completada exitosamente. ${ordersUpdated} órdenes actualizadas.`,
      ordersUpdated,
      correctOrgId,
      oldOrgId,
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

