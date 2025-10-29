-- =====================================================
-- OPTIMIZACIÓN DE CONSULTAS FRECUENTES
-- =====================================================
-- Consultas optimizadas para mejorar el rendimiento
-- del ERP Taller SaaS

-- =====================================================
-- CONSULTA OPTIMIZADA: ÓRDENES EN PROGRESO
-- =====================================================

-- ❌ CONSULTA LENTA (sin índices):
-- SELECT * FROM work_orders WHERE status = 'in_progress';

-- ✅ CONSULTA OPTIMIZADA:
CREATE OR REPLACE VIEW v_work_orders_in_progress AS
SELECT 
    wo.id,
    wo.work_order_number,
    wo.status,
    wo.description,
    wo.created_at,
    wo.delivery_date,
    wo.total_amount,
    c.name as customer_name,
    c.phone as customer_phone,
    v.brand,
    v.model,
    v.license_plate
FROM work_orders wo
INNER JOIN customers c ON wo.customer_id = c.id
INNER JOIN vehicles v ON wo.vehicle_id = v.id
WHERE wo.status = 'in_progress'
  AND wo.organization_id = $1  -- Parámetro de organización
ORDER BY wo.created_at DESC;

-- =====================================================
-- CONSULTA OPTIMIZADA: DASHBOARD PRINCIPAL
-- =====================================================

CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
    -- Estadísticas de órdenes
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_orders,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
    
    -- Estadísticas de facturación
    COALESCE(SUM(si.total_amount), 0) as total_revenue,
    COUNT(si.id) as total_invoices,
    COALESCE(SUM(si.total_amount) FILTER (WHERE si.status = 'paid'), 0) as paid_amount,
    COALESCE(SUM(si.total_amount) FILTER (WHERE si.status = 'pending'), 0) as pending_amount,
    
    -- Estadísticas de inventario
    COUNT(ii.id) as total_items,
    COUNT(ii.id) FILTER (WHERE ii.quantity <= ii.minimum_stock) as low_stock_items,
    COUNT(ii.id) FILTER (WHERE ii.quantity = 0) as out_of_stock_items,
    
    -- Estadísticas de clientes
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT v.id) as total_vehicles
    
FROM work_orders wo
LEFT JOIN sales_invoices si ON wo.id = si.work_order_id
LEFT JOIN inventory_items ii ON ii.organization_id = wo.organization_id
LEFT JOIN customers c ON c.organization_id = wo.organization_id
LEFT JOIN vehicles v ON v.organization_id = wo.organization_id
WHERE wo.organization_id = $1;

-- =====================================================
-- CONSULTA OPTIMIZADA: REPORTES DE VENTAS
-- =====================================================

CREATE OR REPLACE VIEW v_sales_report AS
SELECT 
    DATE_TRUNC('month', si.invoice_date) as month,
    COUNT(si.id) as total_invoices,
    SUM(si.total_amount) as total_revenue,
    AVG(si.total_amount) as average_invoice,
    COUNT(DISTINCT si.customer_id) as unique_customers,
    SUM(si.total_amount) FILTER (WHERE si.status = 'paid') as paid_revenue,
    SUM(si.total_amount) FILTER (WHERE si.status = 'pending') as pending_revenue
FROM sales_invoices si
WHERE si.organization_id = $1
  AND si.invoice_date >= $2  -- Fecha inicio
  AND si.invoice_date <= $3  -- Fecha fin
GROUP BY DATE_TRUNC('month', si.invoice_date)
ORDER BY month DESC;

-- =====================================================
-- CONSULTA OPTIMIZADA: TOP CLIENTES
-- =====================================================

CREATE OR REPLACE VIEW v_top_customers AS
SELECT 
    c.id,
    c.name,
    c.email,
    c.phone,
    COUNT(si.id) as total_orders,
    SUM(si.total_amount) as total_spent,
    MAX(si.invoice_date) as last_order_date,
    AVG(si.total_amount) as average_order_value
FROM customers c
INNER JOIN sales_invoices si ON c.id = si.customer_id
WHERE c.organization_id = $1
  AND si.invoice_date >= $2  -- Fecha inicio
  AND si.invoice_date <= $3  -- Fecha fin
GROUP BY c.id, c.name, c.email, c.phone
ORDER BY total_spent DESC
LIMIT 10;

-- =====================================================
-- CONSULTA OPTIMIZADA: INVENTARIO BAJO STOCK
-- =====================================================

CREATE OR REPLACE VIEW v_low_stock_items AS
SELECT 
    ii.id,
    ii.name,
    ii.sku,
    ii.quantity,
    ii.minimum_stock,
    ii.unit_price,
    ii.quantity * ii.unit_price as total_value,
    ic.name as category_name,
    CASE 
        WHEN ii.quantity = 0 THEN 'Sin stock'
        WHEN ii.quantity <= ii.minimum_stock THEN 'Stock bajo'
        ELSE 'Stock normal'
    END as stock_status
FROM inventory_items ii
LEFT JOIN inventory_categories ic ON ii.category_id = ic.id
WHERE ii.organization_id = $1
  AND ii.quantity <= ii.minimum_stock
ORDER BY 
    CASE 
        WHEN ii.quantity = 0 THEN 1
        WHEN ii.quantity <= ii.minimum_stock THEN 2
        ELSE 3
    END,
    ii.quantity ASC;

-- =====================================================
-- CONSULTA OPTIMIZADA: GARANTÍAS EXPIRANDO
-- =====================================================

CREATE OR REPLACE VIEW v_expiring_warranties AS
SELECT 
    w.id,
    w.warranty_number,
    w.item_description,
    w.end_date,
    w.end_date - CURRENT_DATE as days_remaining,
    c.name as customer_name,
    c.phone as customer_phone,
    v.brand,
    v.model,
    v.license_plate,
    CASE 
        WHEN w.end_date - CURRENT_DATE <= 7 THEN 'Crítico'
        WHEN w.end_date - CURRENT_DATE <= 30 THEN 'Advertencia'
        ELSE 'Normal'
    END as urgency_level
FROM warranties w
INNER JOIN customers c ON w.customer_id = c.id
INNER JOIN vehicles v ON w.vehicle_id = v.id
WHERE w.organization_id = $1
  AND w.status = 'active'
  AND w.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
ORDER BY w.end_date ASC;

-- =====================================================
-- CONSULTA OPTIMIZADA: LOGS DE SISTEMA
-- =====================================================

CREATE OR REPLACE VIEW v_system_logs_summary AS
SELECT 
    log_level,
    log_type,
    COUNT(*) as log_count,
    MAX(created_at) as last_occurrence,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_count
FROM system_logs
WHERE organization_id = $1
  AND created_at >= $2  -- Fecha inicio
  AND created_at <= $3  -- Fecha fin
GROUP BY log_level, log_type
ORDER BY log_count DESC;

-- =====================================================
-- FUNCIONES OPTIMIZADAS
-- =====================================================

-- Función para obtener estadísticas de rendimiento
CREATE OR REPLACE FUNCTION get_performance_stats(org_id UUID)
RETURNS TABLE (
    table_name TEXT,
    row_count BIGINT,
    index_count INTEGER,
    table_size TEXT,
    index_size TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        (SELECT COUNT(*) FROM pg_indexes WHERE tablename = t.tablename) as index_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size
    FROM pg_stat_user_tables t
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar logs antiguos
CREATE OR REPLACE FUNCTION clean_old_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Limpiar system_logs
    DELETE FROM system_logs 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Limpiar audit_logs
    DELETE FROM audit_logs 
    WHERE created_at < CURRENT_DATE - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CONFIGURACIÓN DE RENDIMIENTO
-- =====================================================

-- Configurar parámetros de PostgreSQL para mejor rendimiento
-- (Estos deben ejecutarse como superusuario)

-- Aumentar work_mem para consultas complejas
-- ALTER SYSTEM SET work_mem = '256MB';

-- Optimizar shared_buffers
-- ALTER SYSTEM SET shared_buffers = '256MB';

-- Configurar effective_cache_size
-- ALTER SYSTEM SET effective_cache_size = '1GB';

-- Optimizar random_page_cost
-- ALTER SYSTEM SET random_page_cost = 1.1;

-- Configurar maintenance_work_mem
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- =====================================================
-- MONITOREO DE RENDIMIENTO
-- =====================================================

-- Vista para monitorear consultas lentas
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
WHERE mean_time > 1000  -- Consultas que toman más de 1 segundo
ORDER BY mean_time DESC
LIMIT 20;

-- Vista para monitorear uso de índices
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    CASE 
        WHEN idx_scan = 0 THEN 'No usado'
        WHEN idx_scan < 100 THEN 'Poco usado'
        ELSE 'Bien usado'
    END as usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
















<<<<<<< HEAD


=======
>>>>>>> parent of b9214dc (landing page cambios)


