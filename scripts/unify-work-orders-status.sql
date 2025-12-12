-- =====================================================
-- UNIFICAR ESTADOS DE WORK_ORDERS
-- =====================================================
-- Este script unifica los estados de work_orders entre
-- la base de datos y la documentación
-- Fecha: Diciembre 2024

-- =====================================================
-- PASO 1: Verificar constraint actual
-- =====================================================
-- Ejecutar primero para ver el constraint actual:
-- SELECT con.conname, pg_get_constraintdef(con.oid) 
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname = 'work_orders' 
--   AND con.contype = 'c'
--   AND con.conname LIKE '%status%';

-- =====================================================
-- PASO 2: Verificar estados usados en producción
-- =====================================================
-- Ejecutar para ver qué estados se están usando:
-- SELECT DISTINCT status, COUNT(*) as count
-- FROM work_orders
-- GROUP BY status
-- ORDER BY count DESC;

-- =====================================================
-- PASO 3: Eliminar constraint existente
-- =====================================================
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- =====================================================
-- PASO 4: Agregar constraint con 11 estados unificados
-- =====================================================
-- Estados oficiales según documentación y flujo Kanban:
ALTER TABLE work_orders 
ADD CONSTRAINT work_orders_status_check 
CHECK (status IN (
  'reception',           -- Recepción del vehículo
  'diagnosis',          -- Diagnóstico del problema
  'initial_quote',      -- Cotización inicial
  'waiting_approval',   -- Esperando aprobación del cliente
  'disassembly',        -- Desmontaje
  'waiting_parts',      -- Esperando piezas
  'assembly',           -- Reensamblaje
  'testing',            -- Pruebas de funcionamiento
  'ready',              -- Listo para entrega
  'completed',          -- Completada y entregada
  'cancelled'           -- Cancelada
));

-- =====================================================
-- PASO 5: Migrar estados antiguos a nuevos (si existen)
-- =====================================================
-- Mapeo de estados legacy a estados nuevos:
UPDATE work_orders 
SET status = CASE 
  WHEN status = 'pending' THEN 'reception'        -- pending → reception
  WHEN status = 'in_progress' THEN 'diagnosis'   -- in_progress → diagnosis
  WHEN status = 'diagnosed' THEN 'initial_quote' -- diagnosed → initial_quote
  WHEN status = 'approved' THEN 'waiting_approval' -- approved → waiting_approval
  WHEN status = 'in_repair' THEN 'disassembly'   -- in_repair → disassembly
  WHEN status = 'delivered' THEN 'ready'         -- delivered → ready
  -- Estados que ya son correctos, mantenerlos:
  WHEN status IN (
    'reception', 'diagnosis', 'initial_quote', 'waiting_approval',
    'disassembly', 'waiting_parts', 'assembly', 'testing',
    'ready', 'completed', 'cancelled'
  ) THEN status
  -- Default para cualquier estado no reconocido:
  ELSE 'reception'
END
WHERE status NOT IN (
  'reception', 'diagnosis', 'initial_quote', 'waiting_approval',
  'disassembly', 'waiting_parts', 'assembly', 'testing',
  'ready', 'completed', 'cancelled'
);

-- =====================================================
-- PASO 6: Verificar migración
-- =====================================================
-- Verificar que todos los registros tengan estados válidos:
SELECT 
  status,
  COUNT(*) as count
FROM work_orders 
GROUP BY status 
ORDER BY status;

-- Verificar que no hay estados inválidos:
SELECT 
  COUNT(*) as invalid_status_count
FROM work_orders
WHERE status NOT IN (
  'reception', 'diagnosis', 'initial_quote', 'waiting_approval',
  'disassembly', 'waiting_parts', 'assembly', 'testing',
  'ready', 'completed', 'cancelled'
);

-- =====================================================
-- PASO 7: Comentarios para documentación
-- =====================================================
COMMENT ON COLUMN work_orders.status IS 
'Estado de la orden de trabajo. Valores permitidos: 
reception (Recepción), diagnosis (Diagnóstico), 
initial_quote (Cotización Inicial), waiting_approval (Esperando Aprobación),
disassembly (Desmontaje), waiting_parts (Esperando Piezas),
assembly (Reensamblaje), testing (Pruebas),
ready (Listo para Entrega), completed (Completada), cancelled (Cancelada)';

-- =====================================================
-- RESUMEN
-- =====================================================
SELECT 
  'Estados unificados correctamente' as message,
  COUNT(*) as total_orders,
  COUNT(DISTINCT status) as unique_statuses
FROM work_orders;

