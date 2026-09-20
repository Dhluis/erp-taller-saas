import { NextRequest, NextResponse } from 'next/server';
/**
 * API Route para la bandeja de WhatsApp
 * GET: listar conversaciones de la organización
 */

import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { hasPermission, UserRole } from '@/lib/auth/permissions';
import { applyWorkshopScope } from '@/lib/auth/workshop-scope';
import { extractPaginationFromURL, calculateOffset, generatePaginationMeta } from '@/lib/utils/pagination';

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext(request);
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    if (!hasPermission(tenantContext.role as UserRole, 'whatsapp', 'read')) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para ver la bandeja de WhatsApp' }, { status: 403 });
    }

    const url = new URL(request.url);
    const { searchParams } = url;
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo'); // 'me' | 'unassigned' | uuid de users.id
    const search = searchParams.get('search');
    const { page, pageSize } = extractPaginationFromURL(url);

    const supabaseAdmin = getSupabaseServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Servicio no disponible' }, { status: 500 });
    }

    // Resolver users.id del usuario actual, solo si hace falta para 'assignedTo=me'
    let currentUsersId: string | null = null;
    if (assignedTo === 'me') {
      const { data: profile } = await (supabaseAdmin as any)
        .from('users')
        .select('id')
        .eq('auth_user_id', tenantContext.userId)
        .maybeSingle();
      currentUsersId = profile?.id || null;
    }

    let query = applyWorkshopScope(
      supabaseAdmin
        .from('whatsapp_conversations')
        .select('*', { count: 'exact' })
        .eq('organization_id', tenantContext.organizationId)
        .order('last_message_at', { ascending: false }),
      tenantContext
    );

    if (status) {
      query = query.eq('status', status);
    }
    if (assignedTo === 'unassigned') {
      query = query.is('assigned_to_user_id', null);
    } else if (assignedTo === 'me' && currentUsersId) {
      query = query.eq('assigned_to_user_id', currentUsersId);
    } else if (assignedTo && assignedTo !== 'me') {
      query = query.eq('assigned_to_user_id', assignedTo);
    }
    if (search && search.trim()) {
      const term = search.trim();
      query = query.or(`customer_name.ilike.%${term}%,customer_phone.ilike.%${term}%`);
    }

    const offset = calculateOffset(page, pageSize);
    query = query.range(offset, offset + pageSize - 1);

    const { data: conversations, count, error } = await query;

    if (error) {
      console.error('[GET /api/whatsapp/conversations] Error:', error);
      return NextResponse.json({ success: false, error: 'Error al obtener conversaciones' }, { status: 500 });
    }

    const pagination = generatePaginationMeta(page, pageSize, count || 0);

    return NextResponse.json({
      success: true,
      data: { items: conversations || [], pagination },
    });
  } catch (error) {
    console.error('[GET /api/whatsapp/conversations] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al obtener conversaciones' },
      { status: 500 }
    );
  }
}
