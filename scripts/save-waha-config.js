/**
 * Script para guardar configuración de WAHA en la base de datos
 * 
 * Uso:
 *   node scripts/save-waha-config.js
 * 
 * O con variables de entorno:
 *   WAHA_URL=https://... WAHA_KEY=... node scripts/save-waha-config.js
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Valores de WAHA (puedes cambiarlos aquí o usar variables de entorno)
const WAHA_API_URL = process.env.WAHA_URL || process.env.WAHA_API_URL || 'https://waha-erp-eagles-sistem.0rfifc.easypanel.host';
const WAHA_API_KEY = process.env.WAHA_KEY || process.env.WAHA_API_KEY || 'mi_clave_segura_2025';

// Organization ID - NECESITAS CAMBIAR ESTO
const ORGANIZATION_ID = process.env.ORGANIZATION_ID || '042ab6bd-8979-4166-882a-c244b5e51e51';

async function saveWAHAConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar configurados');
    console.error('   Asegúrate de tener un archivo .env.local con estas variables');
    process.exit(1);
  }

  console.log('🔧 Guardando configuración de WAHA en la base de datos...');
  console.log('📋 Configuración:');
  console.log('   - WAHA_API_URL:', WAHA_API_URL);
  console.log('   - WAHA_API_KEY:', WAHA_API_KEY.substring(0, 10) + '...');
  console.log('   - Organization ID:', ORGANIZATION_ID);
  console.log('');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // 1. Verificar si existe la configuración
    console.log('🔍 Verificando configuración existente...');
    const { data: existingConfig, error: checkError } = await supabase
      .from('ai_agent_config')
      .select('id, policies')
      .eq('organization_id', ORGANIZATION_ID)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error verificando configuración:', checkError);
      process.exit(1);
    }

    if (!existingConfig) {
      console.error('❌ No existe configuración para esta organización');
      console.error('   Primero debes completar el wizard de entrenamiento del bot');
      console.error('   Ve a /dashboard/whatsapp/train-agent y completa los pasos');
      process.exit(1);
    }

    console.log('✅ Configuración encontrada');

    // 2. Actualizar policies con la configuración de WAHA
    const currentPolicies = existingConfig.policies || {};
    const updatedPolicies = {
      ...currentPolicies,
      waha_api_url: WAHA_API_URL,
      waha_api_key: WAHA_API_KEY,
      WAHA_API_URL: WAHA_API_URL, // También con mayúsculas por compatibilidad
      WAHA_API_KEY: WAHA_API_KEY  // También con mayúsculas por compatibilidad
    };

    console.log('💾 Actualizando configuración...');
    const { data: updatedConfig, error: updateError } = await supabase
      .from('ai_agent_config')
      .update({
        policies: updatedPolicies,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', ORGANIZATION_ID)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error actualizando configuración:', updateError);
      process.exit(1);
    }

    console.log('');
    console.log('✅ ¡Configuración guardada exitosamente!');
    console.log('');
    console.log('📝 Próximos pasos:');
    console.log('   1. Recarga la página de WhatsApp');
    console.log('   2. El sistema debería detectar la configuración automáticamente');
    console.log('   3. Revisa los logs del servidor para confirmar');
    console.log('');

  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  }
}

// Ejecutar
saveWAHAConfig();





















