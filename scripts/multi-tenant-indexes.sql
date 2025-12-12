-- =====================================================
-- ÍNDICES MULTI-TENANT PARA ERP TALLER SAAS
-- =====================================================
-- Este script crea índices compuestos optimizados para queries multi-tenant
-- Ejecutar en Supabase Dashboard → SQL Editor
-- 
-- Total de índices: 31 índices
-- Tablas cubiertas: 13 tablas (customers, work_orders, vehicles, products, 
--                   invoices, quotations, employees, payments, suppliers, 
--                   purchase_orders, services, appointments, inventory)
-- 
-- Beneficio estimado: 30-40% mejora en velocidad de queries multi-tenant
-- =====================================================

-- =====================================================
-- SECCIÓN 1: CUSTOMERS (3 índices)
-- =====================================================

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_customers_org 
ON customers(organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para búsquedas por email (único por organización)
CREATE INDEX IF NOT EXISTS idx_customers_org_email 
ON customers(organization_id, email) 
WHERE organization_id IS NOT NULL AND email IS NOT NULL;

-- Índice para búsquedas por nombre dentro de organización
CREATE INDEX IF NOT EXISTS idx_customers_org_name 
ON customers(organization_id, name) 
WHERE organization_id IS NOT NULL AND name IS NOT NULL;

-- =====================================================
-- SECCIÓN 2: WORK_ORDERS (4 índices)
-- =====================================================

-- Índice para dashboard: organización + estado
CREATE INDEX IF NOT EXISTS idx_work_orders_org_status 
ON work_orders(organization_id, status) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- Índice para búsquedas por cliente dentro de organización
CREATE INDEX IF NOT EXISTS idx_work_orders_org_customer 
ON work_orders(organization_id, customer_id) 
WHERE organization_id IS NOT NULL AND customer_id IS NOT NULL;

-- Índice para búsquedas por fecha de creación (orden descendente)
CREATE INDEX IF NOT EXISTS idx_work_orders_org_created 
ON work_orders(organization_id, created_at DESC) 
WHERE organization_id IS NOT NULL AND created_at IS NOT NULL;

-- Índice compuesto para dashboard completo
CREATE INDEX IF NOT EXISTS idx_work_orders_dashboard 
ON work_orders(organization_id, status, created_at DESC) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- =====================================================
-- SECCIÓN 3: VEHICLES (2 índices)
-- =====================================================

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_vehicles_org 
ON vehicles(organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para búsquedas por placa dentro de organización
CREATE INDEX IF NOT EXISTS idx_vehicles_org_license_plate 
ON vehicles(organization_id, license_plate) 
WHERE organization_id IS NOT NULL AND license_plate IS NOT NULL;

-- =====================================================
-- SECCIÓN 4: PRODUCTS/INVENTORY (3 índices)
-- =====================================================

-- Índice para búsquedas por código dentro de organización
CREATE INDEX IF NOT EXISTS idx_products_org_code 
ON products(organization_id, code) 
WHERE organization_id IS NOT NULL AND code IS NOT NULL;

-- Índice para búsquedas por categoría dentro de organización
CREATE INDEX IF NOT EXISTS idx_products_org_category 
ON products(organization_id, category) 
WHERE organization_id IS NOT NULL AND category IS NOT NULL;

-- Índice para productos activos por organización
CREATE INDEX IF NOT EXISTS idx_products_org_active 
ON products(organization_id, is_active) 
WHERE organization_id IS NOT NULL AND is_active = true;

-- =====================================================
-- SECCIÓN 5: INVOICES (3 índices)
-- =====================================================

-- Índice para búsquedas por organización y estado
CREATE INDEX IF NOT EXISTS idx_invoices_org_status 
ON invoices(organization_id, status) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- Índice para reportes por fecha
CREATE INDEX IF NOT EXISTS idx_invoices_org_date 
ON invoices(organization_id, created_at DESC) 
WHERE organization_id IS NOT NULL AND created_at IS NOT NULL;

-- Índice compuesto para reportes
CREATE INDEX IF NOT EXISTS idx_invoices_reports 
ON invoices(organization_id, status, created_at DESC) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- =====================================================
-- SECCIÓN 6: QUOTATIONS (3 índices)
-- =====================================================

-- Índice para búsquedas por organización y estado
CREATE INDEX IF NOT EXISTS idx_quotations_org_status 
ON quotations(organization_id, status) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- Índice para búsquedas por cliente dentro de organización
CREATE INDEX IF NOT EXISTS idx_quotations_org_customer 
ON quotations(organization_id, customer_id) 
WHERE organization_id IS NOT NULL AND customer_id IS NOT NULL;

-- Índice para cotizaciones expiradas
CREATE INDEX IF NOT EXISTS idx_quotations_org_expired 
ON quotations(organization_id, status, expiry_date) 
WHERE organization_id IS NOT NULL AND status = 'pending' AND expiry_date < NOW();

-- =====================================================
-- SECCIÓN 7: EMPLOYEES (2 índices)
-- =====================================================

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_employees_org 
ON employees(organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para empleados activos por organización
CREATE INDEX IF NOT EXISTS idx_employees_org_active 
ON employees(organization_id, is_active) 
WHERE organization_id IS NOT NULL AND is_active = true;

-- =====================================================
-- SECCIÓN 8: PAYMENTS (3 índices)
-- =====================================================
-- Pagos a proveedores (purchase orders)

-- Índice para búsquedas por organización y proveedor
CREATE INDEX IF NOT EXISTS idx_payments_org_supplier 
ON payments(organization_id, supplier_id) 
WHERE organization_id IS NOT NULL AND supplier_id IS NOT NULL;

-- Índice para búsquedas por organización y estado
CREATE INDEX IF NOT EXISTS idx_payments_org_status 
ON payments(organization_id, status) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- Índice para búsquedas por fecha de pago
CREATE INDEX IF NOT EXISTS idx_payments_org_date 
ON payments(organization_id, payment_date DESC) 
WHERE organization_id IS NOT NULL AND payment_date IS NOT NULL;

-- =====================================================
-- SECCIÓN 9: SUPPLIERS (1 índice)
-- =====================================================

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_suppliers_org 
ON suppliers(organization_id) 
WHERE organization_id IS NOT NULL;

-- =====================================================
-- SECCIÓN 10: PURCHASE_ORDERS (2 índices)
-- =====================================================

-- Índice para búsquedas por organización y estado
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status 
ON purchase_orders(organization_id, status) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_date 
ON purchase_orders(organization_id, order_date DESC) 
WHERE organization_id IS NOT NULL AND order_date IS NOT NULL;

-- =====================================================
-- SECCIÓN 11: SERVICES (2 índices)
-- =====================================================

-- Índice para búsquedas por organización y categoría
CREATE INDEX IF NOT EXISTS idx_services_org_category 
ON services(organization_id, category) 
WHERE organization_id IS NOT NULL AND category IS NOT NULL;

-- Índice para servicios activos por organización
CREATE INDEX IF NOT EXISTS idx_services_org_active 
ON services(organization_id, is_active) 
WHERE organization_id IS NOT NULL AND is_active = true;

-- =====================================================
-- SECCIÓN 12: APPOINTMENTS (2 índices)
-- =====================================================

-- Índice para búsquedas por organización y estado
CREATE INDEX IF NOT EXISTS idx_appointments_org_status 
ON appointments(organization_id, status) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- Índice para búsquedas por fecha de cita
CREATE INDEX IF NOT EXISTS idx_appointments_org_date 
ON appointments(organization_id, appointment_date DESC) 
WHERE organization_id IS NOT NULL AND appointment_date IS NOT NULL;

-- =====================================================
-- SECCIÓN 13: INVENTORY (1 índice)
-- =====================================================

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_inventory_organization_id 
ON inventory(organization_id) 
WHERE organization_id IS NOT NULL;

-- =====================================================
-- ACTUALIZAR ESTADÍSTICAS
-- =====================================================

-- Actualizar estadísticas después de crear índices para mejor planificación de queries
ANALYZE customers;
ANALYZE work_orders;
ANALYZE vehicles;
ANALYZE products;
ANALYZE invoices;
ANALYZE quotations;
ANALYZE employees;
ANALYZE payments;
ANALYZE suppliers;
ANALYZE purchase_orders;
ANALYZE services;
ANALYZE appointments;
ANALYZE inventory;

-- =====================================================
-- VERIFICACIÓN DE ÍNDICES CREADOS
-- =====================================================

-- Para verificar que los índices se crearon correctamente, ejecutar:
-- SELECT indexname, tablename 
-- FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND indexname LIKE 'idx_%' 
-- ORDER BY tablename, indexname;

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================

-- ✅ Todos los índices usan organización como primer campo para filtrado multi-tenant
-- ✅ Índices parciales (WHERE) reducen tamaño y mejoran rendimiento
-- ✅ Índices con ordenamiento (DESC) optimizan listas recientes
-- ✅ Los índices se crean solo si no existen (IF NOT EXISTS)
-- ✅ Se recomienda ejecutar ANALYZE después de crear índices

