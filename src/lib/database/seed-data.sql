-- =====================================================
-- DATOS DE PRUEBA - CLIENTES
-- =====================================================

INSERT INTO customers (
  organization_id,
  first_name,
  last_name,
  email,
  phone,
  address,
  city,
  state,
  postal_code,
  notes
) VALUES
-- Cliente 1
(
  '00000000-0000-0000-0000-000000000001',
  'Juan',
  'Pérez García',
  'juan.perez@email.com',
  '4491234567',
  'Av. Tecnológico #123',
  'Aguascalientes',
  'Aguascalientes',
  '20100',
  'Cliente frecuente, prefiere servicio express'
),
-- Cliente 2
(
  '00000000-0000-0000-0000-000000000001',
  'María',
  'González López',
  'maria.gonzalez@email.com',
  '4491234568',
  'Blvd. Zacatecas Norte #456',
  'Aguascalientes',
  'Aguascalientes',
  '20110',
  'Puntual con sus pagos'
),
-- Cliente 3
(
  '00000000-0000-0000-0000-000000000001',
  'Carlos',
  'Martínez Ruiz',
  'carlos.martinez@email.com',
  '4491234569',
  'Av. Convención #789',
  'Aguascalientes',
  'Aguascalientes',
  '20120',
  NULL
),
-- Cliente 4
(
  '00000000-0000-0000-0000-000000000001',
  'Ana',
  'Rodríguez Silva',
  'ana.rodriguez@email.com',
  '4491234570',
  'Av. Universidad #321',
  'Aguascalientes',
  'Aguascalientes',
  '20130',
  'Requiere factura siempre'
),
-- Cliente 5
(
  '00000000-0000-0000-0000-000000000001',
  'Luis',
  'Hernández Castro',
  'luis.hernandez@email.com',
  '4491234571',
  'Paseo de la Cruz #654',
  'Aguascalientes',
  'Aguascalientes',
  '20140',
  NULL
),
-- Cliente 6
(
  '00000000-0000-0000-0000-000000000001',
  'Patricia',
  'López Ramírez',
  'patricia.lopez@email.com',
  '4491234572',
  'Av. Aguascalientes Norte #987',
  'Aguascalientes',
  'Aguascalientes',
  '20150',
  'Prefiere citas por la mañana'
),
-- Cliente 7
(
  '00000000-0000-0000-0000-000000000001',
  'Roberto',
  'Sánchez Torres',
  'roberto.sanchez@email.com',
  '4491234573',
  'Av. José María Chávez #147',
  'Aguascalientes',
  'Aguascalientes',
  '20160',
  NULL
),
-- Cliente 8
(
  '00000000-0000-0000-0000-000000000001',
  'Laura',
  'Ramírez Flores',
  'laura.ramirez@email.com',
  '4491234574',
  'Blvd. Luis Donaldo Colosio #258',
  'Aguascalientes',
  'Aguascalientes',
  '20170',
  'Cliente VIP'
);

-- =====================================================
-- DATOS DE PRUEBA - VEHÍCULOS
-- =====================================================

INSERT INTO vehicles (
  organization_id,
  customer_id,
  make,
  model,
  year,
  vin,
  license_plate,
  color,
  mileage
) VALUES
-- Vehículo 1 - Juan Pérez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'juan.perez@email.com' LIMIT 1),
  'Toyota',
  'Corolla',
  2020,
  '1HGBH41JXMN109186',
  'ABC-123',
  'Blanco',
  45000
),
-- Vehículo 2 - María González
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'maria.gonzalez@email.com' LIMIT 1),
  'Honda',
  'Civic',
  2019,
  '2HGBH41JXMN109187',
  'DEF-456',
  'Negro',
  52000
),
-- Vehículo 3 - Carlos Martínez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'carlos.martinez@email.com' LIMIT 1),
  'Nissan',
  'Sentra',
  2021,
  '3HGBH41JXMN109188',
  'GHI-789',
  'Gris',
  38000
),
-- Vehículo 4 - Ana Rodríguez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'ana.rodriguez@email.com' LIMIT 1),
  'Volkswagen',
  'Jetta',
  2018,
  '4HGBH41JXMN109189',
  'JKL-012',
  'Azul',
  67000
),
-- Vehículo 5 - Luis Hernández
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'luis.hernandez@email.com' LIMIT 1),
  'Ford',
  'Focus',
  2020,
  '5HGBH41JXMN109190',
  'MNO-345',
  'Rojo',
  41000
),
-- Vehículo 6 - Patricia López
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'patricia.lopez@email.com' LIMIT 1),
  'Chevrolet',
  'Cruze',
  2019,
  '6HGBH41JXMN109191',
  'PQR-678',
  'Plata',
  48000
),
-- Vehículo 7 - Roberto Sánchez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'roberto.sanchez@email.com' LIMIT 1),
  'Hyundai',
  'Elantra',
  2021,
  '7HGBH41JXMN109192',
  'STU-901',
  'Verde',
  32000
),
-- Vehículo 8 - Laura Ramírez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'laura.ramirez@email.com' LIMIT 1),
  'Mazda',
  'Mazda3',
  2020,
  '8HGBH41JXMN109193',
  'VWX-234',
  'Blanco',
  55000
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
  'Filtros',
  'Filtros de aire, aceite, combustible y habitáculo'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Frenos',
  'Pastillas, discos, zapatas y líquido de frenos'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Motor',
  'Bujías, correas, mangueras y componentes del motor'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Suspensión',
  'Amortiguadores, resortes y componentes de suspensión'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Llantas',
  'Llantas, rines y válvulas'
),
(
  '00000000-0000-0000-0000-000000000001',
  'Lubricantes',
  'Aceites, grasas y aditivos'
);

-- =====================================================
-- DATOS DE PRUEBA - ARTÍCULOS DE INVENTARIO
-- =====================================================

INSERT INTO inventory (
  organization_id,
  category_id,
  name,
  description,
  sku,
  quantity,
  minimum_stock,
  unit_price
) VALUES
-- Filtros
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Filtros' LIMIT 1),
  'Filtro de Aire Toyota Corolla 2020',
  'Filtro de aire original para Toyota Corolla 2020',
  'FIL-TOY-COR-2020',
  25,
  5,
  450.00
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Filtros' LIMIT 1),
  'Filtro de Aceite Honda Civic 2019',
  'Filtro de aceite original para Honda Civic 2019',
  'FIL-HON-CIV-2019',
  30,
  8,
  320.00
),
-- Frenos
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Frenos' LIMIT 1),
  'Pastillas de Freno Delanteras Nissan Sentra',
  'Pastillas de freno delanteras para Nissan Sentra',
  'PAS-NIS-SEN-DEL',
  15,
  3,
  850.00
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Frenos' LIMIT 1),
  'Discos de Freno Volkswagen Jetta',
  'Discos de freno delanteros para Volkswagen Jetta',
  'DIS-VW-JET-DEL',
  10,
  2,
  1200.00
),
-- Motor
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Motor' LIMIT 1),
  'Bujías NGK Ford Focus',
  'Bujías de encendido NGK para Ford Focus',
  'BUJ-NGK-FOR-FOC',
  20,
  4,
  180.00
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Motor' LIMIT 1),
  'Correa de Distribución Chevrolet Cruze',
  'Correa de distribución para Chevrolet Cruze',
  'COR-CHE-CRU-DIS',
  8,
  2,
  650.00
),
-- Suspensión
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Suspensión' LIMIT 1),
  'Amortiguador Delantero Hyundai Elantra',
  'Amortiguador delantero para Hyundai Elantra',
  'AMO-HYU-ELA-DEL',
  6,
  2,
  1200.00
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Suspensión' LIMIT 1),
  'Resorte Mazda Mazda3',
  'Resorte de suspensión para Mazda Mazda3',
  'RES-MAZ-MAZ3-SUS',
  4,
  1,
  800.00
),
-- Llantas
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Llantas' LIMIT 1),
  'Llanta 205/55R16 Bridgestone',
  'Llanta 205/55R16 Bridgestone Turanza',
  'LLA-BRI-205-55-16',
  12,
  4,
  1800.00
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Llantas' LIMIT 1),
  'Llanta 215/60R16 Michelin',
  'Llanta 215/60R16 Michelin Primacy',
  'LLA-MIC-215-60-16',
  8,
  2,
  2200.00
),
-- Lubricantes
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Lubricantes' LIMIT 1),
  'Aceite 5W-30 Mobil 1',
  'Aceite sintético 5W-30 Mobil 1',
  'ACE-MOB-5W30-SYN',
  50,
  10,
  450.00
),
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM inventory_categories WHERE name = 'Lubricantes' LIMIT 1),
  'Aceite 10W-40 Castrol',
  'Aceite mineral 10W-40 Castrol',
  'ACE-CAS-10W40-MIN',
  40,
  8,
  320.00
);

-- =====================================================
-- DATOS DE PRUEBA - ÓRDENES DE TRABAJO
-- =====================================================

INSERT INTO work_orders (
  organization_id,
  customer_id,
  vehicle_id,
  order_number,
  status,
  priority,
  description,
  estimated_hours,
  labor_cost,
  parts_cost,
  total_cost
) VALUES
-- Orden 1 - Juan Pérez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'juan.perez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'ABC-123' LIMIT 1),
  'WO-2024-001',
  'completed',
  'medium',
  'Cambio de aceite y filtro de aire',
  1.5,
  300.00,
  450.00,
  750.00
),
-- Orden 2 - María González
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'maria.gonzalez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'DEF-456' LIMIT 1),
  'WO-2024-002',
  'in_progress',
  'high',
  'Revisión de frenos y cambio de pastillas',
  2.0,
  400.00,
  850.00,
  1250.00
),
-- Orden 3 - Carlos Martínez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'carlos.martinez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'GHI-789' LIMIT 1),
  'WO-2024-003',
  'pending',
  'low',
  'Revisión general y diagnóstico',
  1.0,
  200.00,
  0.00,
  200.00
),
-- Orden 4 - Ana Rodríguez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'ana.rodriguez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'JKL-012' LIMIT 1),
  'WO-2024-004',
  'completed',
  'high',
  'Cambio de amortiguadores delanteros',
  3.0,
  600.00,
  2400.00,
  3000.00
),
-- Orden 5 - Luis Hernández
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'luis.hernandez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'MNO-345' LIMIT 1),
  'WO-2024-005',
  'in_progress',
  'medium',
  'Cambio de llantas y balanceado',
  2.5,
  500.00,
  7200.00,
  7700.00
);

-- =====================================================
-- DATOS DE PRUEBA - COTIZACIONES
-- =====================================================

INSERT INTO quotations (
  organization_id,
  customer_id,
  vehicle_id,
  quotation_number,
  status,
  issue_date,
  expiry_date,
  subtotal,
  tax_rate,
  tax_amount,
  discount_amount,
  total_amount,
  notes
) VALUES
-- Cotización 1 - Juan Pérez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'juan.perez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'ABC-123' LIMIT 1),
  'COT-2024-001',
  'sent',
  '2024-01-15',
  '2024-02-15',
  750.00,
  16.00,
  120.00,
  0.00,
  870.00,
  'Cotización para cambio de aceite y filtro'
),
-- Cotización 2 - María González
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'maria.gonzalez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'DEF-456' LIMIT 1),
  'COT-2024-002',
  'accepted',
  '2024-01-16',
  '2024-02-16',
  1250.00,
  16.00,
  200.00,
  50.00,
  1400.00,
  'Cotización para revisión de frenos'
),
-- Cotización 3 - Carlos Martínez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'carlos.martinez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'GHI-789' LIMIT 1),
  'COT-2024-003',
  'draft',
  '2024-01-17',
  '2024-02-17',
  200.00,
  16.00,
  32.00,
  0.00,
  232.00,
  'Cotización para revisión general'
);

-- =====================================================
-- DATOS DE PRUEBA - FACTURAS
-- =====================================================

INSERT INTO sales_invoices (
  organization_id,
  customer_id,
  vehicle_id,
  invoice_number,
  status,
  issue_date,
  due_date,
  subtotal,
  tax_rate,
  tax_amount,
  discount_amount,
  total_amount,
  paid_amount,
  balance,
  notes
) VALUES
-- Factura 1 - Juan Pérez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'juan.perez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'ABC-123' LIMIT 1),
  'FAC-2024-001',
  'paid',
  '2024-01-15',
  '2024-02-15',
  750.00,
  16.00,
  120.00,
  0.00,
  870.00,
  870.00,
  0.00,
  'Factura por cambio de aceite y filtro'
),
-- Factura 2 - María González
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'maria.gonzalez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'DEF-456' LIMIT 1),
  'FAC-2024-002',
  'sent',
  '2024-01-16',
  '2024-02-16',
  1250.00,
  16.00,
  200.00,
  50.00,
  1400.00,
  0.00,
  1400.00,
  'Factura por revisión de frenos'
),
-- Factura 3 - Ana Rodríguez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM customers WHERE email = 'ana.rodriguez@email.com' LIMIT 1),
  (SELECT id FROM vehicles WHERE license_plate = 'JKL-012' LIMIT 1),
  'FAC-2024-003',
  'paid',
  '2024-01-17',
  '2024-02-17',
  3000.00,
  16.00,
  480.00,
  0.00,
  3480.00,
  3480.00,
  0.00,
  'Factura por cambio de amortiguadores'
);

-- =====================================================
-- DATOS DE PRUEBA - PAGOS
-- =====================================================

INSERT INTO payments (
  organization_id,
  invoice_id,
  amount,
  payment_method,
  payment_date,
  reference,
  notes
) VALUES
-- Pago 1 - Juan Pérez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sales_invoices WHERE invoice_number = 'FAC-2024-001' LIMIT 1),
  870.00,
  'cash',
  '2024-01-15',
  'PAG-001',
  'Pago en efectivo'
),
-- Pago 2 - Ana Rodríguez
(
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM sales_invoices WHERE invoice_number = 'FAC-2024-003' LIMIT 1),
  3480.00,
  'transfer',
  '2024-01-17',
  'PAG-002',
  'Transferencia bancaria'
);

-- =====================================================
-- VERIFICACIÓN DE DATOS
-- =====================================================

-- Verificar clientes
SELECT COUNT(*) as total_clientes FROM customers;

-- Verificar vehículos
SELECT COUNT(*) as total_vehiculos FROM vehicles;

-- Verificar categorías de inventario
SELECT COUNT(*) as total_categorias FROM inventory_categories;

-- Verificar artículos de inventario
SELECT COUNT(*) as total_articulos FROM inventory;

-- Verificar órdenes de trabajo
SELECT COUNT(*) as total_ordenes FROM work_orders;

-- Verificar cotizaciones
SELECT COUNT(*) as total_cotizaciones FROM quotations;

-- Verificar facturas
SELECT COUNT(*) as total_facturas FROM sales_invoices;

-- Verificar pagos
SELECT COUNT(*) as total_pagos FROM payments;