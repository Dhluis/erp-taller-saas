import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { migrateAllWebhooks } from '@/lib/scripts/migrate-webhooks';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/migrate-webhooks
 * Endpoint protegido para migrar webhooks de todas las organizaciones
 * Solo accesible por usuarios con role === 'admin'
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Migration API] 🔐 Verificando permisos de administrador...');

    // 1. Verificar autenticación y obtener contexto
    const tenantContext = await getTenantContext(request);
    
    if (!tenantContext?.userId) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado'
      }, { status: 401 });
    }

    // 2. Verificar que el usuario sea admin
    const supabase = getSupabaseServiceClient();
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', tenantContext.userId)
      .single();

    if (profileError || !userProfile) {
      console.error('[Migration API] ❌ Error obteniendo perfil de usuario:', profileError);
      return NextResponse.json({
        success: false,
        error: 'No se pudo verificar el perfil de usuario'
      }, { status: 403 });
    }

    const userRole = (userProfile as any).role;
    if (userRole !== 'admin') {
      console.warn(`[Migration API] ⚠️ Usuario ${tenantContext.userId} intentó acceder sin permisos (role: ${userRole})`);
      return NextResponse.json({
        success: false,
        error: 'Acceso denegado. Se requieren permisos de administrador.'
      }, { status: 403 });
    }

    console.log(`[Migration API] ✅ Usuario autorizado: ${tenantContext.userId}`);

    // 3. Ejecutar migración
    console.log('[Migration API] 🚀 Iniciando migración...');
    const result = await migrateAllWebhooks();

    // 4. Retornar resultado
    return NextResponse.json({
      success: true,
      message: 'Migración completada',
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed
      },
      errors: result.errors.length > 0 ? result.errors : undefined
    });

  } catch (error: any) {
    console.error('[Migration API] ❌ Error ejecutando migración:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

/**
 * GET /api/admin/migrate-webhooks
 * Información sobre el endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Endpoint de migración de webhooks. Usa POST para ejecutar la migración.',
    requiresAuth: true,
    requiresRole: 'admin'
  });
}

