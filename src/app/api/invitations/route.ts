import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/core/multi-tenant-server'
import { sendEmail } from '@/lib/email/mailer'
import { getInvitationEmailTemplate } from '@/lib/email/templates/invitation'

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

    // Enviar email de invitación
    try {
      await sendInvitationEmail(invitation.id, email, role, message, tenantContext.organizationId)
    } catch (emailError: any) {
      console.error('⚠️ Error enviando email (invitación creada):', emailError)
      // No fallar si el email no se envía, la invitación ya está creada
    }

    console.log('✅ Invitación creada:', invitation.id)
    return NextResponse.json({ 
      success: true, 
      data: invitation 
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

/**
 * Función para enviar email de invitación
 */
async function sendInvitationEmail(
  invitationId: string,
  email: string,
  role: string,
  message: string | undefined,
  organizationId: string
) {
  try {
    const { getAppUrl } = await import('@/lib/config/env')
    const baseUrl = getAppUrl()

    // Obtener nombre de la organización y usuario que invita
    const supabase = await createClient()
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    const orgName = organization?.name || 'la organización'

    // Obtener usuario que invita desde la invitación
    const { data: invitation } = await supabase
      .from('invitations')
      .select('invited_by')
      .eq('id', invitationId)
      .single()

    let invitedByName = 'Un administrador'
    if (invitation?.invited_by) {
      const { data: inviterUser } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('auth_user_id', invitation.invited_by)
        .single()
      
      if (inviterUser) {
        invitedByName = inviterUser.full_name || inviterUser.email || 'Un administrador'
      }
    }

    // Link de registro con parámetro de invitación
    const invitationLink = `${baseUrl}/auth/register?invitation=${invitationId}`

    // Enviar email de invitación
    const emailSent = await sendEmail({
      to: email,
      subject: `Invitación a ${orgName} en Eagles ERP`,
      html: getInvitationEmailTemplate({
        invitedEmail: email,
        invitedByName,
        organizationName: orgName,
        invitationLink,
      }),
    })

    if (!emailSent) {
      console.warn('⚠️ No se pudo enviar email de invitación a:', email)
      // Continuar de todos modos, la invitación está creada
    }

    console.log('✅ Email de invitación enviado a:', email)
    return { success: true }
  } catch (error: any) {
    console.error('❌ Error enviando email de invitación:', error)
    throw error
  }
}
