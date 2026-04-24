import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware'
import { logAndSafeError } from '@/lib/utils/api-error'

interface RegisterData {
  email: string
  password: string
  fullName: string
  workshopName: string
  phone?: string
}

// Función para obtener el cliente admin de Supabase
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Función para generar slug único
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '-') // Reemplazar espacios con guiones
    .replace(/-+/g, '-') // Remover guiones múltiples
    .substring(0, 50) // Limitar longitud
    + '-' + Date.now().toString(36) // Agregar timestamp para unicidad
}

export async function POST(request: NextRequest) {
  // 🛡️ Rate limiting - OPCIONAL (fail-open si Redis no disponible)
  try {
    const rateLimitResponse = await rateLimitMiddleware.auth(request);
    if (rateLimitResponse) {
      console.warn('[Auth Register] 🚫 Rate limit exceeded');
      return rateLimitResponse;
    }
  } catch (rateLimitError: any) {
    // ⚠️ Si rate limiting falla (Redis no disponible, etc.), continuar sin limitar
    const errorMsg = rateLimitError?.message || 'Unknown error';
    if (errorMsg.includes('REDIS_NOT_AVAILABLE') || errorMsg.includes('Missing')) {
      console.warn('[Auth Register] ⚠️ Rate limiting no disponible, continuando sin límites (fail-open)');
    } else {
      console.warn('[Auth Register] ⚠️ Error en rate limiting, continuando sin límites:', errorMsg);
    }
    // Continuar sin bloquear el request
  }

  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body: RegisterData = await request.json()
    
    // Validar datos requeridos
    if (!body.email || !body.password || !body.fullName || !body.workshopName) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      )
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      )
    }

    // Validar contraseña
    if (body.password.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      )
    }

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirmar email
      user_metadata: {
        full_name: body.fullName,
        workshop_name: body.workshopName,
        phone: body.phone || ''
      }
    })

    if (authError) {
      console.error('Error creating user:', authError)
      
      // Manejar error específico de email existente
      if (authError.code === 'email_exists' || authError.message.includes('already been registered')) {
        return NextResponse.json(
          { 
            error: 'Ya existe una cuenta con este email. Por favor, inicia sesión o usa un email diferente.',
            code: 'EMAIL_EXISTS'
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: `Error al crear usuario: ${authError.message}` },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    // 2. Crear organización con Trial Premium de 7 días (Modelo Híbrido)
    // Día 1-7: Premium completo (IA, reportes, sin límites)
    // Día 8+: Baja a Free automáticamente si no pagan
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + 7)

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: body.workshopName,
        address: `Dirección del taller de ${body.fullName}`,
        phone: body.phone || '',
        email: body.email,
        plan_tier: 'premium',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        plan_started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      
      // Si falla la organización, eliminar el usuario creado
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      
      console.error('Error creating organization:', orgError)
      return NextResponse.json(
        { error: 'Error al crear la organización. Intenta nuevamente.' },
        { status: 500 }
      )
    }

    // 3. Crear system_user (Para compatibilidad legacy)
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('system_users')
      .insert({
        organization_id: orgData.id,
        auth_user_id: authData.user.id, // VINCULAR CON AUTH
        email: body.email,
        first_name: body.fullName.split(' ')[0] || body.fullName,
        last_name: body.fullName.split(' ').slice(1).join(' ') || '',
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (profileError) {
      console.error('Error creating user profile (system_users):', profileError)
      // Cleanup...
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      await supabaseAdmin.from('organizations').delete().eq('id', orgData.id)
      return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 })
    }

    // 4. Crear registro en tabla 'users' (Principal para SessionContext)
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .insert({
        id: profileData.id,
        auth_user_id: authData.user.id,
        organization_id: orgData.id,
        email: body.email,
        full_name: body.fullName,
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (usersError) {
      console.warn('⚠️ Error creating user in "users" table:', usersError)
      // No bloqueante si system_users ya existe, pero idealmente atómico
    }

    // 5. Crear Workshop por defecto
    const { data: workshopData, error: workshopError } = await supabaseAdmin
      .from('workshops')
      .insert({
        organization_id: orgData.id,
        name: 'Taller Principal',
        email: body.email,
        phone: body.phone || '',
        address: `Dirección de ${body.workshopName}`
      })
      .select()
      .single()

    if (workshopError) {
      console.warn('⚠️ Error creating default workshop:', workshopError)
    }

    // Actualizar perfil con el workshop_id recién creado
    if (workshopData) {
      await supabaseAdmin
        .from('users')
        .update({ workshop_id: workshopData.id })
        .eq('id', profileData.id)
      
      await supabaseAdmin
        .from('system_users')
        .update({ workshop_id: workshopData.id })
        .eq('id', profileData.id)
    }


    // 5. Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          email_confirmed_at: authData.user.email_confirmed_at
        },
        organization: {
          id: orgData.id,
          name: orgData.name
        },
        profile: {
          id: profileData.id,
          role: profileData.role,
          first_name: profileData.first_name,
          last_name: profileData.last_name
        }
      }
    }, { status: 201 })

  } catch (error: unknown) {
    const msg = logAndSafeError(error, 'POST /api/auth/register', 'Error interno del servidor')
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Manejar métodos no permitidos
export async function GET() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  )
}
