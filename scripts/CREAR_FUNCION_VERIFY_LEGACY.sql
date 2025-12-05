-- =====================================================
-- SCRIPT: Crear función verify_legacy_data() si no existe
-- =====================================================

-- Eliminar función si existe (para recrearla)
DROP FUNCTION IF EXISTS verify_legacy_data();

-- Crear función verify_legacy_data()
CREATE OR REPLACE FUNCTION verify_legacy_data()
RETURNS TABLE (
    table_name TEXT,
    total_records BIGINT,
    records_without_org BIGINT,
    percentage_without_org NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        'customers'::TEXT,
        (SELECT COUNT(*) FROM customers),
        (SELECT COUNT(*) FROM customers WHERE organization_id IS NULL),
        CASE 
            WHEN (SELECT COUNT(*) FROM customers) > 0 
            THEN ROUND((SELECT COUNT(*)::NUMERIC FROM customers WHERE organization_id IS NULL) / (SELECT COUNT(*)::NUMERIC FROM customers) * 100, 2)
            ELSE 0
        END
    UNION ALL
    SELECT 
        'work_orders'::TEXT,
        (SELECT COUNT(*) FROM work_orders),
        (SELECT COUNT(*) FROM work_orders WHERE organization_id IS NULL),
        CASE 
            WHEN (SELECT COUNT(*) FROM work_orders) > 0 
            THEN ROUND((SELECT COUNT(*)::NUMERIC FROM work_orders WHERE organization_id IS NULL) / (SELECT COUNT(*)::NUMERIC FROM work_orders) * 100, 2)
            ELSE 0
        END
    UNION ALL
    SELECT 
        'products'::TEXT,
        (SELECT COUNT(*) FROM products),
        (SELECT COUNT(*) FROM products WHERE organization_id IS NULL),
        CASE 
            WHEN (SELECT COUNT(*) FROM products) > 0 
            THEN ROUND((SELECT COUNT(*)::NUMERIC FROM products WHERE organization_id IS NULL) / (SELECT COUNT(*)::NUMERIC FROM products) * 100, 2)
            ELSE 0
        END;
END;
$$ LANGUAGE plpgsql;

-- Verificar que se creó correctamente
SELECT 
    '✅ Función verify_legacy_data() creada exitosamente' as resultado;

-- Probar la función
SELECT * FROM verify_legacy_data();
