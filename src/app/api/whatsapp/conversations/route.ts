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
    const { page, pageSize, sortBy, sortOrder } = extractPaginationFromURL(url);
    
    // Obtener parámetros adicionales
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search') || '';

    console.log('📄 [GET /api/whatsapp/conversations] Parámetros:', {
      page,
      pageSize,
      status,
      search,
      sortBy,
      sortOrder,
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

    // Aplicar búsqueda por teléfono o nombre de contacto
    if (search) {
      query = query.or(`customer_phone.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    // Aplicar ordenamiento personalizado o default
    const validSortFields = ['last_message_at', 'created_at', 'customer_name', 'messages_count'];
    const sortField = sortBy && validSortFields.includes(sortBy) ? sortBy : 'last_message_at';
    const ascending = sortOrder === 'asc';
    
    query = query
      .order(sortField, { ascending, nullsFirst: false })
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

    // ✅ Transformar lead de array a objeto/null
    // Supabase retorna lead como array [] cuando no hay relación o [obj] cuando hay
    const conversationsWithLeads = (conversations || []).map(conv => ({
      ...conv,
      lead: Array.isArray(conv.lead) 
        ? (conv.lead.length > 0 ? conv.lead[0] : null)
        : conv.lead
    }));

    console.log('✅ [GET /api/whatsapp/conversations] Respuesta preparada:', {
      itemsCount: conversationsWithLeads.length,
      total: count || 0,
      pagination
    });

    // ✅ Retornar respuesta paginada
    const response: PaginatedResponse<any> = {
      success: true,
      data: {
        items: conversationsWithLeads,
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

