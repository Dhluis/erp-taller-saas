-- Script para limpiar números de teléfono mal guardados en la BD
-- Ejecutar en Supabase SQL Editor
-- Fecha: 2026-01-13
-- Descripción: Normaliza números de teléfono al formato estándar 52XXXXXXXXXX (12 dígitos)

-- 1. Ver los números actuales (antes de la limpieza)
SELECT 
  id,
  customer_phone,
  customer_name,
  created_at
FROM whatsapp_conversations
ORDER BY created_at DESC
LIMIT 20;

-- 2. Función para limpiar números de teléfono
-- Esta función convierte números al formato estándar 52XXXXXXXXXX (12 dígitos)
CREATE OR REPLACE FUNCTION clean_phone_number(raw_phone TEXT)
RETURNS TEXT AS $$
DECLARE
  cleaned TEXT;
BEGIN
  -- Remover caracteres no numéricos
  cleaned := regexp_replace(raw_phone, '[^0-9]', '', 'g');
  
  -- CASO 1: Ya tiene 12 dígitos y empieza con 52
  IF length(cleaned) = 12 AND cleaned LIKE '52%' THEN
    RETURN cleaned;
  END IF;
  
  -- CASO 2: Tiene 13 dígitos y empieza con 521 (remover el 1 del medio)
  IF length(cleaned) = 13 AND cleaned LIKE '521%' THEN
    RETURN '52' || substring(cleaned, 4);
  END IF;
  
  -- CASO 3: Tiene 10 dígitos (agregar 52 al inicio)
  IF length(cleaned) = 10 THEN
    RETURN '52' || cleaned;
  END IF;
  
  -- CASO 4: Tiene 11 dígitos y empieza con 1
  IF length(cleaned) = 11 AND cleaned LIKE '1%' THEN
    RETURN '52' || substring(cleaned, 2);
  END IF;
  
  -- CASO 5: Números muy largos - buscar patrón 52XXXXXXXXXX
  IF length(cleaned) >= 12 THEN
    -- Buscar secuencia de 52 seguida de 10 dígitos
    IF cleaned ~ '52[0-9]{10}' THEN
      -- Extraer los primeros 12 dígitos que empiecen con 52
      RETURN substring(cleaned FROM '(52[0-9]{10})');
    ELSE
      -- Tomar últimos 10 dígitos y agregar 52
      RETURN '52' || right(cleaned, 10);
    END IF;
  END IF;
  
  -- CASO 6: Números cortos - devolver con 52
  IF length(cleaned) < 10 AND length(cleaned) >= 8 THEN
    RETURN '52' || lpad(cleaned, 10, '0');
  END IF;
  
  -- DEFAULT: Devolver como está
  RETURN cleaned;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Actualizar todos los números en whatsapp_conversations
UPDATE whatsapp_conversations
SET 
  customer_phone = clean_phone_number(customer_phone),
  updated_at = NOW()
WHERE customer_phone IS NOT NULL
  AND customer_phone != clean_phone_number(customer_phone);

-- 4. Actualizar todos los números en whatsapp_messages
UPDATE whatsapp_messages
SET 
  from_number = clean_phone_number(from_number),
  to_number = clean_phone_number(to_number),
  updated_at = NOW()
WHERE (from_number IS NOT NULL AND from_number != clean_phone_number(from_number))
   OR (to_number IS NOT NULL AND to_number != clean_phone_number(to_number));

-- 5. Actualizar todos los números en leads (si tienen teléfonos de WhatsApp)
UPDATE leads
SET 
  phone = clean_phone_number(phone),
  updated_at = NOW()
WHERE phone IS NOT NULL
  AND phone != clean_phone_number(phone)
  AND lead_source = 'whatsapp';

-- 6. Ver los números después de la limpieza
SELECT 
  id,
  customer_phone,
  customer_name,
  created_at
FROM whatsapp_conversations
ORDER BY created_at DESC
LIMIT 20;

-- 7. Verificar que todos los números tengan formato correcto (12 dígitos, empiezan con 52)
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN length(customer_phone) = 12 AND customer_phone LIKE '52%' THEN 1 END) as correct_format,
  COUNT(CASE WHEN length(customer_phone) != 12 OR customer_phone NOT LIKE '52%' THEN 1 END) as incorrect_format
FROM whatsapp_conversations
WHERE customer_phone IS NOT NULL;

-- 8. (OPCIONAL) Eliminar la función temporal si ya no la necesitas
-- DROP FUNCTION IF EXISTS clean_phone_number(TEXT);

-- 9. Ver ejemplos de números corregidos
SELECT 
  customer_phone,
  customer_name,
  LENGTH(customer_phone) as phone_length,
  CASE 
    WHEN LENGTH(customer_phone) = 12 AND customer_phone LIKE '52%' THEN '✅ Correcto'
    ELSE '❌ Incorrecto'
  END as status
FROM whatsapp_conversations
WHERE customer_phone IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;
