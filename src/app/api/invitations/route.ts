import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { sendEmail } from '@/lib/email/mailer'

/**
 * API Route para gestión de invitaciones
 * 
 * Endpoints:
 * - GET /api/invitations - Lista todas las invitaciones de la organización del usuario
 * - POST /api/invitations - Crea nueva invitación y envía email
 * - DELETE /api/invitations?id={id} - Cancela una invitación
 * 
 * Requiere: Rol admin o manager
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 GET /api/invitations - Iniciando...')

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
        error: 'No tienes permisos para ver invitaciones' 
      }, { status: 403 })
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    // Obtener invitaciones de la organización
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error obteniendo invitaciones:', error)
      return NextResponse.json({ 
        error: error.message 
      }, { status: 500 })
    }

    console.log('✅ Invitaciones obtenidas:', invitations?.length || 0)
    return NextResponse.json({ 
      success: true, 
      data: invitations || [] 
    })

  } catch (error: any) {
    console.error('💥 Error en GET /api/invitations:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

/**
 * POST /api/invitations
 * Crea una nueva invitación y envía email
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 POST /api/invitations - Iniciando...')

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
        error: 'No tienes permisos para crear invitaciones' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { email, role, message } = body

    // Validaciones
    if (!email || !role) {
      return NextResponse.json({ 
        error: 'Email y rol son requeridos' 
      }, { status: 400 })
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Email inválido' 
      }, { status: 400 })
    }

    // Validar rol
    const validRoles = ['admin', 'manager', 'mechanic', 'receptionist', 'user']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ 
        error: `Rol inválido. Roles válidos: ${validRoles.join(', ')}` 
      }, { status: 400 })
    }

    // Verificar que el email no esté ya en la organización
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (existingUser) {
      return NextResponse.json({ 
        error: 'Este email ya está registrado en tu organización' 
      }, { status: 409 })
    }

    // Verificar que no haya invitación pendiente para este email
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('email', email)
      .eq('organization_id', tenantContext.organizationId)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return NextResponse.json({ 
        error: 'Ya existe una invitación pendiente para este email' 
      }, { status: 409 })
    }

    // Calcular fecha de expiración (7 días)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Crear invitación
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .insert({
        organization_id: tenantContext.organizationId,
        email,
        role,
        invited_by: user.id,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      console.error('❌ Error creando invitación:', inviteError)
      return NextResponse.json({ 
        error: `Error al crear invitación: ${inviteError.message}` 
      }, { status: 500 })
    }

    // Obtener nombre de la organización para el email
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
    const roleLabel = roleLabels[role] || role
    const registerUrl = `${appUrl}/auth/register?email=${encodeURIComponent(email)}&invitation=${invitation.id}`

    const emailSent = await sendEmail({
      to: email,
      subject: `Invitación a ${orgName} en Eagles ERP`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Has sido invitado a ${orgName}</h2>
          <p>Has recibido una invitación para unirte a <strong>${orgName}</strong> en Eagles ERP con el rol de <strong>${roleLabel}</strong>.</p>
          ${message ? `<p style="background: #f5f5f5; padding: 12px; border-radius: 6px; font-style: italic;">"${message}"</p>` : ''}
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

    console.log('✅ Invitación creada:', invitation.id, '| Email enviado:', emailSent)
    return NextResponse.json({
      success: true,
      data: invitation,
      emailSent,
    }, { status: 201 })

  } catch (error: any) {
    console.error('💥 Error en POST /api/invitations:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

/**
 * DELETE /api/invitations
 * Cancela una invitación
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🔄 DELETE /api/invitations - Iniciando...')

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
        error: 'No tienes permisos para cancelar invitaciones' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json({ 
        error: 'ID de invitación requerido' 
      }, { status: 400 })
    }

    // Verificar que la invitación pertenece a la organización
    const { data: invitation, error: checkError } = await supabase
      .from('invitations')
      .select('id, status')
      .eq('id', invitationId)
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (checkError || !invitation) {
      return NextResponse.json({ 
        error: 'Invitación no encontrada' 
      }, { status: 404 })
    }

    // Solo cancelar si está pendiente
    if (invitation.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Solo se pueden cancelar invitaciones pendientes' 
      }, { status: 400 })
    }

    // Cancelar invitación
    const { error: deleteError } = await supabase
      .from('invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (deleteError) {
      console.error('❌ Error cancelando invitación:', deleteError)
      return NextResponse.json({ 
        error: `Error al cancelar invitación: ${deleteError.message}` 
      }, { status: 500 })
    }

    console.log('✅ Invitación cancelada:', invitationId)
    return NextResponse.json({ 
      success: true, 
      message: 'Invitación cancelada exitosamente' 
    })

  } catch (error: any) {
    console.error('💥 Error en DELETE /api/invitations:', error)
    return NextResponse.json({ 
      error: error.message || 'Error interno del servidor' 
    }, { status: 500 })
  }
}

