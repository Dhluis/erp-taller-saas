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

    // Verificar si ya existe una fila en company_settings
    const { data: existing } = await (supabase
      .from('company_settings')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle() as any);

    const isWebsiteColumnError = (msg: string) =>
      msg.includes("'website'") || msg.toLowerCase().includes('website');

    if (existing) {
      // Fila existente: solo actualizar los campos que el wizard provee
      const updates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (company_name) updates.company_name = company_name;
      if (logo_url)     updates.logo_url = logo_url;
      if (website)      updates.website = website;

      let { error } = await (supabase
        .from('company_settings') as any)
        .update(updates)
        .eq('organization_id', orgId);

      // Si la columna website no existe en la BD, reintentar sin ella
      if (error && isWebsiteColumnError(error.message)) {
        delete updates.website;
        const retry = await (supabase.from('company_settings') as any)
          .update(updates)
          .eq('organization_id', orgId);
        error = retry.error;
      }

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    } else {
      // Sin fila: crear una nueva usando datos de la organización como defaults
      const { data: org } = await (supabase
        .from('organizations')
        .select('name, address, phone, email')
        .eq('id', orgId)
        .single() as any);

      const insertData: Record<string, any> = {
        organization_id: orgId,
        company_name:       company_name || org?.name || '',
        tax_id:             null,
        address:            org?.address || '',
        phone:              org?.phone   || '',
        email:              org?.email   || null,
        currency:           'MXN',
        base_currency:      'MXN',
        tax_rate:           16,
        working_hours:      {},
        appointment_defaults: {},
        created_at:         new Date().toISOString(),
        updated_at:         new Date().toISOString(),
      };
      if (logo_url) insertData.logo_url = logo_url;
      if (website)  insertData.website  = website;

      let { error } = await (supabase.from('company_settings') as any)
        .insert(insertData);

      // Si la columna website no existe en la BD, reintentar sin ella
      if (error && isWebsiteColumnError(error.message)) {
        delete insertData.website;
        const retry = await (supabase.from('company_settings') as any)
          .insert(insertData);
        error = retry.error;
      }

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    // Actualizar city en organizations si se proporcionó
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
