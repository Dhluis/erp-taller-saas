-- =====================================================
-- ÍNDICES DE RENDIMIENTO PARA ERP TALLER SAAS
-- =====================================================
-- Estos índices optimizan las consultas más frecuentes
-- y mejoran significativamente el rendimiento

-- =====================================================
-- ÍNDICES PARA WORK_ORDERS
-- =====================================================

-- Índice para búsquedas por estado (muy frecuente)
CREATE INDEX IF NOT EXISTS idx_work_orders_status 
ON work_orders (status) 
WHERE status IS NOT NULL;

-- Índice para búsquedas por organización y estado
CREATE INDEX IF NOT EXISTS idx_work_orders_org_status 
ON work_orders (organization_id, status) 
WHERE organization_id IS NOT NULL AND status IS NOT NULL;

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_work_orders_customer 
ON work_orders (customer_id) 
WHERE customer_id IS NOT NULL;

-- Índice para búsquedas por vehículo
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle 
ON work_orders (vehicle_id) 
WHERE vehicle_id IS NOT NULL;

-- Índice para búsquedas por fecha de creación
CREATE INDEX IF NOT EXISTS idx_work_orders_created_at 
ON work_orders (created_at DESC) 
WHERE created_at IS NOT NULL;

-- Índice para búsquedas por fecha de entrega
CREATE INDEX IF NOT EXISTS idx_work_orders_delivery_date 
ON work_orders (delivery_date) 
WHERE delivery_date IS NOT NULL;

-- Índice compuesto para dashboard (estado + fecha)
CREATE INDEX IF NOT EXISTS idx_work_orders_status_created 
ON work_orders (status, created_at DESC) 
WHERE status IS NOT NULL AND created_at IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA CUSTOMERS
-- =====================================================

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_customers_organization 
ON customers (organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para búsquedas por email (único por organización)
CREATE INDEX IF NOT EXISTS idx_customers_email_org 
ON customers (email, organization_id) 
WHERE email IS NOT NULL AND organization_id IS NOT NULL;

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_customers_name 
ON customers (name) 
WHERE name IS NOT NULL;

-- Índice para búsquedas por teléfono
CREATE INDEX IF NOT EXISTS idx_customers_phone 
ON customers (phone) 
WHERE phone IS NOT NULL;

-- Índice para búsquedas por ciudad
CREATE INDEX IF NOT EXISTS idx_customers_city 
ON customers (city) 
WHERE city IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA VEHICLES
-- =====================================================

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_vehicles_customer 
ON vehicles (customer_id) 
WHERE customer_id IS NOT NULL;

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_vehicles_organization 
ON vehicles (organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para búsquedas por placa
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate 
ON vehicles (license_plate) 
WHERE license_plate IS NOT NULL;

-- Índice para búsquedas por marca y modelo
CREATE INDEX IF NOT EXISTS idx_vehicles_brand_model 
ON vehicles (brand, model) 
WHERE brand IS NOT NULL AND model IS NOT NULL;

-- Índice para búsquedas por año
CREATE INDEX IF NOT EXISTS idx_vehicles_year 
ON vehicles (year) 
WHERE year IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA INVENTORY_ITEMS
-- =====================================================

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_inventory_items_organization 
ON inventory_items (organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para búsquedas por categoría
CREATE INDEX IF NOT EXISTS idx_inventory_items_category 
ON inventory_items (category_id) 
WHERE category_id IS NOT NULL;

-- Índice para búsquedas por SKU
CREATE INDEX IF NOT EXISTS idx_inventory_items_sku 
ON inventory_items (sku) 
WHERE sku IS NOT NULL;

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_inventory_items_name 
ON inventory_items (name) 
WHERE name IS NOT NULL;

-- Índice para stock bajo
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock 
ON inventory_items (quantity, minimum_stock) 
WHERE quantity <= minimum_stock;

-- Índice para búsquedas por precio
CREATE INDEX IF NOT EXISTS idx_inventory_items_price 
ON inventory_items (unit_price) 
WHERE unit_price IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA QUOTATIONS
-- =====================================================

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_quotations_status 
ON quotations (status) 
WHERE status IS NOT NULL;

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_quotations_organization 
ON quotations (organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_quotations_customer 
ON quotations (customer_id) 
WHERE customer_id IS NOT NULL;

-- Índice para búsquedas por fecha de vencimiento
CREATE INDEX IF NOT EXISTS idx_quotations_expiry_date 
ON quotations (expiry_date) 
WHERE expiry_date IS NOT NULL;

-- Índice para cotizaciones expiradas
CREATE INDEX IF NOT EXISTS idx_quotations_expired 
ON quotations (status, expiry_date) 
WHERE status = 'pending' AND expiry_date < NOW();

-- =====================================================
-- ÍNDICES PARA SALES_INVOICES
-- =====================================================

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_sales_invoices_status 
ON sales_invoices (status) 
WHERE status IS NOT NULL;

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_sales_invoices_organization 
ON sales_invoices (organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer 
ON sales_invoices (customer_id) 
WHERE customer_id IS NOT NULL;

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date 
ON sales_invoices (invoice_date) 
WHERE invoice_date IS NOT NULL;

-- Índice para búsquedas por total
CREATE INDEX IF NOT EXISTS idx_sales_invoices_total 
ON sales_invoices (total_amount) 
WHERE total_amount IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA PAYMENTS
-- =====================================================

-- Índice para búsquedas por factura
CREATE INDEX IF NOT EXISTS idx_payments_invoice 
ON payments (invoice_id) 
WHERE invoice_id IS NOT NULL;

-- Índice para búsquedas por método de pago
CREATE INDEX IF NOT EXISTS idx_payments_method 
ON payments (payment_method) 
WHERE payment_method IS NOT NULL;

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_payments_date 
ON payments (payment_date) 
WHERE payment_date IS NOT NULL;

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_payments_organization 
ON payments (organization_id) 
WHERE organization_id IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA USERS Y ROLES
-- =====================================================

-- Índice para búsquedas por organización
CREATE INDEX IF NOT EXISTS idx_users_organization 
ON users (organization_id) 
WHERE organization_id IS NOT NULL;

-- Índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_users_email 
ON users (email) 
WHERE email IS NOT NULL;

-- Índice para búsquedas por estado activo
CREATE INDEX IF NOT EXISTS idx_users_active 
ON users (is_active) 
WHERE is_active IS NOT NULL;

-- Índice para roles por organización
CREATE INDEX IF NOT EXISTS idx_roles_organization 
ON roles (organization_id) 
WHERE organization_id IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA AUDIT_LOGS
-- =====================================================

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
ON audit_logs (user_id) 
WHERE user_id IS NOT NULL;

-- Índice para búsquedas por acción
CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs (action) 
WHERE action IS NOT NULL;

-- Índice para búsquedas por entidad
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
ON audit_logs (entity_type, entity_id) 
WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_audit_logs_created 
ON audit_logs (created_at DESC) 
WHERE created_at IS NOT NULL;

-- =====================================================
-- ÍNDICES PARA SYSTEM_LOGS
-- =====================================================

-- Índice para búsquedas por nivel
CREATE INDEX IF NOT EXISTS idx_system_logs_level 
ON system_logs (log_level) 
WHERE log_level IS NOT NULL;

-- Índice para búsquedas por tipo
CREATE INDEX IF NOT EXISTS idx_system_logs_type 
ON system_logs (log_type) 
WHERE log_type IS NOT NULL;

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_system_logs_created 
ON system_logs (created_at DESC) 
WHERE created_at IS NOT NULL;

-- Índice para logs de error
CREATE INDEX IF NOT EXISTS idx_system_logs_errors 
ON system_logs (log_level, created_at DESC) 
WHERE log_level IN ('error', 'critical');

-- =====================================================
-- ÍNDICES PARA WARRANTY_CLAIMS
-- =====================================================

-- Índice para búsquedas por estado
CREATE INDEX IF NOT EXISTS idx_warranty_claims_status 
ON warranty_claims (status) 
WHERE status IS NOT NULL;

-- Índice para búsquedas por garantía
CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty 
ON warranty_claims (warranty_id) 
WHERE warranty_id IS NOT NULL;

-- Índice para búsquedas por fecha
CREATE INDEX IF NOT EXISTS idx_warranty_claims_date 
ON warranty_claims (claim_date) 
WHERE claim_date IS NOT NULL;

-- =====================================================
-- ÍNDICES COMPUESTOS PARA CONSULTAS COMPLEJAS
-- =====================================================

-- Dashboard: Órdenes por estado y fecha
CREATE INDEX IF NOT EXISTS idx_work_orders_dashboard 
ON work_orders (organization_id, status, created_at DESC) 
WHERE organization_id IS NOT NULL;

-- Reportes: Facturas por fecha y estado
CREATE INDEX IF NOT EXISTS idx_sales_invoices_reports 
ON sales_invoices (organization_id, status, invoice_date) 
WHERE organization_id IS NOT NULL;

-- Inventario: Items por categoría y stock
CREATE INDEX IF NOT EXISTS idx_inventory_reports 
ON inventory_items (organization_id, category_id, quantity) 
WHERE organization_id IS NOT NULL;

-- =====================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON INDEX idx_work_orders_status IS 'Optimiza búsquedas por estado de órdenes de trabajo';
COMMENT ON INDEX idx_customers_email_org IS 'Optimiza búsquedas de clientes por email dentro de organización';
COMMENT ON INDEX idx_inventory_items_low_stock IS 'Optimiza consultas de stock bajo';
COMMENT ON INDEX idx_quotations_expired IS 'Optimiza consultas de cotizaciones expiradas';
COMMENT ON INDEX idx_audit_logs_created IS 'Optimiza consultas de auditoría por fecha';
COMMENT ON INDEX idx_system_logs_errors IS 'Optimiza consultas de logs de error';

-- =====================================================
-- ESTADÍSTICAS DE RENDIMIENTO
-- =====================================================

-- Actualizar estadísticas después de crear índices
ANALYZE work_orders;
ANALYZE customers;
ANALYZE vehicles;
ANALYZE inventory_items;
ANALYZE quotations;
ANALYZE sales_invoices;
ANALYZE payments;
ANALYZE users;
ANALYZE audit_logs;
ANALYZE system_logs;
ANALYZE warranty_claims;















