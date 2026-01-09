import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/whatsapp/conversations/[id] - Obtener detalles de una conversación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          data: null
        },
        { status: 401 }
      );
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
          data: null
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;

    // Obtener conversación con customer_id, metadata y lead
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select(`
        id,
        customer_id,
        metadata,
        created_at,
        organization_id,
        lead:leads!leads_whatsapp_conversation_id_fkey(
          id,
          status,
          lead_score,
          estimated_value,
          customer_id,
          notes
        )
      `)
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single();

    if (conversationError || !conversation) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]] Conversación no encontrada:', conversationError);
      return NextResponse.json(
        {
          success: false,
          error: 'Conversación no encontrada o no autorizada',
          data: null
        },
        { status: 404 }
      );
    }

    // Si hay customer_id, obtener datos del cliente
    let customerData = null;
    if (conversation.customer_id) {
      const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('id', conversation.customer_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (!customerError && customer) {
        customerData = customer;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...conversation,
        customer: customerData
      }
    });
  } catch (error: any) {
    console.error('❌ [GET /api/whatsapp/conversations/[id]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener conversación',
        data: null
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/conversations/[id] - Eliminar una conversación y sus mensajes
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // ✅ Obtener usuario autenticado
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [DELETE /api/whatsapp/conversations/[id]] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado'
        },
        { status: 401 }
      );
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [DELETE /api/whatsapp/conversations/[id]] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario'
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;

    console.log('[Delete Conversation] 🗑️ Eliminando conversación:', conversationId, 'para organización:', organizationId);

    // Verificar que la conversación existe y pertenece a la organización
    const { data: conversation, error: fetchError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id, organization_id')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !conversation) {
      console.error('[Delete Conversation] ❌ Conversación no encontrada o no autorizada:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Conversación no encontrada o no autorizada'
        },
        { status: 404 }
      );
    }

    // Eliminar mensajes primero (si no hay CASCADE DELETE configurado)
    // Esto es seguro incluso si hay CASCADE, simplemente no eliminará nada
    const { error: messagesError } = await supabaseAdmin
      .from('whatsapp_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId);

    if (messagesError) {
      console.warn('[Delete Conversation] ⚠️ Error eliminando mensajes (puede ser CASCADE):', messagesError);
      // Continuar de todas formas - si hay CASCADE DELETE, la conversación los eliminará
    } else {
      console.log('[Delete Conversation] ✅ Mensajes eliminados o CASCADE DELETE activo');
    }

    // Eliminar conversación
    const { error: deleteError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      console.error('[Delete Conversation] ❌ Error eliminando conversación:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: deleteError.message || 'Error al eliminar conversación'
        },
        { status: 500 }
      );
    }

    console.log('[Delete Conversation] ✅ Conversación eliminada exitosamente');

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted'
    });

  } catch (error: any) {
    console.error('[Delete Conversation] ❌ Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al eliminar conversación'
      },
      { status: 500 }
    );
  }
}

