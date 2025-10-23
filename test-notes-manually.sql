-- ═══════════════════════════════════════════════════════════════
-- SCRIPT PARA PROBAR AGREGAR NOTAS MANUALMENTE
-- ═══════════════════════════════════════════════════════════════

-- PASO 1: Ver el ID de una orden existente
SELECT 
  id,
  status,
  notes,
  created_at
FROM work_orders 
ORDER BY created_at DESC 
LIMIT 5;

-- PASO 2: Copiar un ID de arriba y reemplazarlo abajo
-- Reemplaza 'TU-ORDER-ID-AQUI' con un ID real

-- PASO 3: Intentar agregar una nota manualmente
DO $$
DECLARE
  order_id_var uuid := 'da57888b-c899-4f40-87a0-4b60dbcae83c'; -- ← REEMPLAZA ESTE ID
  new_note jsonb;
  current_notes jsonb;
  updated_notes jsonb;
BEGIN
  -- Crear una nota de prueba
  new_note := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'text', 'Nota de prueba desde SQL',
    'createdAt', now()::text,
    'createdBy', 'test-user',
    'userName', 'Usuario de Prueba',
    'isPinned', false,
    'category', 'general'
  );

  -- Obtener notas actuales
  SELECT COALESCE(notes, '[]'::jsonb) 
  INTO current_notes
  FROM work_orders 
  WHERE id = order_id_var;

  -- Agregar la nueva nota al inicio del array
  updated_notes := jsonb_build_array(new_note) || current_notes;

  -- Actualizar la orden
  UPDATE work_orders 
  SET 
    notes = updated_notes,
    updated_at = now()
  WHERE id = order_id_var;

  -- Mostrar resultado
  RAISE NOTICE 'Nota agregada exitosamente';
  RAISE NOTICE 'Notas antes: %', jsonb_array_length(current_notes);
  RAISE NOTICE 'Notas después: %', jsonb_array_length(updated_notes);
END $$;

-- PASO 4: Verificar que se agregó
SELECT 
  id,
  jsonb_array_length(notes) as num_notes,
  notes
FROM work_orders 
WHERE id = 'da57888b-c899-4f40-87a0-4b60dbcae83c'; -- ← REEMPLAZA ESTE ID

-- PASO 5: Ver la última nota agregada
SELECT 
  id,
  notes->0->>'text' as ultima_nota,
  notes->0->>'createdAt' as fecha,
  notes->0->>'userName' as usuario,
  jsonb_array_length(notes) as total_notas
FROM work_orders 
WHERE id = 'da57888b-c899-4f40-87a0-4b60dbcae83c' -- ← REEMPLAZA ESTE ID
  AND notes IS NOT NULL 
  AND jsonb_array_length(notes) > 0;





