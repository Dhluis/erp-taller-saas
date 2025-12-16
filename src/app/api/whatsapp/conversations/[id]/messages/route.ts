import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/whatsapp/conversations/[id]/messages - Obtener mensajes de una conversación
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;

    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Error de autenticación:', authError);
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado',
          data: []
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
      console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Error obteniendo perfil:', profileError);
      return NextResponse.json(
        {
          success: false,
          error: 'No se pudo obtener la organización del usuario',
          data: []
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Primero validar que la conversación pertenezca a la organización
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id, organization_id')
      .eq('id', conversationId)
      .eq('organization_id', organizationId)
      .single();

    if (convError || !conversation) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Conversación no encontrada o no autorizada:', convError);
      return NextResponse.json(
        {
          success: false,
          error: 'Conversación no encontrada o no autorizada',
          data: []
        },
        { status: 404 }
      );
    }

    // Obtener mensajes de la conversación
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (messagesError) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Error en query:', messagesError);
      return NextResponse.json(
        {
          success: false,
          error: messagesError.message || 'Error al obtener mensajes',
          data: []
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: messages || [],
      count: messages?.length || 0
    });
  } catch (error: any) {
    console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener mensajes',
        data: []
      },
      { status: 500 }
    );
  }
}

