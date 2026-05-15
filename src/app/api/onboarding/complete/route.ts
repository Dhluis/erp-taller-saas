import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext?.organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { logo_url, website, city } = body;

    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (website !== undefined) updates.website = website;
    if (city !== undefined) updates.city = city;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Error de configuración' }, { status: 500 });
    }

    const { error } = await (supabase.from('organizations') as any)
      .update(updates)
      .eq('id', tenantContext.organizationId);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error del servidor' },
      { status: 500 }
    );
  }
}
