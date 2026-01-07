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
          customer_id
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

