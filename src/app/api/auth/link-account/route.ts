import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { createClientFromRequest } from '@/lib/supabase/server';

/**
 * API para vincular una cuenta existente (creada por OAuth) con una organización
 * y contraseña cuando el usuario completa el registro después de hacer clic en Google
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, organizationId, fullName } = body;

    if (!email || !password || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseServiceClient();
    const supabaseClient = createClientFromRequest(request);

    // 1. Buscar usuario por email en auth.users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ [link-account] Error listando usuarios:', listError);
      return NextResponse.json(
        { success: false, error: 'Error al verificar usuario' },
        { status: 500 }
      );
    }

    const existingUser = users.find(u => u.email === email);

    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    console.log('🔍 [link-account] Usuario encontrado:', existingUser.id);

    // 2. Verificar si el usuario tiene perfil y organización
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id, auth_user_id')
      .eq('auth_user_id', existingUser.id)
      .single();

    // 3. Si el usuario tiene organización, no se puede vincular
    if (userProfile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'El usuario ya tiene una organización asociada' },
        { status: 400 }
      );
    }

    // 4. Actualizar contraseña del usuario (si no tiene)
    // Si el usuario fue creado por OAuth, puede que no tenga contraseña
    try {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: password,
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: fullName
        }
      });
      console.log('✅ [link-account] Contraseña actualizada');
    } catch (updateError: any) {
      console.warn('⚠️ [link-account] Error actualizando contraseña (puede que ya tenga):', updateError);
      // Continuar aunque falle, puede que ya tenga contraseña
    }

    // 5. Crear o actualizar perfil en users
    if (userProfile) {
      // Actualizar perfil existente
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          organization_id: organizationId,
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', existingUser.id);

      if (updateError) {
        console.error('❌ [link-account] Error actualizando perfil:', updateError);
        return NextResponse.json(
          { success: false, error: 'Error al actualizar perfil' },
          { status: 500 }
        );
      }
      console.log('✅ [link-account] Perfil actualizado');
    } else {
      // Crear nuevo perfil
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: existingUser.id, // Usar el mismo ID de auth.users
          auth_user_id: existingUser.id,
          email: existingUser.email!,
          full_name: fullName || existingUser.email?.split('@')[0] || '',
          organization_id: organizationId,
          workshop_id: null,
          role: 'ADMIN',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('❌ [link-account] Error creando perfil:', insertError);
        return NextResponse.json(
          { success: false, error: 'Error al crear perfil' },
          { status: 500 }
        );
      }
      console.log('✅ [link-account] Perfil creado');
    }

    // 6. Intentar iniciar sesión para verificar que todo funciona
    const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.warn('⚠️ [link-account] No se pudo iniciar sesión automáticamente:', signInError);
      // Aún así retornar éxito porque el perfil se actualizó
    } else {
      console.log('✅ [link-account] Sesión iniciada exitosamente');
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta vinculada exitosamente',
      user: signInData?.user || existingUser
    });

  } catch (error: any) {
    console.error('❌ [link-account] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al vincular cuenta' },
      { status: 500 }
    );
  }
}

