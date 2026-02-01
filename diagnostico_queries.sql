-- =====================================================
-- QUERIES DE DIAGNÓSTICO - Conversaciones Duplicadas
-- =====================================================
-- Ejecutar en Supabase SQL Editor
-- Reemplazar 'b3962fe4-d238-42bc-9455-4ed84a38c6b4' con tu organization_id

-- =====================================================
-- QUERY A: Todas las conversaciones con sus números
-- =====================================================
SELECT 
  id,
  customer_phone,
  customer_name,
  created_at,
  LENGTH(customer_phone) as largo_numero,
  status
FROM whatsapp_conversations
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
ORDER BY created_at DESC
LIMIT 30;

-- =====================================================
-- QUERY B: Números únicos vs duplicados
-- =====================================================
SELECT 
  customer_phone,
  COUNT(*) as cantidad_conversaciones,
  MIN(created_at) as primera,
  MAX(created_at) as ultima,
  LENGTH(customer_phone) as largo_numero,
  STRING_AGG(id::text, ', ') as ids_conversaciones
FROM whatsapp_conversations
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
GROUP BY customer_phone
ORDER BY cantidad_conversaciones DESC;

-- =====================================================
-- QUERY C: Columnas exactas de la tabla
-- =====================================================
SELECT 
  column_name, 
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'whatsapp_conversations'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- QUERY D: Mensajes recientes con sus conversaciones
-- =====================================================
SELECT 
  wm.id as message_id,
  wm.from_number,
  wm.to_number,
  wm.body,
  wm.sent_at,
  wc.customer_phone as conv_phone,
  wc.id as conversation_id,
  LENGTH(wm.from_number) as largo_from,
  LENGTH(wc.customer_phone) as largo_conv_phone
FROM whatsapp_messages wm
JOIN whatsapp_conversations wc ON wm.conversation_id = wc.id
WHERE wc.organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
ORDER BY wm.sent_at DESC
LIMIT 20;

-- =====================================================
-- QUERY E: Detectar números duplicados (mismo cliente, formato diferente)
-- =====================================================
WITH normalized_phones AS (
  SELECT 
    customer_phone,
    -- Extraer últimos 10 dígitos (número local sin código país)
    RIGHT(customer_phone, 10) as last_10_digits,
    id,
    created_at
  FROM whatsapp_conversations
  WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
)
SELECT 
  last_10_digits,
  COUNT(DISTINCT customer_phone) as formatos_diferentes,
  COUNT(*) as total_conversaciones,
  STRING_AGG(DISTINCT customer_phone, ', ') as numeros_encontrados,
  STRING_AGG(id::text, ', ') as ids_conversaciones
FROM normalized_phones
GROUP BY last_10_digits
HAVING COUNT(DISTINCT customer_phone) > 1
ORDER BY formatos_diferentes DESC;

-- =====================================================
-- QUERY F: Análisis de longitudes de números
-- =====================================================
SELECT 
  LENGTH(customer_phone) as longitud,
  COUNT(*) as cantidad,
  STRING_AGG(DISTINCT LEFT(customer_phone, 3), ', ') as prefijos_ejemplo
FROM whatsapp_conversations
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
GROUP BY LENGTH(customer_phone)
ORDER BY longitud;
