import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { getWahaConfig } from '@/lib/waha-sessions';

/**
 * GET /api/whatsapp/diagnose
 * Endpoint de diagnóstico para identificar problemas con la conexión de WhatsApp
 */
export async function GET(request: NextRequest) {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      checks: {},
      errors: [],
      warnings: [],
      recommendations: []
    };

    // 1. Verificar autenticación y tenant context
    let tenantContext;
    try {
      tenantContext = await getTenantContext();
      diagnostics.checks.tenantContext = {
        success: true,
        organizationId: tenantContext.organizationId,
        workshopId: tenantContext.workshopId,
        userId: tenantContext.userId
      };
    } catch (authError: any) {
      // Si el error es de autenticación, devolver 401
      if (authError.message?.includes('no autenticado') || 
          authError.message?.includes('Usuario no autenticado') ||
          authError.message?.includes('Perfil de usuario no encontrado')) {
        diagnostics.checks.tenantContext = {
          success: false,
          error: 'Usuario no autenticado'
        };
        diagnostics.errors.push('No se pudo obtener el contexto del tenant: Usuario no autenticado');
        diagnostics.recommendations.push('Por favor, inicia sesión para acceder al diagnóstico');
        
        return NextResponse.json({
          success: false,
          diagnostics
        }, { status: 401 });
      }
      
      // Otros errores
      diagnostics.checks.tenantContext = {
        success: false,
        error: authError.message
      };
      diagnostics.errors.push('No se pudo obtener el contexto del tenant: ' + authError.message);
      return NextResponse.json({
        success: false,
        diagnostics
      }, { status: 500 });
    }

    const organizationId = diagnostics.checks.tenantContext.organizationId;

    // 2. Verificar variables de entorno
    // NOTA: NO usar NEXT_PUBLIC_* para claves secretas
    const envUrl = process.env.WAHA_API_URL;
    const envKey = process.env.WAHA_API_KEY;
    
    // Obtener todas las variables de entorno relacionadas con WAHA para debugging
    const allEnvKeys = Object.keys(process.env);
    const wahaEnvKeys = allEnvKeys.filter(k => k.toUpperCase().includes('WAHA'));
    const allEnvKeysPreview = allEnvKeys.slice(0, 50).join(', '); // Primeras 50 para no exponer todo
    
    diagnostics.checks.environmentVariables = {
      hasUrl: !!envUrl,
      hasKey: !!envKey,
      urlPreview: envUrl ? `${envUrl.substring(0, 30)}...` : null,
      keyLength: envKey ? envKey.length : 0,
      allWAHAEnvKeys: wahaEnvKeys.join(', '),
      totalEnvKeys: allEnvKeys.length,
      envKeysPreview: allEnvKeysPreview,
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      vercelUrl: process.env.VERCEL_URL,
      // Información adicional para debugging
      urlIsEmpty: envUrl === '',
      keyIsEmpty: envKey === '',
      urlIsUndefined: envUrl === undefined,
      keyIsUndefined: envKey === undefined
    };

    if (!envUrl || !envKey) {
      // Mensaje más detallado
      let reason = 'No encontradas';
      if (envUrl === '' || envKey === '') {
        reason = 'Están vacías (string vacío)';
      } else if (envUrl === undefined || envKey === undefined) {
        reason = 'No están definidas (undefined)';
      }
      
      diagnostics.warnings.push(`Variables de entorno WAHA no configuradas (WAHA_API_URL y WAHA_API_KEY) - ${reason}`);
      diagnostics.recommendations.push('Configura WAHA_API_URL y WAHA_API_KEY en Vercel (Settings → Environment Variables)');
      diagnostics.recommendations.push('Si ya las configuraste, verifica que: 1) Estén en el proyecto correcto, 2) Estén en el ambiente correcto (Production/Preview/Development), 3) Haya hecho redeploy después de agregarlas');
      diagnostics.recommendations.push('Las variables deben llamarse exactamente: WAHA_API_URL y WAHA_API_KEY (sin NEXT_PUBLIC_ ni otros prefijos)');
    } else {
      diagnostics.checks.environmentVariables.status = '✅ Configuradas correctamente';
    }

    // 3. Verificar configuración en base de datos
    try {
      const supabase = getSupabaseServiceClient();
      const { data: config, error: configError } = await supabase
        .from('ai_agent_config')
        .select('id, policies, whatsapp_session_name, enabled')
        .eq('organization_id', organizationId)
        .single();

      if (configError) {
        if (configError.code === 'PGRST116') {
          diagnostics.checks.databaseConfig = {
            success: false,
            found: false,
            message: 'No se encontró configuración en la base de datos'
          };
          diagnostics.errors.push('No existe configuración de AI agent para esta organización');
          diagnostics.recommendations.push('Crea una configuración en la tabla ai_agent_config para esta organización');
        } else {
          diagnostics.checks.databaseConfig = {
            success: false,
            error: configError.message,
            code: configError.code
          };
          diagnostics.errors.push('Error al leer configuración de BD: ' + configError.message);
        }
      } else if (config) {
        const policies = (config as any)?.policies;
        const dbUrl = policies?.waha_api_url || policies?.WAHA_API_URL;
        const dbKey = policies?.waha_api_key || policies?.WAHA_API_KEY;

        diagnostics.checks.databaseConfig = {
          success: true,
          found: true,
          configId: config.id,
          enabled: config.enabled,
          hasPolicies: !!policies,
          hasUrl: !!dbUrl,
          hasKey: !!dbKey,
          urlPreview: dbUrl ? `${dbUrl.substring(0, 30)}...` : null,
          keyLength: dbKey ? dbKey.length : 0,
          policiesKeys: policies ? Object.keys(policies) : []
        };

        if (!dbUrl || !dbKey) {
          diagnostics.errors.push('Configuración de WAHA no encontrada en policies de la BD');
          diagnostics.recommendations.push('Guarda waha_api_url y waha_api_key en policies de ai_agent_config');
        }
      }
    } catch (dbError: any) {
      diagnostics.checks.databaseConfig = {
        success: false,
        error: dbError.message
      };
      diagnostics.errors.push('Error al acceder a la base de datos: ' + dbError.message);
    }

    // 4. Intentar obtener configuración WAHA (de env vars o BD)
    let wahaConfig: { url: string; key: string } | null = null;
    try {
      wahaConfig = await getWahaConfig(organizationId);
      diagnostics.checks.wahaConfig = {
        success: true,
        source: envUrl && envKey ? 'environment' : 'database',
        urlPreview: wahaConfig.url.substring(0, 30) + '...',
        keyLength: wahaConfig.key.length
      };
    } catch (configError: any) {
      diagnostics.checks.wahaConfig = {
        success: false,
        error: configError.message
      };
      diagnostics.errors.push('No se pudo obtener configuración WAHA: ' + configError.message);
    }

    // 5. Intentar conectar con el servidor WAHA (si tenemos configuración)
    if (wahaConfig) {
      try {
        console.log('[Diagnose] 🔍 Probando conexión con WAHA:', wahaConfig.url);
        const testResponse = await fetch(`${wahaConfig.url}/api/sessions`, {
          method: 'GET',
          headers: {
            'X-Api-Key': wahaConfig.key,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 segundos timeout
        });

        diagnostics.checks.wahaServerConnection = {
          success: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText,
          source: diagnostics.checks.wahaConfig?.source || 'unknown'
        };

        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          diagnostics.errors.push(`Error al conectar con servidor WAHA: ${testResponse.status} - ${errorText}`);
        } else {
          // Intentar parsear la respuesta para ver si hay sesiones
          try {
            const sessions = await testResponse.json();
            diagnostics.checks.wahaServerConnection.sessionsCount = Array.isArray(sessions) ? sessions.length : 0;
          } catch (e) {
            // No es JSON, está bien
          }
        }
      } catch (serverError: any) {
        diagnostics.checks.wahaServerConnection = {
          success: false,
          error: serverError.message,
          source: diagnostics.checks.wahaConfig?.source || 'unknown'
        };
        diagnostics.errors.push('No se pudo conectar con el servidor WAHA: ' + serverError.message);
        diagnostics.recommendations.push('Verifica que el servidor WAHA esté funcionando y accesible');
      }
    } else {
      diagnostics.checks.wahaServerConnection = {
        success: false,
        skipped: true,
        reason: 'No hay configuración de WAHA disponible para probar'
      };
    }

    // 5. Resumen y recomendaciones
    const hasErrors = diagnostics.errors.length > 0;
    const hasWarnings = diagnostics.warnings.length > 0;

    if (!hasErrors && !hasWarnings) {
      diagnostics.summary = '✅ Todo parece estar configurado correctamente';
    } else if (hasErrors) {
      diagnostics.summary = '❌ Se encontraron errores que impiden la conexión';
    } else {
      diagnostics.summary = '⚠️ Se encontraron advertencias, pero la conexión debería funcionar';
    }

    return NextResponse.json({
      success: !hasErrors,
      diagnostics
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      diagnostics: {
        timestamp: new Date().toISOString(),
        error: 'Error inesperado durante el diagnóstico: ' + error.message
      }
    }, { status: 500 });
  }
}
