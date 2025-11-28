/**
 * DIAGNÓSTICO COMPLETO DE CONFIGURACIÓN WAHA
 * 
 * GET /api/whatsapp/diagnose
 * 
 * Verifica:
 * 1. Variables de entorno
 * 2. Configuración en BD
 * 3. Conexión a WAHA
 * 4. Sesiones disponibles
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/core/multi-tenant-server';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenantContext = await getTenantContext();
    if (!tenantContext) {
      return NextResponse.json({
        success: false,
        error: 'No autorizado'
      }, { status: 401 });
    }

    const organizationId = tenantContext.organizationId;
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      organizationId,
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        hasWAHA_API_URL: !!process.env.WAHA_API_URL,
        hasWAHA_API_KEY: !!process.env.WAHA_API_KEY,
        wahaUrlPreview: process.env.WAHA_API_URL ? `${process.env.WAHA_API_URL.substring(0, 30)}...` : 'NO SET',
        wahaKeyLength: process.env.WAHA_API_KEY?.length || 0
      },
      database: {
        hasConfig: false,
        policies: null,
        wahaConfig: null,
        error: null
      },
      wahaConnection: {
        reachable: false,
        sessions: null,
        error: null
      }
    };

    // 1. Verificar configuración en BD
    try {
      const supabase = getSupabaseServiceClient();
      const { data: config, error: configError } = await supabase
        .from('ai_agent_config')
        .select('id, policies, organization_id')
        .eq('organization_id', organizationId)
        .single();

      if (configError) {
        diagnostics.database.error = {
          message: configError.message,
          code: configError.code,
          hint: configError.hint
        };
      } else if (config) {
        diagnostics.database.hasConfig = true;
        diagnostics.database.policies = config.policies;
        
        const policies = config.policies as any;
        diagnostics.database.wahaConfig = {
          has_waha_api_url: !!policies?.waha_api_url,
          has_waha_api_key: !!policies?.waha_api_key,
          has_WAHA_API_URL: !!policies?.WAHA_API_URL,
          has_WAHA_API_KEY: !!policies?.WAHA_API_KEY,
          waha_url: policies?.waha_api_url || policies?.WAHA_API_URL || null,
          waha_key_configured: !!(policies?.waha_api_key || policies?.WAHA_API_KEY),
          allKeys: policies ? Object.keys(policies) : []
        };
      }
    } catch (dbError: any) {
      diagnostics.database.error = {
        message: dbError.message,
        stack: dbError.stack
      };
    }

    // 2. Intentar conectar a WAHA (si tenemos configuración)
    const wahaUrl = process.env.WAHA_API_URL || diagnostics.database.wahaConfig?.waha_url;
    const wahaKey = process.env.WAHA_API_KEY || 
      (diagnostics.database.policies as any)?.waha_api_key || 
      (diagnostics.database.policies as any)?.WAHA_API_KEY;

    if (wahaUrl && wahaKey) {
      try {
        const response = await fetch(`${wahaUrl}/api/sessions`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': wahaKey
          },
          signal: AbortSignal.timeout(5000)
        });

        if (response.ok) {
          diagnostics.wahaConnection.reachable = true;
          diagnostics.wahaConnection.sessions = await response.json();
        } else {
          diagnostics.wahaConnection.error = {
            status: response.status,
            statusText: response.statusText
          };
        }
      } catch (wahaError: any) {
        diagnostics.wahaConnection.error = {
          message: wahaError.message,
          type: wahaError.name
        };
      }
    }

    // 3. Resumen y recomendaciones
    const hasEnvConfig = !!process.env.WAHA_API_URL && !!process.env.WAHA_API_KEY;
    const hasDbConfig = diagnostics.database.wahaConfig?.waha_url && diagnostics.database.wahaConfig?.waha_key_configured;
    const canConnect = diagnostics.wahaConnection.reachable;

    diagnostics.summary = {
      hasEnvironmentConfig: hasEnvConfig,
      hasDatabaseConfig: hasDbConfig,
      canConnectToWAHA: canConnect,
      recommendedAction: !hasEnvConfig && !hasDbConfig
        ? 'Guardar configuración en BD usando POST /api/whatsapp/config'
        : !canConnect
        ? 'Verificar que WAHA esté funcionando y que las credenciales sean correctas'
        : 'Todo está configurado correctamente'
    };

    return NextResponse.json({
      success: true,
      diagnostics
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

