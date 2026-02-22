import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { sendEmail } from '@/lib/email/mailer'

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

    // Obtener nombre de la organización
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', tenantContext.organizationId)
      .single()

    const orgName = org?.name || 'Eagles ERP'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://eaglessystem.io'
    const roleLabels: Record<string, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      mechanic: 'Mecánico',
      receptionist: 'Recepcionista',
      viewer: 'Visualizador',
    }
    const roleLabel = roleLabels[invitation.role] || invitation.role
    const registerUrl = `${appUrl}/auth/register?email=${encodeURIComponent(invitation.email)}&invitation=${invitationId}`
    const expiresAt = new Date(invitation.expires_at)

    const emailSent = await sendEmail({
      to: invitation.email,
      subject: `Recordatorio: Invitación a ${orgName} en Eagles ERP`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Recordatorio de invitación a ${orgName}</h2>
          <p>Te recordamos que tienes una invitación pendiente para unirte a <strong>${orgName}</strong> en Eagles ERP con el rol de <strong>${roleLabel}</strong>.</p>
          <p>Esta invitación expira el <strong>${expiresAt.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${registerUrl}" style="background: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; display: inline-block;">
              Aceptar Invitación
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
        </div>
      `,
    })

    console.log('✅ Email reenviado para invitación:', invitationId, '| Enviado:', emailSent)
    return NextResponse.json({
      success: true,
      message: 'Email de invitación reenviado exitosamente',
      emailSent,
    })

  } catch (error: any) {
    console.error('💥 Error en POST /api/invitations/resend:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

