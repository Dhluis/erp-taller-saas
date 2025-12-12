-- ===================================================
-- EAGLES ERP - ÍNDICES MULTI-TENANT OPTIMIZADOS
-- Fecha: 2025-01-09
-- Mejora estimada: 30-40% en queries multi-tenant
-- ===================================================

-- IMPORTANTE: Los índices compuestos (organization_id + otra columna)
-- optimizan queries que filtran PRIMERO por organization_id
-- y LUEGO por otro campo (status, fecha, etc.)

-- ===================================================
-- 1. CUSTOMERS (Clientes)
-- ===================================================

-- Índice compuesto: organization_id + email
-- Optimiza: Buscar cliente por email DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_customers_org_email 
ON customers(organization_id, email);

-- Índice compuesto: organization_id + phone
-- Optimiza: Buscar cliente por teléfono DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_customers_org_phone 
ON customers(organization_id, phone);

-- Índice simple: organization_id
-- Optimiza: Listar todos los clientes de una organización
CREATE INDEX IF NOT EXISTS idx_customers_organization_id 
ON customers(organization_id);

-- ===================================================
-- 2. WORK ORDERS (Órdenes de Trabajo)
-- ===================================================

-- Índice compuesto: organization_id + status
-- Optimiza: Filtrar órdenes por estado DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_work_orders_org_status 
ON work_orders(organization_id, status);

-- Índice compuesto: organization_id + created_at DESC
-- Optimiza: Listar órdenes recientes DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_work_orders_org_created 
ON work_orders(organization_id, created_at DESC);

-- Índice compuesto: organization_id + customer_id
-- Optimiza: Ver todas las órdenes de un cliente DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_work_orders_org_customer 
ON work_orders(organization_id, customer_id);

-- Índice compuesto: organization_id + assigned_to
-- Optimiza: Ver órdenes asignadas a un empleado DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_work_orders_org_assigned 
ON work_orders(organization_id, assigned_to);

-- ===================================================
-- 3. VEHICLES (Vehículos)
-- ===================================================

-- Índice compuesto: organization_id + customer_id
-- Optimiza: Ver vehículos de un cliente DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_vehicles_org_customer 
ON vehicles(organization_id, customer_id);

-- Índice compuesto: organization_id + license_plate
-- Optimiza: Buscar vehículo por placa DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_vehicles_org_plate 
ON vehicles(organization_id, license_plate);

-- ===================================================
-- 4. PRODUCTS/INVENTORY (Inventario)
-- ===================================================

-- Índice compuesto: organization_id + sku
-- Optimiza: Buscar producto por SKU DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_products_org_sku 
ON products(organization_id, sku);

-- Índice compuesto: organization_id + category_id
-- Optimiza: Filtrar productos por categoría DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_products_org_category 
ON products(organization_id, category_id);

-- Índice compuesto: organization_id + is_active
-- Optimiza: Listar solo productos activos DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_products_org_active 
ON products(organization_id, is_active) 
WHERE is_active = true;

-- ===================================================
-- 5. INVOICES (Facturas)
-- ===================================================

-- Índice compuesto: organization_id + status
-- Optimiza: Filtrar facturas por estado DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_invoices_org_status 
ON invoices(organization_id, status);

-- Índice compuesto: organization_id + created_at DESC
-- Optimiza: Listar facturas recientes DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_invoices_org_created 
ON invoices(organization_id, created_at DESC);

-- Índice compuesto: organization_id + customer_id
-- Optimiza: Ver facturas de un cliente DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_invoices_org_customer 
ON invoices(organization_id, customer_id);

-- ===================================================
-- 6. QUOTATIONS (Cotizaciones)
-- ===================================================

-- Índice compuesto: organization_id + status
-- Optimiza: Filtrar cotizaciones por estado DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_quotations_org_status 
ON quotations(organization_id, status);

-- Índice compuesto: organization_id + created_at DESC
-- Optimiza: Listar cotizaciones recientes DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_quotations_org_created 
ON quotations(organization_id, created_at DESC);

-- Índice compuesto: organization_id + customer_id
-- Optimiza: Ver cotizaciones de un cliente DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_quotations_org_customer 
ON quotations(organization_id, customer_id);

-- ===================================================
-- 7. EMPLOYEES (Empleados)
-- ===================================================

-- Índice compuesto: organization_id + is_active
-- Optimiza: Listar solo empleados activos DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_employees_org_active 
ON employees(organization_id, is_active);

-- Índice compuesto: organization_id + role
-- Optimiza: Filtrar empleados por rol DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_employees_org_role 
ON employees(organization_id, role);

-- ===================================================
-- 8. PAYMENTS (Pagos)
-- ===================================================

-- Índice compuesto: organization_id + invoice_id
-- Optimiza: Ver pagos de una factura DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_payments_org_invoice 
ON payments(organization_id, invoice_id);

-- Índice compuesto: organization_id + created_at DESC
-- Optimiza: Listar pagos recientes DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_payments_org_created 
ON payments(organization_id, created_at DESC);

-- ===================================================
-- 9. SUPPLIERS (Proveedores)
-- ===================================================

-- Índice simple: organization_id
-- Optimiza: Listar proveedores DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id 
ON suppliers(organization_id);

-- ===================================================
-- 10. PURCHASE ORDERS (Órdenes de Compra)
-- ===================================================

-- Índice compuesto: organization_id + status
-- Optimiza: Filtrar órdenes de compra por estado DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status 
ON purchase_orders(organization_id, status);

-- Índice compuesto: organization_id + supplier_id
-- Optimiza: Ver órdenes de un proveedor DENTRO de una organización
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_supplier 
ON purchase_orders(organization_id, supplier_id);

-- ===================================================
-- VERIFICACIÓN: Ver todos los índices multi-tenant creados
-- ===================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
  AND indexdef LIKE '%organization_id%'
ORDER BY tablename, indexname;

-- ===================================================
-- ANÁLISIS: Ver tamaño de índices creados
-- ===================================================
SELECT 
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND indexrelname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;

