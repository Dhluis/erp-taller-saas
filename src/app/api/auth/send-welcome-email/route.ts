import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/mailer'
import { getWelcomeEmailTemplate } from '@/lib/email/templates/welcome'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, userId, organizationId } = body

    if (!email || !userId || !organizationId) {
      return NextResponse.json(
        { error: 'Email, userId y organizationId son requeridos' },
        { status: 400 }
      )
    }

    // Obtener nombre de la organización
    const supabase = getSupabaseServiceClient()
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      console.warn('⚠️ No se pudo obtener nombre de organización para email de bienvenida')
    }

    // Obtener nombre del usuario
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.warn('⚠️ No se pudo obtener nombre de usuario para email de bienvenida')
    }

    const userName = user?.full_name || email.split('@')[0]
    const organizationName = organization?.name || 'tu organización'
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://eaglessystem.io'}/auth/login`

    // Enviar email de bienvenida
    const emailSent = await sendEmail({
      to: email,
      subject: '¡Bienvenido a Eagles ERP! 🦅',
      html: getWelcomeEmailTemplate({
        userName,
        organizationName,
        loginUrl,
      }),
    })

    if (emailSent) {
      console.log('✅ Email de bienvenida enviado a:', email)
      return NextResponse.json({
        success: true,
        message: 'Email de bienvenida enviado exitosamente'
      })
    } else {
      console.warn('⚠️ No se pudo enviar email de bienvenida')
      return NextResponse.json(
        { error: 'No se pudo enviar el email de bienvenida' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('❌ Error enviando email de bienvenida:', error)
    return NextResponse.json(
      { error: 'Error al enviar email de bienvenida' },
      { status: 500 }
    )
  }
}

