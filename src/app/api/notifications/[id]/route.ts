import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest } from '@/lib/supabase/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

// GET /api/notifications/[id] - Obtener notificación
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 GET /api/notifications/[id] - Iniciando...', params.id)
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [GET /api/notifications/[id]] Error de autenticación:', authError)
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
      console.error('❌ [GET /api/notifications/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;

    // ✅ Obtener notificación usando supabaseAdmin con validación de organización
    const { data: notification, error: queryError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', organizationId) // ✅ Validación explícita de multi-tenancy
      .single();

    if (queryError || !notification) {
      console.error('❌ [GET /api/notifications/[id]] Notificación no encontrada:', queryError)
      return NextResponse.json(
        { error: 'Notificación no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // Normalizar campo read/is_read
    const normalized = {
      ...notification,
      read: notification.read !== undefined ? notification.read : notification.is_read || false,
      is_read: notification.is_read !== undefined ? notification.is_read : notification.read || false
    }

    return NextResponse.json({
      data: normalized,
      error: null
    })
  } catch (error: any) {
    console.error('❌ Error in GET /api/notifications/[id]:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

// PUT /api/notifications/[id] - Marcar como leída
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 PUT /api/notifications/[id] - Iniciando...', params.id)
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [PUT /api/notifications/[id]] Error de autenticación:', authError)
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
      console.error('❌ [PUT /api/notifications/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;

    // ✅ Verificar que la notificación existe y pertenece a la organización
    const { data: existingNotification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('id, organization_id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existingNotification) {
      console.error('❌ [PUT /api/notifications/[id]] Notificación no encontrada:', fetchError)
      return NextResponse.json(
        { error: 'Notificación no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // ✅ Actualizar notificación usando supabaseAdmin
    const { data: updatedNotification, error: updateError } = await (supabaseAdmin as any)
      .from('notifications')
      .update({ read: true })
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [PUT /api/notifications/[id]] Error actualizando:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar notificación' },
        { status: 500 }
      )
    }

    // Normalizar campo read/is_read
    const normalized = {
      ...updatedNotification,
      read: updatedNotification.read !== undefined ? updatedNotification.read : updatedNotification.is_read || false,
      is_read: updatedNotification.is_read !== undefined ? updatedNotification.is_read : updatedNotification.read || false
    }

    return NextResponse.json({
      data: normalized,
      error: null
    })
  } catch (error: any) {
    console.error('❌ Error in PUT /api/notifications/[id]:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

// DELETE /api/notifications/[id] - Eliminar notificación
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔄 DELETE /api/notifications/[id] - Iniciando...', params.id)
    
    // ✅ Obtener usuario autenticado usando patrón robusto
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ [DELETE /api/notifications/[id]] Error de autenticación:', authError)
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
      console.error('❌ [DELETE /api/notifications/[id]] Error obteniendo perfil:', profileError)
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id;

    // ✅ Verificar que la notificación existe y pertenece a la organización
    const { data: existingNotification, error: fetchError } = await supabaseAdmin
      .from('notifications')
      .select('id, organization_id')
      .eq('id', params.id)
      .eq('organization_id', organizationId)
      .single();

    if (fetchError || !existingNotification) {
      console.error('❌ [DELETE /api/notifications/[id]] Notificación no encontrada:', fetchError)
      return NextResponse.json(
        { error: 'Notificación no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // ✅ Eliminar notificación usando supabaseAdmin
    const { error: deleteError } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('id', params.id)
      .eq('organization_id', organizationId); // ✅ Validación explícita

    if (deleteError) {
      console.error('❌ [DELETE /api/notifications/[id]] Error eliminando:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar notificación' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { message: 'Notificación eliminada exitosamente' },
      error: null
    })
  } catch (error: any) {
    console.error('❌ Error in DELETE /api/notifications/[id]:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

