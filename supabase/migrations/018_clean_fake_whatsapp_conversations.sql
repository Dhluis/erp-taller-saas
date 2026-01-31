-- =====================================================
-- MIGRACIÓN: Limpiar Conversaciones Ficticias de WhatsApp
-- =====================================================
-- 
-- PROBLEMA:
-- WAHA envía dos tipos de identificadores:
-- - @c.us → número real (ej: 5214494533160@c.us) ✅
-- - @lid → ID interno de WhatsApp (ej: 93832184119502@lid) ❌
-- 
-- El webhook anterior guardaba @lid como si fuera número real,
-- creando conversaciones ficticias.
--
-- SOLUCIÓN:
-- 1. Eliminar mensajes de conversaciones ficticias
-- 2. Eliminar conversaciones ficticias
-- 3. Conversaciones válidas tienen formato: 521XXXXXXXXX (13 dígitos, empieza con 521)
--
-- ⚠️ IMPORTANTE: Ejecutar primero la query de verificación para ver qué se eliminará
-- =====================================================

-- =====================================================
-- PASO A: VERIFICACIÓN - Ver qué se va a eliminar
-- =====================================================
-- Ejecutar esto PRIMERO para verificar antes de eliminar
-- Reemplazar 'TU_ORGANIZATION_ID' con el ID real

/*
SELECT 
  wc.id,
  wc.customer_phone,
  wc.customer_name,
  wc.messages_count,
  wc.created_at,
  LENGTH(wc.customer_phone) as largo,
  CASE 
    WHEN LENGTH(wc.customer_phone) != 13 THEN '❌ Longitud incorrecta'
    WHEN wc.customer_phone NOT LIKE '521%' THEN '❌ No empieza con 521'
    ELSE '✅ Válido'
  END as estado
FROM whatsapp_conversations wc
WHERE wc.organization_id = 'TU_ORGANIZATION_ID'
  AND (LENGTH(wc.customer_phone) != 13 OR wc.customer_phone NOT LIKE '521%')
ORDER BY wc.created_at DESC;
*/

-- =====================================================
-- PASO B: Eliminar mensajes de conversaciones ficticias
-- =====================================================
-- ⚠️ Ejecutar solo después de verificar en PASO A

DELETE FROM whatsapp_messages
WHERE conversation_id IN (
  SELECT id 
  FROM whatsapp_conversations
  WHERE organization_id = 'TU_ORGANIZATION_ID'
    AND (
      -- Conversaciones con números que NO son válidos (no tienen 13 dígitos o no empiezan con 521)
      LENGTH(customer_phone) != 13 
      OR customer_phone NOT LIKE '521%'
      -- También eliminar números que son claramente IDs de WhatsApp (muy largos o muy cortos)
      OR LENGTH(customer_phone) < 10
      OR LENGTH(customer_phone) > 15
    )
);

-- =====================================================
-- PASO C: Eliminar conversaciones ficticias
-- =====================================================
-- ⚠️ Ejecutar solo después de PASO B

DELETE FROM whatsapp_conversations
WHERE organization_id = 'TU_ORGANIZATION_ID'
  AND (
    -- Conversaciones con números que NO son válidos
    LENGTH(customer_phone) != 13 
    OR customer_phone NOT LIKE '521%'
    -- También eliminar números que son claramente IDs de WhatsApp
    OR LENGTH(customer_phone) < 10
    OR LENGTH(customer_phone) > 15
  );

-- =====================================================
-- PASO D: Verificar resultado
-- =====================================================
-- Ejecutar después de PASO C para verificar que solo quedan conversaciones válidas

/*
SELECT 
  customer_phone,
  LENGTH(customer_phone) as largo,
  messages_count,
  created_at,
  CASE 
    WHEN LENGTH(customer_phone) = 13 AND customer_phone LIKE '521%' THEN '✅ Válido'
    ELSE '❌ Inválido'
  END as estado
FROM whatsapp_conversations
WHERE organization_id = 'TU_ORGANIZATION_ID'
ORDER BY created_at DESC;
*/

-- =====================================================
-- NOTAS:
-- =====================================================
-- 1. Reemplazar 'TU_ORGANIZATION_ID' con el ID real de tu organización
-- 2. Ejecutar PASO A primero para verificar qué se eliminará
-- 3. Si estás seguro, ejecutar PASO B y luego PASO C
-- 4. Ejecutar PASO D para verificar el resultado
-- 5. Las conversaciones válidas tienen formato: 521XXXXXXXXX (13 dígitos)
-- 6. Este script es seguro: solo elimina conversaciones que claramente son ficticias
