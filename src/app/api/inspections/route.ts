import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const body = await request.json();

    const { error } = await supabase
      .from('vehicle_inspections')
      .insert({
        order_id: body.order_id,
        organization_id: body.organization_id,
        fluids_check: body.fluids_check,
        fuel_level: body.fuel_level,
        valuable_items: body.valuable_items,
        will_diagnose: body.will_diagnose,
        entry_reason: body.entry_reason,
        procedures: body.procedures,
        is_warranty: body.is_warranty,
        authorize_test_drive: body.authorize_test_drive,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving inspection:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar inspección' },
      { status: 500 }
    );
  }
}

