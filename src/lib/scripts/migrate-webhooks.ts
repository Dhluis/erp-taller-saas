/**
 * Script de migración para actualizar webhooks de WhatsApp a sistema multi-tenant dinámico
 * 
 * Migra todas las organizaciones del sistema hardcodeado (WHATSAPP_HOOK_HEADERS en EasyPanel)
 * al sistema dinámico donde cada organización tiene su propio Organization ID en el webhook
 */

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { updateWebhookForOrganization, getOrganizationSession } from '@/lib/waha-sessions';

export interface MigrationResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    organizationId: string;
    sessionName?: string;
    error: string;
  }>;
}

/**
 * Migrar webhooks de todas las organizaciones
 */
export async function migrateAllWebhooks(): Promise<MigrationResult> {
  console.log('[Migration] ========================================');
  console.log('[Migration] 🚀 Iniciando migración de webhooks');
  console.log('[Migration] ========================================');

  const result: MigrationResult = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: []
  };

  try {
    const supabase = getSupabaseServiceClient();

    // 1. Obtener todas las organizaciones que tienen whatsapp_session_name
    console.log('[Migration] 📋 Buscando organizaciones con WhatsApp configurado...');
    const { data: configs, error: queryError } = await supabase
      .from('ai_agent_config')
      .select('organization_id, whatsapp_session_name')
      .not('whatsapp_session_name', 'is', null)
      .neq('whatsapp_session_name', '');

    if (queryError) {
      console.error('[Migration] ❌ Error consultando organizaciones:', queryError);
      throw new Error(`Error consultando organizaciones: ${queryError.message}`);
    }

    if (!configs || configs.length === 0) {
      console.log('[Migration] ℹ️ No se encontraron organizaciones con WhatsApp configurado');
      return result;
    }

    result.total = configs.length;
    console.log(`[Migration] 📊 Total de organizaciones encontradas: ${result.total}`);

    // 2. Procesar cada organización
    for (const config of configs) {
      const organizationId = config.organization_id;
      const sessionName = config.whatsapp_session_name as string;

      console.log('[Migration] ────────────────────────────────────────');
      console.log(`[Migration] 🔄 Procesando organización: ${organizationId}`);
      console.log(`[Migration] 📝 Session Name: ${sessionName}`);

      try {
        // Validar que sessionName no sea "default"
        if (!sessionName || sessionName.trim() === '' || sessionName === 'default') {
          const errorMsg = `Session name inválido: "${sessionName}"`;
          console.error(`[Migration] ❌ ${errorMsg}`);
          result.failed++;
          result.errors.push({
            organizationId,
            sessionName,
            error: errorMsg
          });
          continue;
        }

        // Actualizar webhook para esta organización
        console.log(`[Migration] 🔧 Actualizando webhook para ${sessionName}...`);
        await updateWebhookForOrganization(sessionName, organizationId);
        console.log(`[Migration] ✅ Webhook actualizado exitosamente para ${sessionName}`);
        result.successful++;

      } catch (error: any) {
        const errorMsg = error.message || 'Error desconocido';
        console.error(`[Migration] ❌ Error en ${sessionName}:`, errorMsg);
        result.failed++;
        result.errors.push({
          organizationId,
          sessionName,
          error: errorMsg
        });
      }
    }

    // 3. Resumen
    console.log('[Migration] ========================================');
    console.log('[Migration] === RESUMEN ===');
    console.log(`[Migration] Total: ${result.total}`);
    console.log(`[Migration] Exitosas: ${result.successful}`);
    console.log(`[Migration] Fallidas: ${result.failed}`);
    
    if (result.errors.length > 0) {
      console.log('[Migration] === ERRORES ===');
      result.errors.forEach((err, index) => {
        console.log(`[Migration] ${index + 1}. Org: ${err.organizationId}, Session: ${err.sessionName || 'N/A'}`);
        console.log(`[Migration]    Error: ${err.error}`);
      });
    }
    
    console.log('[Migration] ========================================');

    return result;

  } catch (error: any) {
    console.error('[Migration] ❌ Error crítico en migración:', error);
    throw error;
  }
}

