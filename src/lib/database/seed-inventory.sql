-- =====================================================
-- DATOS DE PRUEBA - INVENTARIO
-- =====================================================

INSERT INTO inventory_items (
  organization_id,
  item_type,
  sku,
  name,
  description,
  category,
  unit_price,
  cost_price,
  quantity,
  minimum_stock,
  location,
  supplier,
  is_active
) VALUES
-- Productos
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-001',
  'Aceite Motor 5W-30',
  'Aceite sintético para motor 5W-30, 1L',
  'lubricantes',
  250.00,
  180.00,
  45,
  10,
  'Almacén A-1',
  'Castrol México',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-002',
  'Filtro de Aceite',
  'Filtro de aceite universal',
  'filtros',
  85.00,
  50.00,
  32,
  15,
  'Almacén A-2',
  'Mann Filter',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-003',
  'Filtro de Aire',
  'Filtro de aire para motor',
  'filtros',
  120.00,
  70.00,
  28,
  10,
  'Almacén A-2',
  'Mann Filter',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-004',
  'Anticongelante',
  'Anticongelante refrigerante 50/50, 4L',
  'liquidos',
  180.00,
  120.00,
  22,
  8,
  'Almacén B-1',
  'Prestone',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-005',
  'Líquido de Frenos DOT 4',
  'Líquido de frenos DOT 4, 1L',
  'liquidos',
  95.00,
  60.00,
  18,
  10,
  'Almacén B-1',
  'Ate',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-006',
  'Batería 12V 45Ah',
  'Batería para auto 12V 45Ah',
  'electrico',
  1250.00,
  850.00,
  8,
  5,
  'Almacén C-1',
  'LTH',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-007',
  'Bujías NGK',
  'Juego de 4 bujías NGK',
  'electrico',
  280.00,
  180.00,
  25,
  12,
  'Almacén A-3',
  'NGK',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-008',
  'Pastillas de Freno Delanteras',
  'Juego de pastillas delanteras',
  'frenos',
  450.00,
  300.00,
  15,
  8,
  'Almacén B-2',
  'Brembo',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-009',
  'Discos de Freno',
  'Par de discos de freno delanteros',
  'frenos',
  850.00,
  600.00,
  6,
  4,
  'Almacén B-2',
  'Brembo',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-010',
  'Amortiguadores Traseros',
  'Par de amortiguadores traseros',
  'suspension',
  1200.00,
  800.00,
  4,
  6,
  'Almacén C-2',
  'Monroe',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-011',
  'Kit de Embrague',
  'Kit completo de embrague',
  'transmision',
  2500.00,
  1800.00,
  3,
  5,
  'Almacén C-3',
  'Valeo',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-012',
  'Radiador Universal',
  'Radiador de aluminio universal',
  'sistema_enfriamiento',
  1500.00,
  1000.00,
  2,
  4,
  'Almacén C-4',
  'Denso',
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'product',
  'PROD-013',
  'Banda de Distribución',
  'Banda de distribución con kit',
  'motor',
  650.00,
  450.00,
  12,
  8,
  'Almacén A-4',
  'Gates',
  TRUE
),
-- Servicios
(
  '00000000-0000-0000-0000-000000000001',
  'service',
  'SERV-001',
  'Cambio de Aceite y Filtro',
  'Servicio de cambio de aceite y filtro',
  'mantenimiento',
  350.00,
  0.00,
  NULL,
  NULL,
  NULL,
  NULL,
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'service',
  'SERV-002',
  'Afinación Mayor',
  'Servicio de afinación completa',
  'mantenimiento',
  850.00,
  0.00,
  NULL,
  NULL,
  NULL,
  NULL,
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'service',
  'SERV-003',
  'Diagnóstico Computarizado',
  'Escaneo y diagnóstico con escáner',
  'diagnostico',
  450.00,
  0.00,
  NULL,
  NULL,
  NULL,
  NULL,
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'service',
  'SERV-004',
  'Cambio de Frenos',
  'Servicio de cambio de pastillas y discos',
  'mantenimiento',
  650.00,
  0.00,
  NULL,
  NULL,
  NULL,
  NULL,
  TRUE
),
(
  '00000000-0000-0000-0000-000000000001',
  'service',
  'SERV-005',
  'Alineación y Balanceo',
  'Servicio de alineación y balanceo 4 ruedas',
  'llantas',
  550.00,
  0.00,
  NULL,
  NULL,
  NULL,
  NULL,
  TRUE
);

-- =====================================================
-- DATOS DE PRUEBA - MOVIMIENTOS DE INVENTARIO
-- =====================================================

INSERT INTO inventory_movements (
  organization_id,
  item_id,
  movement_type,
  quantity,
  unit_cost,
  total_cost,
  reference,
  notes
) VALUES
-- Entrada inicial de productos
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-001' LIMIT 1),
  'in',
  50,
  180.00,
  9000.00,
  'ENT-001',
  'Entrada inicial de aceite motor'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-002' LIMIT 1),
  'in',
  40,
  50.00,
  2000.00,
  'ENT-002',
  'Entrada inicial de filtros de aceite'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-003' LIMIT 1),
  'in',
  35,
  70.00,
  2450.00,
  'ENT-003',
  'Entrada inicial de filtros de aire'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-004' LIMIT 1),
  'in',
  25,
  120.00,
  3000.00,
  'ENT-004',
  'Entrada inicial de anticongelante'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-005' LIMIT 1),
  'in',
  20,
  60.00,
  1200.00,
  'ENT-005',
  'Entrada inicial de líquido de frenos'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-006' LIMIT 1),
  'in',
  10,
  850.00,
  8500.00,
  'ENT-006',
  'Entrada inicial de baterías'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-007' LIMIT 1),
  'in',
  30,
  180.00,
  5400.00,
  'ENT-007',
  'Entrada inicial de bujías'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-008' LIMIT 1),
  'in',
  20,
  300.00,
  6000.00,
  'ENT-008',
  'Entrada inicial de pastillas de freno'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-009' LIMIT 1),
  'in',
  8,
  600.00,
  4800.00,
  'ENT-009',
  'Entrada inicial de discos de freno'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-010' LIMIT 1),
  'in',
  6,
  800.00,
  4800.00,
  'ENT-010',
  'Entrada inicial de amortiguadores'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-011' LIMIT 1),
  'in',
  5,
  1800.00,
  9000.00,
  'ENT-011',
  'Entrada inicial de kits de embrague'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-012' LIMIT 1),
  'in',
  3,
  1000.00,
  3000.00,
  'ENT-012',
  'Entrada inicial de radiadores'
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_items WHERE sku = 'PROD-013' LIMIT 1),
  'in',
  15,
  450.00,
  6750.00,
  'ENT-013',
  'Entrada inicial de bandas de distribución'
);

-- =====================================================
-- DATOS DE PRUEBA - CATEGORÍAS DE INVENTARIO
-- =====================================================

INSERT INTO inventory_categories (
  organization_id,
  name,
  description
) VALUES
(
  '00000000-0000-0000-0000-000000000001',
  'Lubricantes',
  'Aceites, grasas y aditivos para motor'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Filtros',
  'Filtros de aire, aceite, combustible y habitáculo'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Líquidos',
  'Anticongelante, líquido de frenos, refrigerante'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Eléctrico',
  'Baterías, bujías, alternadores y componentes eléctricos'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Frenos',
  'Pastillas, discos, zapatas y líquido de frenos'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Suspensión',
  'Amortiguadores, resortes y componentes de suspensión'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Transmisión',
  'Embragues, cajas de cambios y componentes de transmisión'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Sistema de Enfriamiento',
  'Radiadores, termostatos y componentes de enfriamiento'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Motor',
  'Correas, mangueras y componentes del motor'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Mantenimiento',
  'Servicios de mantenimiento y reparación'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Diagnóstico',
  'Servicios de diagnóstico y escaneo'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Llantas',
  'Servicios de llantas, alineación y balanceo'
);

-- =====================================================
-- VERIFICACIÓN DE DATOS
-- =====================================================

-- Verificar artículos de inventario
SELECT COUNT(*) as total_articulos FROM inventory_items;

-- Verificar movimientos de inventario
SELECT COUNT(*) as total_movimientos FROM inventory_movements;

-- Verificar categorías de inventario
SELECT COUNT(*) as total_categorias FROM inventory_categories;

-- Verificar productos con stock bajo
SELECT 
  name,
  quantity,
  minimum_stock,
  CASE 
    WHEN quantity < minimum_stock THEN '⚠️ BAJO'
    ELSE '✅ OK'
  END as estado
FROM inventory_items
WHERE item_type = 'product'
ORDER BY quantity;

-- Verificar servicios disponibles
SELECT 
  name,
  unit_price,
  category
FROM inventory_items
WHERE item_type = 'service'
ORDER BY name;

-- Verificar movimientos por tipo
SELECT 
  movement_type,
  COUNT(*) as cantidad,
  SUM(total_cost) as costo_total
FROM inventory_movements
GROUP BY movement_type;




















