import { NextRequest, NextResponse } from 'next/server';
/**
 * API Route para Configuración de Empresa
 * GET: obtener configuración de la organización
 * PUT: actualizar configuración (solo ADMIN — antes se escribía directo desde
 *      el navegador a Supabase sin ningún control de rol server-side)
 */

import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { hasPermission, UserRole } from '@/lib/auth/permissions';

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    if (!hasPermission(tenantContext.role as UserRole, 'settings', 'read')) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para ver la configuración de la empresa' },
        { status: 403 }
      );
    }

    const supabaseAdmin = getSupabaseServiceClient();
    const { data, error } = await supabaseAdmin
      .from('company_settings')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext || !tenantContext.organizationId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    if (!hasPermission(tenantContext.role as UserRole, 'settings', 'update')) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para modificar la configuración de la empresa' },
        { status: 403 }
      );
    }

    const body = await request.json();
    // organization_id siempre del usuario autenticado, nunca del body
    const { organization_id: _ignored, id: _ignoredId, created_at, updated_at, ...settingsData } = body;

    const supabaseAdmin = getSupabaseServiceClient();
    const { data, error } = await supabaseAdmin
      .from('company_settings')
      .upsert(
        { ...settingsData, organization_id: tenantContext.organizationId },
        { onConflict: 'organization_id', ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}
