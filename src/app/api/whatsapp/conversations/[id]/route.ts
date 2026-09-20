import { NextRequest, NextResponse } from 'next/server';
/**
 * API Route para una conversación específica de WhatsApp
 * GET: detalle + mensajes
 * PATCH: asignar a un usuario del equipo / cambiar estado
 */

import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { hasPermission, UserRole } from '@/lib/auth/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantContext = await getTenantContext(request);
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    if (!hasPermission(tenantContext.role as UserRole, 'whatsapp', 'read')) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para ver esta conversación' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Servicio no disponible' }, { status: 500 });
    }

    const { data: conversation, error } = await (supabaseAdmin as any)
      .from('whatsapp_conversations')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenantContext.organizationId)
      .maybeSingle();

    if (error || !conversation) {
      return NextResponse.json({ success: false, error: 'Conversación no encontrada' }, { status: 404 });
    }

    const url = new URL(request.url);
    const before = url.searchParams.get('before');
    const limit = Number(url.searchParams.get('limit') || 50);

    let messagesQuery = supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', id)
      .eq('organization_id', tenantContext.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      messagesQuery = messagesQuery.lt('created_at', before);
    }

    const { data: messages, error: messagesError } = await messagesQuery;

    if (messagesError) {
      console.error('[GET /api/whatsapp/conversations/[id]] Error mensajes:', messagesError);
      return NextResponse.json({ success: false, error: 'Error al obtener mensajes' }, { status: 500 });
    }

    // Último mensaje INBOUND — determina si la conversación sigue dentro de la
    // ventana gratuita de 24h de Meta (distinto de last_message_at, que se
    // actualiza con mensajes en ambas direcciones).
    const { data: lastInbound } = await (supabaseAdmin as any)
      .from('whatsapp_messages')
      .select('created_at')
      .eq('conversation_id', id)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      data: {
        conversation,
        messages: (messages || []).reverse(),
        lastInboundMessageAt: lastInbound?.created_at || null,
      },
    });
  } catch (error) {
    console.error('[GET /api/whatsapp/conversations/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al obtener conversación' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const tenantContext = await getTenantContext(request);
    if (!tenantContext) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }
    if (!hasPermission(tenantContext.role as UserRole, 'whatsapp', 'update')) {
      return NextResponse.json({ success: false, error: 'No tienes permisos para modificar esta conversación' }, { status: 403 });
    }

    const body = await request.json();
    const { status, assigned_to_user_id } = body;

    const supabaseAdmin = getSupabaseServiceClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Servicio no disponible' }, { status: 500 });
    }

    const { data: existing } = await (supabaseAdmin as any)
      .from('whatsapp_conversations')
      .select('id')
      .eq('id', id)
      .eq('organization_id', tenantContext.organizationId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Conversación no encontrada' }, { status: 404 });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (status !== undefined) {
      updates.status = status;
      if (status === 'closed') updates.closed_at = new Date().toISOString();
    }

    if (assigned_to_user_id !== undefined) {
      if (assigned_to_user_id === null) {
        updates.assigned_to_user_id = null;
      } else {
        // Validar que el usuario a asignar pertenezca a la misma organización
        const { data: targetUser } = await (supabaseAdmin as any)
          .from('users')
          .select('id')
          .eq('id', assigned_to_user_id)
          .eq('organization_id', tenantContext.organizationId)
          .maybeSingle();

        if (!targetUser) {
          return NextResponse.json({ success: false, error: 'Usuario a asignar no encontrado en esta organización' }, { status: 400 });
        }
        updates.assigned_to_user_id = assigned_to_user_id;
      }
    }

    const { data: updated, error } = await (supabaseAdmin as any)
      .from('whatsapp_conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/whatsapp/conversations/[id]] Error:', error);
      return NextResponse.json({ success: false, error: 'Error al actualizar conversación' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('[PATCH /api/whatsapp/conversations/[id]] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al actualizar conversación' },
      { status: 500 }
    );
  }
}
