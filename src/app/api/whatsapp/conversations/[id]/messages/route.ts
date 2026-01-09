import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/whatsapp/conversations/[id]/messages - Obtener mensajes de una conversación
 * POST /api/whatsapp/conversations/[id]/messages - Crear un nuevo mensaje
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 [GET /api/whatsapp/conversations/[id]/messages] Iniciando...');
    const { id: conversationId } = await params;
    console.log('🔍 [GET /api/whatsapp/conversations/[id]/messages] Conversation ID:', conversationId);

    // ✅ Verificar cookies antes de autenticación
    const cookieNames = ['sb-access-token', 'sb-refresh-token', 'sb-auth-token'];
    const cookiesPresent = cookieNames.map(name => ({
      name,
      present: !!request.cookies.get(name),
      value: request.cookies.get(name)?.value?.substring(0, 20) + '...' || 'not found'
    }));
    console.log('🍪 [GET /api/whatsapp/conversations/[id]/messages] Cookies recibidas:', cookiesPresent);
    console.log('🍪 [GET /api/whatsapp/conversations/[id]/messages] Todas las cookies:', Array.from(request.cookies.getAll()).map(c => ({ name: c.name, hasValue: !!c.value })));

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

    console.log('✅ [GET /api/whatsapp/conversations/[id]/messages] Usuario autenticado:', user.id);

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
    console.log('✅ [GET /api/whatsapp/conversations/[id]/messages] Organization ID:', organizationId);

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    console.log('🔍 [GET /api/whatsapp/conversations/[id]/messages] Limit:', limit);

    // Primero verificar si la conversación existe (sin filtrar por organización)
    console.log('🔍 [GET /api/whatsapp/conversations/[id]/messages] Verificando si conversación existe...');
    const { data: conversationExists, error: existsError } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id, organization_id')
      .eq('id', conversationId)
      .single();

    if (existsError || !conversationExists) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Conversación no existe:', {
        existsError,
        conversationId,
        errorCode: existsError?.code,
        errorMessage: existsError?.message,
        errorDetails: existsError?.details,
        errorHint: existsError?.hint
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Conversación no encontrada',
          data: []
        },
        { status: 404 }
      );
    }

    // Verificar que la conversación pertenezca a la organización del usuario
    console.log('🔍 [GET /api/whatsapp/conversations/[id]/messages] Verificando organización...', {
      conversationOrgId: conversationExists.organization_id,
      userOrgId: organizationId,
      match: conversationExists.organization_id === organizationId
    });

    if (conversationExists.organization_id !== organizationId) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Conversación no pertenece a la organización:', {
        conversationId,
        conversationOrgId: conversationExists.organization_id,
        userOrgId: organizationId
      });
      return NextResponse.json(
        {
          success: false,
          error: 'No autorizado: La conversación no pertenece a tu organización',
          data: []
        },
        { status: 403 }
      );
    }

    const conversation = conversationExists;

    console.log('✅ [GET /api/whatsapp/conversations/[id]/messages] Conversación validada:', conversation.id);

    // Obtener mensajes de la conversación
    console.log('🔍 [GET /api/whatsapp/conversations/[id]/messages] Obteniendo mensajes...');
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (messagesError) {
      console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Error en query de mensajes:', {
        error: messagesError,
        errorCode: messagesError?.code,
        errorMessage: messagesError?.message,
        errorDetails: messagesError?.details,
        errorHint: messagesError?.hint,
        conversationId,
        organizationId
      });
      return NextResponse.json(
        {
          success: false,
          error: messagesError.message || 'Error al obtener mensajes',
          data: [],
          details: messagesError.details || null,
          hint: messagesError.hint || null
        },
        { status: 500 }
      );
    }

    console.log('✅ [GET /api/whatsapp/conversations/[id]/messages] Mensajes obtenidos:', messages?.length || 0);

    return NextResponse.json({
      success: true,
      data: messages || [],
      count: messages?.length || 0
    });
  } catch (error: any) {
    console.error('❌ [GET /api/whatsapp/conversations/[id]/messages] Error catch:', {
      error,
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener mensajes',
        data: [],
        details: error.stack || null
      },
      { status: 500 }
    );
  }
}

