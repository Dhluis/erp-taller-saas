import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest } from '@/lib/supabase/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { extractPaginationFromURL, calculateOffset, generatePaginationMeta } from '@/lib/utils/pagination';
import type { PaginatedResponse } from '@/types/pagination';

/**
 * GET /api/whatsapp/conversations - Obtener conversaciones de WhatsApp con paginación
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
          data: { items: [], pagination: generatePaginationMeta(1, 20, 0) }
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
          data: { items: [], pagination: generatePaginationMeta(1, 20, 0) }
        },
        { status: 403 }
      );
    }

    const organizationId = userProfile.organization_id;

    // ✅ Extraer parámetros de paginación de la URL
    const url = new URL(request.url);
    const { page, pageSize } = extractPaginationFromURL(url);
    
    // Obtener parámetros adicionales
    const status = url.searchParams.get('status');

    console.log('📄 [GET /api/whatsapp/conversations] Parámetros:', {
      page,
      pageSize,
      status,
      organizationId
    });

    // Calcular offset para paginación
    const offset = calculateOffset(page, pageSize);

    // Construir query con paginación y relación con leads
    let query = supabaseAdmin
      .from('whatsapp_conversations')
      .select(`
        *,
        lead:leads!leads_whatsapp_conversation_id_fkey(
          id,
          status,
          lead_score,
          estimated_value,
          customer_id,
          notes
        )
      `, { count: 'exact' })
      .eq('organization_id', organizationId);

    // Aplicar filtro de status si se proporciona
    if (status && status !== 'all' && status !== 'unread' && status !== 'favorite') {
      query = query.eq('status', status);
    }

    // Aplicar ordenamiento y paginación
    query = query
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    const { data: conversations, count, error: conversationsError } = await query;

    if (conversationsError) {
      console.error('❌ [GET /api/whatsapp/conversations] Error en query:', conversationsError);
      return NextResponse.json(
        {
          success: false,
          error: conversationsError.message || 'Error al obtener conversaciones',
          data: { items: [], pagination: generatePaginationMeta(page, pageSize, 0) }
        },
        { status: 500 }
      );
    }

    // ✅ Generar metadata de paginación
    const pagination = generatePaginationMeta(page, pageSize, count || 0);

    console.log('✅ [GET /api/whatsapp/conversations] Respuesta preparada:', {
      itemsCount: conversations?.length || 0,
      total: count || 0,
      pagination
    });

    // ✅ Retornar respuesta paginada
    const response: PaginatedResponse<any> = {
      success: true,
      data: {
        items: conversations || [],
        pagination
      }
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [GET /api/whatsapp/conversations] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error al obtener conversaciones',
        data: { items: [], pagination: generatePaginationMeta(1, 20, 0) }
      },
      { status: 500 }
    );
  }
}

