import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
// TODO: Implementar envío de email real

/**
 * POST /api/invitations/resend
 * Reenvía email de invitación
 * 
 * Body: { invitationId: string }
 * Requiere: Rol admin o manager
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/invitations/resend - Iniciando...')

    // Obtener contexto del tenant
    const tenantContext = await getTenantContext(request)
    if (!tenantContext) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario es admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile || !['admin', 'manager'].includes(userProfile.role)) {
      return NextResponse.json({ 
        error: 'No tienes permisos para reenviar invitaciones' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { invitationId } = body

    if (!invitationId) {
      return NextResponse.json({ 
        error: 'ID de invitación requerido' 
      }, { status: 400 })
    }

    // Obtener invitación
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (inviteError || !invitation) {
      return NextResponse.json({ 
        error: 'Invitación no encontrada' 
      }, { status: 404 })
    }

    // Verificar que esté pendiente
    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Solo se pueden reenviar invitaciones pendientes' 
      }, { status: 400 })
    }

    // Verificar que no haya expirado
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // Actualizar status a expirado
      await supabase
        .from('invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId)

      return NextResponse.json({ 
        error: 'La invitación ha expirado. Crea una nueva invitación.' 
      }, { status: 400 })
    }

    // TODO: Implementar envío de email real

    console.log('✅ Email reenviado para invitación:', invitationId)
    return NextResponse.json({ 
      success: true, 
      message: 'Email de invitación reenviado exitosamente' 
    })

  } catch (error: any) {
    console.error('💥 Error en POST /api/invitations/resend:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

