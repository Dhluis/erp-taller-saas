-- =====================================================
-- MIGRACIÓN: Verificar y Corregir Datos Legacy sin organization_id
-- Fecha: 2025-12-05
-- Objetivo: Identificar y corregir datos sin organization_id
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICACIÓN DE DATOS LEGACY
-- =====================================================

-- Función para reportar datos sin organization_id
CREATE OR REPLACE FUNCTION verify_legacy_data()
RETURNS TABLE (
    table_name TEXT,
    records_without_org BIGINT,
    total_records BIGINT,
    percentage_missing NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            'customers'::TEXT as tbl,
            COUNT(*) FILTER (WHERE organization_id IS NULL) as missing,
            COUNT(*) as total
        FROM customers
        UNION ALL
        SELECT 
            'work_orders'::TEXT,
            COUNT(*) FILTER (WHERE organization_id IS NULL) as missing,
            COUNT(*) as total
        FROM work_orders
        UNION ALL
        SELECT 
            'products'::TEXT,
            COUNT(*) FILTER (WHERE organization_id IS NULL) as missing,
            COUNT(*) as total
        FROM products
        UNION ALL
        SELECT 
            'sales_invoices'::TEXT,
            COUNT(*) FILTER (WHERE organization_id IS NULL) as missing,
            COUNT(*) as total
        FROM sales_invoices
        UNION ALL
        SELECT 
            'quotations'::TEXT,
            COUNT(*) FILTER (WHERE organization_id IS NULL) as missing,
            COUNT(*) as total
        FROM quotations
        UNION ALL
        SELECT 
            'suppliers'::TEXT,
            COUNT(*) FILTER (WHERE organization_id IS NULL) as missing,
            COUNT(*) as total
        FROM suppliers
    )
    SELECT 
        tbl as table_name,
        missing as records_without_org,
        total as total_records,
        CASE 
            WHEN total > 0 THEN ROUND((missing::NUMERIC / total::NUMERIC * 100)::NUMERIC, 2)
            ELSE 0
        END as percentage_missing
    FROM stats
    ORDER BY missing DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 2: FUNCIÓN PARA ASIGNAR organization_id A DATOS LEGACY
-- =====================================================

-- Función para asignar organization_id a datos legacy
-- Usa la organización por defecto o la del usuario creador
CREATE OR REPLACE FUNCTION fix_legacy_organization_id(
    p_default_org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID
)
RETURNS TABLE (
    table_name TEXT,
    records_fixed BIGINT
) AS $$
DECLARE
    v_fixed_customers BIGINT := 0;
    v_fixed_work_orders BIGINT := 0;
    v_fixed_products BIGINT := 0;
    v_fixed_invoices BIGINT := 0;
    v_fixed_quotations BIGINT := 0;
    v_fixed_suppliers BIGINT := 0;
BEGIN
    -- Verificar que la organización por defecto existe
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_default_org_id) THEN
        RAISE EXCEPTION 'La organización por defecto % no existe. Por favor, créala primero.', p_default_org_id;
    END IF;

    -- 1. Corregir customers sin organization_id
    -- Intentar obtener organization_id del usuario creador, si no, usar default
    WITH fixed AS (
        UPDATE customers
        SET 
            organization_id = COALESCE(
                (SELECT organization_id FROM users WHERE id = customers.created_by),
                (SELECT organization_id FROM workshops WHERE id = (SELECT workshop_id FROM users WHERE id = customers.created_by)),
                p_default_org_id
            ),
            updated_at = NOW()
        WHERE organization_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_fixed_customers FROM fixed;

    -- 2. Corregir work_orders sin organization_id
    WITH fixed AS (
        UPDATE work_orders
        SET 
            organization_id = COALESCE(
                (SELECT organization_id FROM users WHERE id = work_orders.created_by),
                (SELECT organization_id FROM workshops WHERE id = work_orders.workshop_id),
                (SELECT organization_id FROM customers WHERE id = work_orders.customer_id),
                p_default_org_id
            ),
            updated_at = NOW()
        WHERE organization_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_fixed_work_orders FROM fixed;

    -- 3. Corregir products sin organization_id
    WITH fixed AS (
        UPDATE products
        SET 
            organization_id = COALESCE(
                (SELECT organization_id FROM users WHERE id = products.created_by),
                p_default_org_id
            ),
            updated_at = NOW()
        WHERE organization_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_fixed_products FROM fixed;

    -- 4. Corregir sales_invoices sin organization_id
    WITH fixed AS (
        UPDATE sales_invoices
        SET 
            organization_id = COALESCE(
                (SELECT organization_id FROM customers WHERE id = sales_invoices.customer_id),
                (SELECT organization_id FROM work_orders WHERE id = sales_invoices.work_order_id),
                (SELECT organization_id FROM users WHERE id = sales_invoices.created_by),
                p_default_org_id
            ),
            updated_at = NOW()
        WHERE organization_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_fixed_invoices FROM fixed;

    -- 5. Corregir quotations sin organization_id
    WITH fixed AS (
        UPDATE quotations
        SET 
            organization_id = COALESCE(
                (SELECT organization_id FROM customers WHERE id = quotations.customer_id),
                (SELECT organization_id FROM work_orders WHERE id = quotations.work_order_id),
                (SELECT organization_id FROM users WHERE id = quotations.created_by),
                p_default_org_id
            ),
            updated_at = NOW()
        WHERE organization_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_fixed_quotations FROM fixed;

    -- 6. Corregir suppliers sin organization_id
    WITH fixed AS (
        UPDATE suppliers
        SET 
            organization_id = COALESCE(
                (SELECT organization_id FROM users WHERE id = suppliers.created_by),
                p_default_org_id
            ),
            updated_at = NOW()
        WHERE organization_id IS NULL
        RETURNING id
    )
    SELECT COUNT(*) INTO v_fixed_suppliers FROM fixed;

    -- Retornar resultados
    RETURN QUERY
    SELECT 'customers'::TEXT, v_fixed_customers
    WHERE v_fixed_customers > 0
    UNION ALL
    SELECT 'work_orders'::TEXT, v_fixed_work_orders
    WHERE v_fixed_work_orders > 0
    UNION ALL
    SELECT 'products'::TEXT, v_fixed_products
    WHERE v_fixed_products > 0
    UNION ALL
    SELECT 'sales_invoices'::TEXT, v_fixed_invoices
    WHERE v_fixed_invoices > 0
    UNION ALL
    SELECT 'quotations'::TEXT, v_fixed_quotations
    WHERE v_fixed_quotations > 0
    UNION ALL
    SELECT 'suppliers'::TEXT, v_fixed_suppliers
    WHERE v_fixed_suppliers > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 3: TRIGGERS PARA PREVENIR FUTUROS PROBLEMAS
-- =====================================================

-- Función trigger para asegurar organization_id al insertar
CREATE OR REPLACE FUNCTION ensure_organization_id_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
BEGIN
    -- Si ya tiene organization_id, no hacer nada
    IF NEW.organization_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Intentar obtener organization_id del usuario actual
    BEGIN
        -- Intentar desde users.organization_id
        SELECT organization_id INTO v_organization_id
        FROM users
        WHERE auth_user_id = auth.uid()
        LIMIT 1;

        -- Si no tiene organization_id directo, intentar desde workshop
        IF v_organization_id IS NULL THEN
            SELECT w.organization_id INTO v_organization_id
            FROM users u
            JOIN workshops w ON w.id = u.workshop_id
            WHERE u.auth_user_id = auth.uid()
            LIMIT 1;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Si falla, usar organización por defecto
            v_organization_id := '00000000-0000-0000-0000-000000000001'::UUID;
    END;

    -- Si aún no hay organization_id, usar default
    IF v_organization_id IS NULL THEN
        v_organization_id := '00000000-0000-0000-0000-000000000001'::UUID;
    END IF;

    NEW.organization_id := v_organization_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger a customers (si no existe ya)
DROP TRIGGER IF EXISTS ensure_org_id_customers_insert ON customers;
CREATE TRIGGER ensure_org_id_customers_insert
    BEFORE INSERT ON customers
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION ensure_organization_id_on_insert();

-- Aplicar trigger a work_orders (si no existe ya)
DROP TRIGGER IF EXISTS ensure_org_id_work_orders_insert ON work_orders;
CREATE TRIGGER ensure_org_id_work_orders_insert
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION ensure_organization_id_on_insert();

-- Aplicar trigger a products (si no existe ya)
DROP TRIGGER IF EXISTS ensure_org_id_products_insert ON products;
CREATE TRIGGER ensure_org_id_products_insert
    BEFORE INSERT ON products
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION ensure_organization_id_on_insert();

-- Aplicar trigger a sales_invoices (si no existe ya)
DROP TRIGGER IF EXISTS ensure_org_id_sales_invoices_insert ON sales_invoices;
CREATE TRIGGER ensure_org_id_sales_invoices_insert
    BEFORE INSERT ON sales_invoices
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION ensure_organization_id_on_insert();

-- Aplicar trigger a quotations (si no existe ya)
DROP TRIGGER IF EXISTS ensure_org_id_quotations_insert ON quotations;
CREATE TRIGGER ensure_org_id_quotations_insert
    BEFORE INSERT ON quotations
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION ensure_organization_id_on_insert();

-- Aplicar trigger a suppliers (si no existe ya)
DROP TRIGGER IF EXISTS ensure_org_id_suppliers_insert ON suppliers;
CREATE TRIGGER ensure_org_id_suppliers_insert
    BEFORE INSERT ON suppliers
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION ensure_organization_id_on_insert();

-- =====================================================
-- PARTE 4: COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION verify_legacy_data() IS 
'Verifica cuántos registros tienen organization_id NULL en cada tabla';

COMMENT ON FUNCTION fix_legacy_organization_id(UUID) IS 
'Asigna organization_id a registros legacy. Usa la organización del usuario creador o la organización por defecto';

COMMENT ON FUNCTION ensure_organization_id_on_insert() IS 
'Trigger que asegura que todos los nuevos registros tengan organization_id asignado automáticamente';

