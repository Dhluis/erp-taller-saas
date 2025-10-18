-- 📋 ACTUALIZAR ESTADOS DE WORK_ORDERS PARA KANBAN
-- Este script actualiza la tabla work_orders para incluir los nuevos estados del Kanban

-- 1. Eliminar constraint existente si existe
ALTER TABLE work_orders 
DROP CONSTRAINT IF EXISTS work_orders_status_check;

-- 2. Agregar nueva constraint con todos los estados del Kanban
ALTER TABLE work_orders 
ADD CONSTRAINT work_orders_status_check 
CHECK (status IN (
  'reception',           -- Recepción
  'diagnosis',           -- Diagnóstico  
  'initial_quote',       -- Cotización Inicial
  'waiting_approval',    -- Esperando Aprobación
  'disassembly',         -- Desarme
  'waiting_parts',       -- Espera de Piezas
  'assembly',            -- Armado
  'testing',             -- Pruebas
  'ready',               -- Listo para Entrega
  'completed',           -- Completada
  'cancelled'            -- Cancelada
));

-- 3. Actualizar estados existentes a los nuevos valores
-- Mapeo de estados antiguos a nuevos:
UPDATE work_orders 
SET status = CASE 
  WHEN status = 'pending' THEN 'reception'
  WHEN status = 'in_progress' THEN 'diagnosis'
  WHEN status = 'diagnosed' THEN 'initial_quote'
  WHEN status = 'approved' THEN 'waiting_approval'
  WHEN status = 'in_repair' THEN 'disassembly'
  WHEN status = 'waiting_parts' THEN 'waiting_parts'  -- Ya correcto
  WHEN status = 'completed' THEN 'completed'          -- Ya correcto
  WHEN status = 'cancelled' THEN 'cancelled'          -- Ya correcto
  WHEN status = 'delivered' THEN 'ready'              -- Cambiar delivered a ready
  ELSE 'reception'  -- Default para cualquier estado no reconocido
END;

-- 4. Verificar que todos los registros tengan estados válidos
SELECT 
  status,
  COUNT(*) as count
FROM work_orders 
GROUP BY status 
ORDER BY status;

-- 5. Mostrar resumen de la actualización
SELECT 
  'Estados actualizados correctamente' as message,
  COUNT(*) as total_orders
FROM work_orders;
