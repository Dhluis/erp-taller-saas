import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const invitationId = searchParams.get('id')

    if (!invitationId) {
      return NextResponse.json(
        { error: 'ID de invitación requerido' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseServiceClient()

    // Obtener invitación con datos de organización
    const { data: invitation, error } = await supabase
      .from('invitations')
      .select(`
        id,
        email,
        role,
        status,
        expires_at,
        organization_id,
        organizations (
          id,
          name
        )
      `)
      .eq('id', invitationId)
      .single()

    if (error || !invitation) {
      return NextResponse.json(
        { error: 'Invitación no encontrada' },
        { status: 404 }
      )
    }

    // Validar que esté pendiente
    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { error: 'Esta invitación ya fue utilizada' },
        { status: 400 }
      )
    }

    // Validar que no haya expirado
    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Esta invitación ha expirado' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        organizationId: invitation.organization_id,
        organizationName: (invitation.organizations as any)?.name || 'la organización',
      }
    })

  } catch (error: any) {
    console.error('[Validate Invitation] Error:', error)
    return NextResponse.json(
      { error: 'Error al validar invitación' },
      { status: 500 }
    )
  }
}

