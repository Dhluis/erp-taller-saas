import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/whatsapp/conversations - Obtener conversaciones de WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [GET /api/whatsapp/conversations] Error de autenticación:', authError);
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
      console.error('❌ [GET /api/whatsapp/conversations] Error obteniendo perfil:', profileError);
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
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    // Construir query
    let query = supabaseAdmin
      .from('whatsapp_conversations')
      .select('*')
      .eq('organization_id', organizationId);

    // Aplicar filtro de status si se proporciona
    if (status && status !== 'all' && status !== 'unread' && status !== 'favorite') {
      query = query.eq('status', status);
    }

    query = query
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    const { data: conversations, error: conversationsError } = await query;

    if (conversationsError) {
      console.error('❌ [GET /api/whatsapp/conversations] Error en query:', conversationsError);
      return NextResponse.json(
        {
          success: false,
          error: conversationsError.message || 'Error al obtener conversaciones',
          data: []
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conversations || [],
      count: conversations?.length || 0
    });
  } catch (error: any) {
    console.error('❌ [GET /api/whatsapp/conversations] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener conversaciones',
        data: []
      },
      { status: 500 }
    );
  }
}

