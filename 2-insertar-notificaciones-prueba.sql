-- ═══════════════════════════════════════════════════════════════
-- 🔔 PASO 2: INSERTAR NOTIFICACIONES DE PRUEBA
-- ═══════════════════════════════════════════════════════════════
-- Este script insertará 7 notificaciones de prueba para tu usuario
-- ═══════════════════════════════════════════════════════════════

-- ⚠️ IMPORTANTE: Si tu user_id NO ES este, cámbialo:
-- Tu user_id actual parece ser: 301eb55a-f6f9-449f-ab04-8dcf8fc081a6

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICACIÓN 1: Orden completada (NO LEÍDA)
-- ═══════════════════════════════════════════════════════════════
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
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',
  'order_completed',
  'Orden completada',
  'La orden #WO-001 ha sido completada exitosamente y está lista para entrega',
  false,
  NOW() - INTERVAL '30 minutes'
);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICACIÓN 2: Stock bajo (NO LEÍDA)
-- ═══════════════════════════════════════════════════════════════
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
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',
  'stock_low',
  'Stock bajo',
  'El producto "Filtro de aceite" tiene stock bajo (5 unidades restantes)',
  false,
  NOW() - INTERVAL '2 hours'
);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICACIÓN 3: Nueva cotización (NO LEÍDA)
-- ═══════════════════════════════════════════════════════════════
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
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',
  'quotation_created',
  'Nueva cotización',
  'Se ha creado la cotización #COT-2024-015 para el cliente Juan Pérez',
  false,
  NOW() - INTERVAL '4 hours'
);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICACIÓN 4: Pago recibido (NO LEÍDA)
-- ═══════════════════════════════════════════════════════════════
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
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',
  'success',
  'Pago recibido',
  'Se ha recibido el pago de $5,500.00 para la factura #F-2024-001',
  false,
  NOW() - INTERVAL '6 hours'
);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICACIÓN 5: Cliente registrado (YA LEÍDA)
-- ═══════════════════════════════════════════════════════════════
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
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',
  'info',
  'Cliente registrado',
  'Nuevo cliente "María García" agregado al sistema exitosamente',
  true,
  NOW() - INTERVAL '1 day'
);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICACIÓN 6: Vehículo agregado (YA LEÍDA)
-- ═══════════════════════════════════════════════════════════════
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
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',
  'success',
  'Vehículo agregado',
  'Se ha registrado el vehículo Toyota Corolla 2020 - Placa ABC123',
  true,
  NOW() - INTERVAL '2 days'
);

-- ═══════════════════════════════════════════════════════════════
-- NOTIFICACIÓN 7: Mantenimiento (YA LEÍDA)
-- ═══════════════════════════════════════════════════════════════
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
  '301eb55a-f6f9-449f-ab04-8dcf8fc081a6',
  'warning',
  'Mantenimiento programado',
  'Recuerda realizar el mantenimiento del sistema este fin de semana',
  true,
  NOW() - INTERVAL '3 days'
);

-- ═══════════════════════════════════════════════════════════════
-- ✅ VERIFICACIÓN: Ver las notificaciones insertadas
-- ═══════════════════════════════════════════════════════════════
SELECT 
  id,
  type,
  title,
  read,
  created_at
FROM notifications
WHERE user_id = '301eb55a-f6f9-449f-ab04-8dcf8fc081a6'
ORDER BY created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- 📊 RESULTADO ESPERADO:
-- ═══════════════════════════════════════════════════════════════
-- ✅ 7 filas insertadas
-- ✅ 4 con read = false (no leídas)
-- ✅ 3 con read = true (ya leídas)
-- ═══════════════════════════════════════════════════════════════





