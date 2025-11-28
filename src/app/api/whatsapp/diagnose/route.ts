import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

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
    try {
      const tenantContext = await getTenantContext();
      diagnostics.checks.tenantContext = {
        success: true,
        organizationId: tenantContext.organizationId,
        workshopId: tenantContext.workshopId,
        userId: tenantContext.userId
      };
    } catch (error: any) {
      diagnostics.checks.tenantContext = {
        success: false,
        error: error.message
      };
      diagnostics.errors.push('No se pudo obtener el contexto del tenant: ' + error.message);
      return NextResponse.json({
        success: false,
        diagnostics
      }, { status: 500 });
    }

    const organizationId = diagnostics.checks.tenantContext.organizationId;

    // 2. Verificar variables de entorno
    const envUrl = process.env.WAHA_API_URL || process.env.NEXT_PUBLIC_WAHA_API_URL;
    const envKey = process.env.WAHA_API_KEY || process.env.NEXT_PUBLIC_WAHA_API_KEY;
    
    diagnostics.checks.environmentVariables = {
      hasUrl: !!envUrl,
      hasKey: !!envKey,
      urlPreview: envUrl ? `${envUrl.substring(0, 30)}...` : null,
      keyLength: envKey ? envKey.length : 0
    };

    if (!envUrl || !envKey) {
      diagnostics.warnings.push('Variables de entorno WAHA no configuradas');
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

    // 4. Intentar conectar con el servidor WAHA (si tenemos configuración)
    const wahaUrl = envUrl || diagnostics.checks.databaseConfig?.urlPreview;
    const wahaKey = envKey || (diagnostics.checks.databaseConfig?.hasKey ? '***' : null);

    if (wahaUrl && wahaKey && envKey) {
      try {
        const testResponse = await fetch(`${envUrl.replace(/\/$/, '')}/api/sessions`, {
          method: 'GET',
          headers: {
            'X-Api-Key': envKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000) // 5 segundos timeout
        });

        diagnostics.checks.wahaServerConnection = {
          success: testResponse.ok,
          status: testResponse.status,
          statusText: testResponse.statusText
        };

        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          diagnostics.errors.push(`Error al conectar con servidor WAHA: ${testResponse.status} - ${errorText}`);
        }
      } catch (serverError: any) {
        diagnostics.checks.wahaServerConnection = {
          success: false,
          error: serverError.message
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
