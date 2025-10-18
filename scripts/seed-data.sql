-- ============================================
-- SCRIPT DE DATOS DE PRUEBA - ERP TALLER
-- ============================================
-- Ejecutar este script en Supabase SQL Editor
-- Estructura actualizada según tablas reales
-- ============================================

-- 1. LIMPIAR DATOS ANTERIORES (OPCIONAL - descomentar si quieres limpiar)
-- DELETE FROM work_orders WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
-- DELETE FROM vehicles; -- No tiene organization_id, eliminar todos relacionados a clientes
-- DELETE FROM inventory WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
-- DELETE FROM inventory_categories WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
-- DELETE FROM customers WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
-- DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001'::uuid;

-- ============================================
-- 2. INSERTAR ORGANIZACIÓN
-- ============================================
INSERT INTO organizations (id, name, address, phone, email, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Taller Eagles Demo',
  'Av. Tecnológico #1000, Aguascalientes, AGS',
  '449-123-4567',
  'contacto@tallereaglesdemo.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  updated_at = NOW();

-- ============================================
-- 3. INSERTAR CLIENTES (10 clientes)
-- ============================================
INSERT INTO customers (id, organization_id, name, email, phone, address, notes, created_at, updated_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Juan Pérez García', 'juan.perez@email.com', '4491234567', 'Av. Tecnológico #123', 'Cliente frecuente', NOW() - INTERVAL '45 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'María González López', 'maria.gonzalez@email.com', '4491234568', 'Blvd. Zacatecas Norte #456', NULL, NOW() - INTERVAL '38 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Carlos Martínez Ruiz', 'carlos.martinez@email.com', '4491234569', 'Av. Convención #789', NULL, NOW() - INTERVAL '30 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Ana Rodríguez Sánchez', 'ana.rodriguez@email.com', '4491234570', 'Pastores #202', 'Prefiere servicio express', NOW() - INTERVAL '25 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Luis Hernández Castro', 'luis.hernandez@email.com', '4491234571', 'Av. Universidad #345', NULL, NOW() - INTERVAL '20 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Laura Ramírez Torres', 'laura.ramirez@email.com', '4491234572', 'Blvd. Luis Donaldo Colosio #678', NULL, NOW() - INTERVAL '15 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Miguel Flores Jiménez', 'miguel.flores@email.com', '4491234573', 'Av. Aguascalientes Norte #901', 'VIP', NOW() - INTERVAL '10 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Patricia Díaz Morales', 'patricia.diaz@email.com', '4491234574', 'Héroe de Nacozari #234', NULL, NOW() - INTERVAL '7 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Roberto Vargas Silva', 'roberto.vargas@email.com', '4491234575', 'Av. Independencia #567', NULL, NOW() - INTERVAL '3 days', NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Sandra Mendoza Reyes', 'sandra.mendoza@email.com', '4491234576', 'Blvd. San Marcos #890', 'Nuevo cliente', NOW() - INTERVAL '1 day', NOW());

-- ============================================
-- 4. INSERTAR VEHÍCULOS (15 vehículos)
-- Nota: vehicles NO tiene organization_id, solo customer_id
-- ============================================
WITH customer_ids AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM customers 
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid::uuid
  LIMIT 10
)
INSERT INTO vehicles (id, customer_id, brand, model, year, license_plate, vin, color, mileage, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  id,
  brand,
  model,
  year,
  license_plate,
  vin,
  color,
  mileage,
  NOW() - (rn || ' days')::INTERVAL,
  NOW()
FROM customer_ids
CROSS JOIN LATERAL (
  VALUES 
    ('Toyota', 'Corolla', 2020, 'ABC-123-A', 'VIN' || LPAD(rn::text, 14, '0'), 'Plata', 45000),
    ('Honda', 'Civic', 2019, 'DEF-456-B', 'VIN' || LPAD((rn+10)::text, 14, '0'), 'Negro', 38000)
) AS v(brand, model, year, license_plate, vin, color, mileage)
WHERE rn <= 10
UNION ALL
SELECT 
  gen_random_uuid(),
  (SELECT id FROM customer_ids WHERE rn = 1),
  'Nissan',
  'Sentra',
  2021,
  'GHI-789-C',
  'VIN00000000000031',
  'Blanco',
  25000,
  NOW() - INTERVAL '5 days',
  NOW()
UNION ALL
SELECT 
  gen_random_uuid(),
  (SELECT id FROM customer_ids WHERE rn = 3),
  'Chevrolet',
  'Aveo',
  2018,
  'JKL-012-D',
  'VIN00000000000032',
  'Rojo',
  72000,
  NOW() - INTERVAL '12 days',
  NOW()
UNION ALL
SELECT 
  gen_random_uuid(),
  (SELECT id FROM customer_ids WHERE rn = 5),
  'Volkswagen',
  'Jetta',
  2022,
  'MNO-345-E',
  'VIN00000000000033',
  'Azul',
  15000,
  NOW() - INTERVAL '8 days',
  NOW()
UNION ALL
SELECT 
  gen_random_uuid(),
  (SELECT id FROM customer_ids WHERE rn = 7),
  'Mazda',
  'CX-5',
  2021,
  'PQR-678-F',
  'VIN00000000000034',
  'Gris',
  32000,
  NOW() - INTERVAL '4 days',
  NOW()
UNION ALL
SELECT 
  gen_random_uuid(),
  (SELECT id FROM customer_ids WHERE rn = 2),
  'Ford',
  'Focus',
  2019,
  'STU-901-G',
  'VIN00000000000035',
  'Verde',
  58000,
  NOW() - INTERVAL '15 days',
  NOW();

-- ============================================
-- 5. INSERTAR ÓRDENES DE TRABAJO (20 órdenes en diferentes estados)
-- ============================================
WITH vehicle_data AS (
  SELECT 
    v.id as vehicle_id,
    v.customer_id,
    ROW_NUMBER() OVER (ORDER BY v.created_at) as rn
  FROM vehicles v
  WHERE v.customer_id IN (
    SELECT id FROM customers 
    WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
  )
  LIMIT 15
)
INSERT INTO work_orders (
  id, 
  organization_id, 
  customer_id, 
  vehicle_id, 
  status, 
  description,
  notes,
  estimated_cost,
  final_cost,
  subtotal,
  tax_amount,
  discount_amount,
  total_amount,
  entry_date,
  estimated_completion,
  completed_at,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  customer_id,
  vehicle_id,
  CASE 
    WHEN rn <= 3 THEN 'pending'
    WHEN rn <= 6 THEN 'in_progress'
    WHEN rn <= 8 THEN 'in_progress'
    WHEN rn <= 10 THEN 'in_progress'
    WHEN rn <= 12 THEN 'in_progress'
    WHEN rn <= 13 THEN 'pending'
    WHEN rn <= 14 THEN 'completed'
    ELSE 'completed'
  END as status,
  CASE 
    WHEN rn % 5 = 0 THEN 'Cambio de aceite y filtro. Revisión general de niveles.'
    WHEN rn % 5 = 1 THEN 'Afinación mayor. Cambio de bujías, filtros y revisión de frenos.'
    WHEN rn % 5 = 2 THEN 'Cambio de balatas y discos delanteros. Purga de frenos.'
    WHEN rn % 5 = 3 THEN 'Servicio de transmisión automática. Cambio de aceite y filtro.'
    ELSE 'Diagnóstico completo de motor. Revisión de sensores.'
  END as description,
  'Trabajo programado' as notes,
  CASE 
    WHEN rn % 5 = 0 THEN 850.00
    WHEN rn % 5 = 1 THEN 2500.00
    WHEN rn % 5 = 2 THEN 1800.00
    WHEN rn % 5 = 3 THEN 3200.00
    ELSE 4500.00
  END as estimated_cost,
  CASE 
    WHEN rn >= 14 THEN -- solo completadas tienen costo final
      CASE 
        WHEN rn % 5 = 0 THEN 820.00
        WHEN rn % 5 = 1 THEN 2450.00
        WHEN rn % 5 = 2 THEN 1850.00
        WHEN rn % 5 = 3 THEN 3150.00
        ELSE 4600.00
      END
    ELSE NULL
  END as final_cost,
  CASE 
    WHEN rn >= 14 THEN
      CASE 
        WHEN rn % 5 = 0 THEN 707.00
        WHEN rn % 5 = 1 THEN 2112.00
        WHEN rn % 5 = 2 THEN 1595.00
        WHEN rn % 5 = 3 THEN 2715.00
        ELSE 3965.00
      END
    ELSE NULL
  END as subtotal,
  CASE 
    WHEN rn >= 14 THEN
      CASE 
        WHEN rn % 5 = 0 THEN 113.00
        WHEN rn % 5 = 1 THEN 338.00
        WHEN rn % 5 = 2 THEN 255.00
        WHEN rn % 5 = 3 THEN 435.00
        ELSE 635.00
      END
    ELSE NULL
  END as tax_amount,
  0.00 as discount_amount,
  CASE 
    WHEN rn >= 14 THEN
      CASE 
        WHEN rn % 5 = 0 THEN 820.00
        WHEN rn % 5 = 1 THEN 2450.00
        WHEN rn % 5 = 2 THEN 1850.00
        WHEN rn % 5 = 3 THEN 3150.00
        ELSE 4600.00
      END
    ELSE NULL
  END as total_amount,
  NOW() - (rn * 2 || ' days')::INTERVAL as entry_date,
  NOW() - (rn * 2 || ' days')::INTERVAL + INTERVAL '3 days' as estimated_completion,
  CASE 
    WHEN rn >= 14 THEN NOW() - (rn || ' days')::INTERVAL
    ELSE NULL
  END as completed_at,
  NOW() - (rn * 2 || ' days')::INTERVAL as created_at,
  NOW() - (rn * 2 || ' days')::INTERVAL as updated_at
FROM vehicle_data
WHERE rn <= 15;

-- ============================================
-- 6. INSERTAR CATEGORÍAS DE INVENTARIO
-- ============================================
INSERT INTO inventory_categories (id, organization_id, name, description, parent_id, status, created_at, updated_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Aceites y Lubricantes', 'Aceites de motor, transmisión y lubricantes', NULL, 'active', NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Filtros', 'Filtros de aceite, aire, combustible y cabina', NULL, 'active', NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Frenos', 'Balatas, discos, tambores y líquido de frenos', NULL, 'active', NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Suspensión', 'Amortiguadores, resortes y brazos', NULL, 'active', NOW(), NOW()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, 'Eléctrico', 'Baterías, alternadores, motores de arranque', NULL, 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. INSERTAR PRODUCTOS DE INVENTARIO (20 productos)
-- ============================================
WITH category_ids AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM inventory_categories
  WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
)
INSERT INTO inventory (
  id,
  organization_id,
  category_id,
  code,
  sku,
  name,
  description,
  quantity,
  current_stock,
  min_quantity,
  min_stock,
  max_stock,
  unit_price,
  category,
  unit,
  status,
  barcode,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  category_ids.id,
  code,
  sku,
  product_name,
  description,
  quantity,
  quantity,
  min_quantity,
  min_quantity,
  max_stock,
  unit_price,
  category_ids.name,
  'pza',
  'active',
  'BAR' || code,
  NOW(),
  NOW()
FROM category_ids
CROSS JOIN LATERAL (
  VALUES
    ('ACE-001', 'ACE-001', 'Aceite Sintético 5W-30', 'Aceite sintético premium 5W-30 para motor', 45, 20, 100, 350.00),
    ('ACE-002', 'ACE-002', 'Aceite Semi-Sintético 10W-40', 'Aceite semi-sintético 10W-40', 8, 15, 80, 280.00),
    ('ACE-003', 'ACE-003', 'Aceite para Transmisión ATF', 'Aceite para transmisión automática', 25, 10, 60, 420.00),
    ('LUB-001', 'LUB-001', 'Grasa Multiusos', 'Grasa multiusos de litio', 30, 15, 70, 180.00)
  ) AS products(code, sku, product_name, description, quantity, min_quantity, max_stock, unit_price)
WHERE category_ids.name = 'Aceites y Lubricantes'
UNION ALL
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  category_ids.id,
  code,
  sku,
  product_name,
  description,
  quantity,
  quantity,
  min_quantity,
  min_quantity,
  max_stock,
  unit_price,
  category_ids.name,
  'pza',
  'active',
  'BAR' || code,
  NOW(),
  NOW()
FROM category_ids
CROSS JOIN LATERAL (
  VALUES
    ('FIL-001', 'FIL-001', 'Filtro de Aceite Universal', 'Filtro de aceite compatible con múltiples marcas', 65, 30, 150, 85.00),
    ('FIL-002', 'FIL-002', 'Filtro de Aire', 'Filtro de aire de alto rendimiento', 5, 20, 100, 120.00),
    ('FIL-003', 'FIL-003', 'Filtro de Combustible', 'Filtro de combustible de alta eficiencia', 9, 15, 80, 95.00),
    ('FIL-004', 'FIL-004', 'Filtro de Cabina', 'Filtro de cabina con carbón activado', 38, 20, 100, 150.00)
  ) AS products(code, sku, product_name, description, quantity, min_quantity, max_stock, unit_price)
WHERE category_ids.name = 'Filtros'
UNION ALL
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  category_ids.id,
  code,
  sku,
  product_name,
  description,
  quantity,
  quantity,
  min_quantity,
  min_quantity,
  max_stock,
  unit_price,
  category_ids.name,
  'pza',
  'active',
  'BAR' || code,
  NOW(),
  NOW()
FROM category_ids
CROSS JOIN LATERAL (
  VALUES
    ('FRE-001', 'FRE-001', 'Balatas Delanteras', 'Balatas delanteras cerámicas', 22, 15, 50, 650.00),
    ('FRE-002', 'FRE-002', 'Balatas Traseras', 'Balatas traseras cerámicas', 18, 15, 50, 580.00),
    ('FRE-003', 'FRE-003', 'Discos de Freno Delanteros', 'Par de discos ventilados delanteros', 6, 10, 30, 1200.00),
    ('FRE-004', 'FRE-004', 'Líquido de Frenos DOT 4', 'Líquido de frenos DOT 4 sintético', 28, 20, 60, 120.00)
  ) AS products(code, sku, product_name, description, quantity, min_quantity, max_stock, unit_price)
WHERE category_ids.name = 'Frenos'
UNION ALL
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  category_ids.id,
  code,
  sku,
  product_name,
  description,
  quantity,
  quantity,
  min_quantity,
  min_quantity,
  max_stock,
  unit_price,
  category_ids.name,
  'pza',
  'active',
  'BAR' || code,
  NOW(),
  NOW()
FROM category_ids
CROSS JOIN LATERAL (
  VALUES
    ('SUS-001', 'SUS-001', 'Amortiguadores Delanteros', 'Par de amortiguadores gas delanteros', 12, 8, 25, 2400.00),
    ('SUS-002', 'SUS-002', 'Amortiguadores Traseros', 'Par de amortiguadores gas traseros', 10, 8, 25, 2200.00),
    ('SUS-003', 'SUS-003', 'Brazos de Suspensión', 'Juego de brazos de suspensión', 7, 6, 20, 1800.00),
    ('SUS-004', 'SUS-004', 'Resortes Helicoidales', 'Par de resortes helicoidales', 8, 6, 20, 1500.00)
  ) AS products(code, sku, product_name, description, quantity, min_quantity, max_stock, unit_price)
WHERE category_ids.name = 'Suspensión'
UNION ALL
SELECT 
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001'::uuid,
  category_ids.id,
  code,
  sku,
  product_name,
  description,
  quantity,
  quantity,
  min_quantity,
  min_quantity,
  max_stock,
  unit_price,
  category_ids.name,
  'pza',
  'active',
  'BAR' || code,
  NOW(),
  NOW()
FROM category_ids
CROSS JOIN LATERAL (
  VALUES
    ('ELE-001', 'ELE-001', 'Batería 12V 500A', 'Batería libre mantenimiento 12V 500A', 15, 8, 30, 1800.00),
    ('ELE-002', 'ELE-002', 'Alternador', 'Alternador 90A reconstruido', 4, 5, 15, 2500.00),
    ('ELE-003', 'ELE-003', 'Motor de Arranque', 'Motor de arranque reconstruido', 3, 5, 15, 2200.00),
    ('ELE-004', 'ELE-004', 'Bujías (juego de 4)', 'Juego de 4 bujías de iridio', 32, 20, 60, 450.00)
  ) AS products(code, sku, product_name, description, quantity, min_quantity, max_stock, unit_price)
WHERE category_ids.name = 'Eléctrico';

-- ============================================
-- 8. VERIFICAR DATOS INSERTADOS
-- ============================================
SELECT 'RESUMEN DE DATOS INSERTADOS:' as info;
SELECT 'Organizaciones:', COUNT(*) FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';
SELECT 'Clientes:', COUNT(*) FROM customers WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
SELECT 'Vehículos:', COUNT(*) FROM vehicles WHERE customer_id IN (
  SELECT id FROM customers WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid
);
SELECT 'Órdenes:', COUNT(*) FROM work_orders WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
SELECT 'Categorías:', COUNT(*) FROM inventory_categories WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;
SELECT 'Productos:', COUNT(*) FROM inventory WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid;

SELECT 'ÓRDENES POR ESTADO:' as info;
SELECT status, COUNT(*) as cantidad 
FROM work_orders 
WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid 
GROUP BY status 
ORDER BY status;

SELECT 'PRODUCTOS CON STOCK BAJO:' as info;
SELECT name, quantity, min_quantity 
FROM inventory 
WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid 
AND quantity <= min_quantity
ORDER BY quantity;

SELECT 'INGRESOS TOTALES (ÓRDENES COMPLETADAS):' as info;
SELECT COALESCE(SUM(total_amount), 0) as ingresos_totales
FROM work_orders 
WHERE organization_id = '00000000-0000-0000-0000-000000000001'::uuid 
AND status = 'completed';

-- ============================================
-- ¡DATOS DE PRUEBA INSERTADOS EXITOSAMENTE!
-- ============================================