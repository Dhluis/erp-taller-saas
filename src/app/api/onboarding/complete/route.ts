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
    const { logo_url, website, city, company_name } = body;
    const orgId = tenantContext.organizationId;

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Error de configuración' }, { status: 500 });
    }

    // Obtener datos actuales de la organización para usar como defaults
    const { data: org } = await (supabase
      .from('organizations')
      .select('name, address, phone, email')
      .eq('id', orgId)
      .single() as any);

    // Obtener company_settings existente (puede tener rfc ya guardado)
    const { data: existingSettings } = await (supabase
      .from('company_settings')
      .select('rfc, company_name')
      .eq('organization_id', orgId)
      .maybeSingle() as any);

    const resolvedName = company_name || existingSettings?.company_name || org?.name || '';

    // Upsert en company_settings — es aquí donde Logo.tsx y documentos leen
    const upsertData: Record<string, any> = {
      organization_id: orgId,
      company_name: resolvedName,
      rfc: existingSettings?.rfc || '',
      address: org?.address || '',
      phone: org?.phone || '',
      email: org?.email || '',
      updated_at: new Date().toISOString(),
    };
    if (logo_url !== undefined) upsertData.logo_url = logo_url;
    if (website !== undefined) upsertData.website = website;

    const { error: upsertError } = await (supabase.from('company_settings') as any)
      .upsert(upsertData, { onConflict: 'organization_id' });

    if (upsertError) {
      return NextResponse.json({ success: false, error: upsertError.message }, { status: 500 });
    }

    // También actualizar city en organizations si se proporcionó
    if (city) {
      await (supabase.from('organizations') as any)
        .update({ city, updated_at: new Date().toISOString() })
        .eq('id', orgId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error del servidor' },
      { status: 500 }
    );
  }
}
