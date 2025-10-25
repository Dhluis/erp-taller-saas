-- ═══════════════════════════════════════════════════════════════
-- 🔔 SCRIPT PARA PROBAR SISTEMA DE NOTIFICACIONES
-- ═══════════════════════════════════════════════════════════════

-- PASO 1: Verificar que la tabla notifications existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'notifications';

-- PASO 2: Ver la estructura de la tabla
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- PASO 3: Verificar usuario actual (necesitarás este ID)
SELECT id, email 
FROM auth.users 
LIMIT 5;

-- ═══════════════════════════════════════════════════════════════
-- PASO 4: INSERTAR NOTIFICACIONES DE PRUEBA
-- ⚠️ IMPORTANTE: Reemplaza '301eb55a-f6f9-449f-ab04-8dcf8fc081a6' 
--    con tu user_id real del PASO 3
-- ═══════════════════════════════════════════════════════════════

-- Notificación de orden completada (no leída)
INSERT INTO notifications (
  organization_id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',  -- ⬅️ CAMBIAR POR TU USER_ID
  'order_completed',
  'Orden completada',
  'La orden #WO-001 ha sido completada exitosamente y está lista para entrega',
  false,
  NOW() - INTERVAL '30 minutes'  -- Hace 30 minutos
);

-- Notificación de stock bajo (no leída)
INSERT INTO notifications (
  organization_id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',  -- ⬅️ CAMBIAR POR TU USER_ID
  'stock_low',
  'Stock bajo',
  'El producto "Filtro de aceite" tiene stock bajo (5 unidades restantes)',
  false,
  NOW() - INTERVAL '2 hours'  -- Hace 2 horas
);

-- Notificación de nueva cotización (no leída)
INSERT INTO notifications (
  organization_id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',  -- ⬅️ CAMBIAR POR TU USER_ID
  'quotation_created',
  'Nueva cotización',
  'Se ha creado la cotización #COT-2024-015 para el cliente Juan Pérez',
  false,
  NOW() - INTERVAL '4 hours'  -- Hace 4 horas
);

-- Notificación de pago recibido (no leída)
INSERT INTO notifications (
  organization_id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',  -- ⬅️ CAMBIAR POR TU USER_ID
  'success',
  'Pago recibido',
  'Se ha recibido el pago de $5,500.00 para la factura #F-2024-001',
  false,
  NOW() - INTERVAL '6 hours'  -- Hace 6 horas
);

-- Notificación de cliente registrado (ya leída)
INSERT INTO notifications (
  organization_id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',  -- ⬅️ CAMBIAR POR TU USER_ID
  'info',
  'Cliente registrado',
  'Nuevo cliente "María García" agregado al sistema exitosamente',
  true,  -- Ya leída
  NOW() - INTERVAL '1 day'  -- Hace 1 día
);

-- Notificación de vehículo agregado (ya leída)
INSERT INTO notifications (
  organization_id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',  -- ⬅️ CAMBIAR POR TU USER_ID
  'success',
  'Vehículo agregado',
  'Se ha registrado el vehículo Toyota Corolla 2020 - Placa ABC123',
  true,  -- Ya leída
  NOW() - INTERVAL '2 days'  -- Hace 2 días
);

-- Notificación de alerta (ya leída)
INSERT INTO notifications (
  organization_id,
  user_id,
  type,
  title,
  message,
  read,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',  -- ⬅️ CAMBIAR POR TU USER_ID
  'warning',
  'Mantenimiento programado',
  'Recuerda realizar el mantenimiento del sistema este fin de semana',
  true,  -- Ya leída
  NOW() - INTERVAL '3 days'  -- Hace 3 días
);

-- ═══════════════════════════════════════════════════════════════
-- PASO 5: VERIFICAR NOTIFICACIONES INSERTADAS
-- ═══════════════════════════════════════════════════════════════

-- Ver todas las notificaciones
SELECT 
  id,
  type,
  title,
  message,
  read,
  created_at,
  user_id
FROM notifications
ORDER BY created_at DESC;

-- Contar notificaciones por estado
SELECT 
  read,
  COUNT(*) as total
FROM notifications
GROUP BY read;

-- Contar notificaciones por tipo
SELECT 
  type,
  COUNT(*) as total,
  SUM(CASE WHEN read = false THEN 1 ELSE 0 END) as unread
FROM notifications
GROUP BY type
ORDER BY total DESC;

-- Ver solo notificaciones no leídas
SELECT 
  type,
  title,
  message,
  created_at
FROM notifications
WHERE read = false
ORDER BY created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════════

-- Deberías ver:
-- ✅ 7 notificaciones insertadas
-- ✅ 4 no leídas (order_completed, stock_low, quotation_created, success)
-- ✅ 3 ya leídas (info, success, warning)

-- ═══════════════════════════════════════════════════════════════
-- LIMPIAR (Solo si quieres eliminar las notificaciones de prueba)
-- ═══════════════════════════════════════════════════════════════

-- ⚠️ DESCOMENTA SOLO SI QUIERES ELIMINAR TODO
-- DELETE FROM notifications 
-- WHERE user_id = '301eb55a-f6f9-449f-ab04-8dcf8fc081a6';  -- ⬅️ TU USER_ID






