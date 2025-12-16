import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

// POST /api/notifications/mark-all-read - Marcar todas como leídas
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/notifications/mark-all-read - Iniciando...')
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [POST /api/notifications/mark-all-read] Error de autenticación:', authError)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener organization_id del perfil del usuario usando Service Role Client
    const supabaseAdmin = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileError || !userProfile?.organization_id) {
      console.error('❌ [POST /api/notifications/mark-all-read] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;

    // ✅ Obtener IDs de notificaciones no leídas del usuario o generales
    const { data: unreadNotifications, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('id, read, is_read')
      .eq('organization_id', organizationId) // ✅ Validación explícita
      .or(`user_id.eq.${user.id},user_id.is.null`);

    if (fetchError) {
      console.error('❌ [POST /api/notifications/mark-all-read] Error obteniendo notificaciones:', fetchError)
      return NextResponse.json(
        { error: 'Error al obtener notificaciones' },
        { status: 500 }
      )
    }

    // Filtrar en memoria las que realmente están sin leer
    const unreadIds = (unreadNotifications || [])
      .filter((n: any) => {
        const isRead = n.read !== undefined ? n.read : (n.is_read !== undefined ? n.is_read : true)
        return !isRead
      })
      .map((n: any) => n.id);

    if (unreadIds.length === 0) {
      return NextResponse.json({
        data: {
          message: 'No hay notificaciones sin leer',
          count: 0,
          notifications: []
        },
        error: null
      })
    }

    // ✅ Actualizar todas las notificaciones no leídas usando supabaseAdmin
    const { data: updatedNotifications, error: updateError } = await supabaseAdmin
      .from('notifications')
      .update({
        read: true,
        is_read: true, // Compatibilidad con ambos campos
        updated_at: new Date().toISOString()
      })
      .in('id', unreadIds)
      .eq('organization_id', organizationId) // ✅ Validación explícita
      .select();

    if (updateError) {
      console.error('❌ [POST /api/notifications/mark-all-read] Error actualizando:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar notificaciones' },
        { status: 500 }
      )
    }

    console.log('✅ [POST /api/notifications/mark-all-read] Notificaciones actualizadas:', updatedNotifications?.length || 0)

    return NextResponse.json({
      data: {
        message: 'Todas las notificaciones marcadas como leídas',
        count: updatedNotifications?.length || 0,
        notifications: updatedNotifications || []
      },
      error: null
    })
  } catch (error: any) {
    console.error('❌ Error in POST /api/notifications/mark-all-read:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

