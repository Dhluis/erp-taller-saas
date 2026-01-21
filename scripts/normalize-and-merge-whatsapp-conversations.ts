/**
 * Script para normalizar números y hacer merge de conversaciones duplicadas
 * Uso: npx tsx scripts/normalize-and-merge-whatsapp-conversations.ts
 * 
 * ⚠️ IMPORTANTE: Este script procesa UNA SOLA ORGANIZACIÓN
 * Cambia la constante ORGANIZATION_ID con tu organization_id real
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { normalizePhoneNumber } from '@/lib/utils/phone-formatter';

async function normalizeAndMergeConversations() {
  console.log('🔄 Iniciando normalización y merge de conversaciones...\n');
  
  const supabase = getSupabaseServiceClient();
  
  // ✅ IMPORTANTE: Cambiar por tu organization_id real
  const ORGANIZATION_ID = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4';
  
  console.log(`📍 Organización: ${ORGANIZATION_ID}\n`);
  
  // 1. Obtener conversaciones de UNA SOLA ORGANIZACIÓN
  const { data: conversations, error } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('organization_id', ORGANIZATION_ID) // ← Filtrar por organización
    .order('created_at', { ascending: true }); // Más antiguas primero

  if (error || !conversations) {
    console.error('❌ Error obteniendo conversaciones:', error);
    return;
  }

  console.log(`📊 Total conversaciones de esta organización: ${conversations.length}\n`);

  // 2. Agrupar por número normalizado
  const grouped = new Map<string, typeof conversations>();

  for (const conv of conversations) {
    const normalizedPhone = normalizePhoneNumber(conv.customer_phone);
    
    if (!grouped.has(normalizedPhone)) {
      grouped.set(normalizedPhone, []);
    }
    grouped.get(normalizedPhone)!.push(conv);
  }

  // 3. Procesar cada grupo
  let normalizedCount = 0;
  let mergedCount = 0;

  for (const [normalizedPhone, group] of grouped.entries()) {
    
    if (group.length === 1) {
      // Solo 1 conversación, normalizar si es necesario
      const conv = group[0];
      if (conv.customer_phone !== normalizedPhone) {
        console.log(`📱 Normalizando: ${conv.customer_phone} → ${normalizedPhone}`);
        
        await supabase
          .from('whatsapp_conversations')
          .update({ 
            customer_phone: normalizedPhone,
            updated_at: new Date().toISOString()
          })
          .eq('id', conv.id);
        
        // También actualizar customer si existe
        if (conv.customer_id) {
          await supabase
            .from('customers')
            .update({ phone: normalizedPhone })
            .eq('id', conv.customer_id);
        }
        
        normalizedCount++;
      }
    } else {
      // Múltiples conversaciones duplicadas
      console.log(`\n🔗 Encontradas ${group.length} conversaciones duplicadas para: ${normalizedPhone}`);
      
      // Mantener la más antigua (primera del array ya que ordenamos por created_at asc)
      const mainConv = group[0];
      const duplicates = group.slice(1);
      
      console.log(`  ✅ Mantener conversación principal: ${mainConv.id} (${mainConv.created_at})`);
      
      // Normalizar número de la conversación principal
      if (mainConv.customer_phone !== normalizedPhone) {
        await supabase
          .from('whatsapp_conversations')
          .update({ 
            customer_phone: normalizedPhone,
            updated_at: new Date().toISOString()
          })
          .eq('id', mainConv.id);
      }
      
      // Mover mensajes de duplicados a la conversación principal
      for (const dup of duplicates) {
        console.log(`  📤 Migrando mensajes de: ${dup.id} → ${mainConv.id}`);
        
        // Mover mensajes
        const { error: moveError } = await supabase
          .from('whatsapp_messages')
          .update({ conversation_id: mainConv.id })
          .eq('conversation_id', dup.id);
        
        if (moveError) {
          console.error(`  ❌ Error migrando mensajes:`, moveError.message);
          continue;
        }
        
        // Eliminar conversación duplicada
        const { error: deleteError } = await supabase
          .from('whatsapp_conversations')
          .delete()
          .eq('id', dup.id);
        
        if (deleteError) {
          console.error(`  ❌ Error eliminando duplicado:`, deleteError.message);
        } else {
          console.log(`  ✅ Conversación duplicada eliminada: ${dup.id}`);
          mergedCount++;
        }
      }
      
      // Actualizar count de mensajes en conversación principal
      const { count } = await supabase
        .from('whatsapp_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', mainConv.id);
      
      await supabase
        .from('whatsapp_conversations')
        .update({ 
          messages_count: count || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', mainConv.id);
      
      console.log(`  ✅ Count actualizado: ${count} mensajes`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 RESUMEN DE MIGRACIÓN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📱 Números normalizados: ${normalizedCount}`);
  console.log(`🔗 Conversaciones merged: ${mergedCount}`);
  console.log(`✅ Total procesado: ${conversations.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// Ejecutar
normalizeAndMergeConversations()
  .then(() => {
    console.log('✅ Migración completada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });

