-- =====================================================
-- MIGRACIÓN COMPLETA: Protección Integral Multi-Tenancy
-- Fecha: 2025-12-05
-- Objetivo: Prevenir inconsistencias de organization_id
-- =====================================================
-- 
-- Esta migración combina las funcionalidades de:
-- - 018_verify_and_fix_legacy_organization_id.sql
-- - 019_comprehensive_organization_protection.sql
--
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTE 1: FUNCIONES DE VERIFICACIÓN Y CORRECCIÓN
-- =====================================================

-- Función para verificar datos legacy (sin organization_id)
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

-- Función para corregir datos legacy
CREATE OR REPLACE FUNCTION fix_legacy_organization_id(p_default_org_id UUID DEFAULT '00000000-0000-0000-0000-000000000001'::UUID)
RETURNS TABLE (
    table_name TEXT,
    records_updated BIGINT
) AS $$
DECLARE
    v_updated BIGINT;
BEGIN
    -- Verificar que la organización por defecto existe
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_default_org_id) THEN
        RAISE EXCEPTION 'La organización por defecto % no existe', p_default_org_id;
    END IF;

    -- Corregir customers
    UPDATE customers
    SET organization_id = p_default_org_id
    WHERE organization_id IS NULL
      AND created_by IS NOT NULL
      AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = customers.created_by
          AND (u.organization_id IS NOT NULL OR EXISTS (
              SELECT 1 FROM workshops w
              JOIN users u2 ON u2.workshop_id = w.id
              WHERE u2.id = customers.created_by
              AND w.organization_id IS NOT NULL
          ))
      );
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN QUERY SELECT 'customers'::TEXT, v_updated;

    -- Si aún hay registros sin organization_id, asignar el default
    UPDATE customers
    SET organization_id = p_default_org_id
    WHERE organization_id IS NULL;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN QUERY SELECT 'customers (default)'::TEXT, v_updated;

    -- Corregir work_orders
    UPDATE work_orders
    SET organization_id = p_default_org_id
    WHERE organization_id IS NULL;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN QUERY SELECT 'work_orders'::TEXT, v_updated;

    -- Corregir products
    UPDATE products
    SET organization_id = p_default_org_id
    WHERE organization_id IS NULL;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN QUERY SELECT 'products'::TEXT, v_updated;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PARTE 2: FUNCIÓN PARA OBTENER organization_id DEL USUARIO
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    v_organization_id UUID;
    v_user_id UUID;
    v_default_org_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Intentar obtener organization_id directo del usuario
    SELECT organization_id INTO v_organization_id
    FROM users
    WHERE auth_user_id = v_user_id
    LIMIT 1;

    -- Si no tiene, intentar desde workshop
    IF v_organization_id IS NULL THEN
        SELECT w.organization_id INTO v_organization_id
        FROM users u
        JOIN workshops w ON w.id = u.workshop_id
        WHERE u.auth_user_id = v_user_id
        LIMIT 1;
    END IF;

    -- Si aún no hay, usar default
    IF v_organization_id IS NULL THEN
        RAISE WARNING 'Usuario % no tiene organization_id asignado, usando organización por defecto', v_user_id;
        v_organization_id := v_default_org_id;
    END IF;

    -- Verificar que la organización existe
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = v_organization_id) THEN
        RAISE EXCEPTION 'La organización % no existe en la base de datos', v_organization_id;
    END IF;

    RETURN v_organization_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 3: TRIGGER PARA ASIGNAR organization_id AUTOMÁTICAMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION ensure_organization_id_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_organization_id UUID;
    v_table_name TEXT := TG_TABLE_NAME;
BEGIN
    -- Si ya tiene organization_id válido, verificar que existe
    IF NEW.organization_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = NEW.organization_id) THEN
            RAISE EXCEPTION 'La organización % no existe en la tabla %', NEW.organization_id, v_table_name;
        END IF;
        RETURN NEW;
    END IF;

    -- Obtener organization_id del usuario
    BEGIN
        v_organization_id := get_user_organization_id();
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Error obteniendo organization_id para tabla %: %', v_table_name, SQLERRM;
            v_organization_id := '00000000-0000-0000-0000-000000000001'::UUID;
    END;

    -- Asignar organization_id
    NEW.organization_id := v_organization_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 4: APLICAR CONSTRAINTS NOT NULL (Solo a tablas que existen)
-- =====================================================

DO $$
DECLARE
    v_table_name TEXT;
    table_exists BOOLEAN;
    column_exists BOOLEAN;
    is_nullable BOOLEAN;
BEGIN
    FOR v_table_name IN 
        SELECT unnest(ARRAY['customers', 'work_orders', 'products', 'quotations', 'suppliers', 'invoices'])
    LOOP
        -- Verificar si la tabla existe
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
              AND t.table_name = v_table_name
        ) INTO table_exists;
        
        IF table_exists THEN
            -- Verificar si tiene la columna organization_id
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                  AND c.table_name = v_table_name 
                  AND c.column_name = 'organization_id'
            ) INTO column_exists;
            
            IF column_exists THEN
                -- Verificar si es nullable
                SELECT c.is_nullable = 'YES'
                INTO is_nullable
                FROM information_schema.columns c
                WHERE c.table_schema = 'public'
                  AND c.table_name = v_table_name
                  AND c.column_name = 'organization_id';
                
                -- Aplicar NOT NULL solo si es nullable
                IF is_nullable THEN
                    -- Primero corregir datos NULL existentes
                    EXECUTE format('
                        UPDATE %I 
                        SET organization_id = ''00000000-0000-0000-0000-000000000001''::UUID
                        WHERE organization_id IS NULL
                    ', v_table_name);
                    
                    -- Luego aplicar NOT NULL
                    EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET NOT NULL', v_table_name);
                    RAISE NOTICE 'Aplicado NOT NULL a %', v_table_name;
                ELSE
                    RAISE NOTICE 'La columna organization_id en % ya es NOT NULL', v_table_name;
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- PARTE 5: CREAR TRIGGERS PARA ASIGNAR organization_id AUTOMÁTICAMENTE
-- =====================================================

-- Trigger para customers
DROP TRIGGER IF EXISTS ensure_org_id_customers_insert ON customers;
CREATE TRIGGER ensure_org_id_customers_insert
    BEFORE INSERT ON customers
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION ensure_organization_id_on_insert();

-- Trigger para work_orders
DROP TRIGGER IF EXISTS ensure_org_id_work_orders_insert ON work_orders;
CREATE TRIGGER ensure_org_id_work_orders_insert
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION ensure_organization_id_on_insert();

-- Trigger para products (si existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_schema = 'public' AND t.table_name = 'products') THEN
        DROP TRIGGER IF EXISTS ensure_org_id_products_insert ON products;
        EXECUTE 'CREATE TRIGGER ensure_org_id_products_insert
            BEFORE INSERT ON products
            FOR EACH ROW
            WHEN (NEW.organization_id IS NULL)
            EXECUTE FUNCTION ensure_organization_id_on_insert()';
    END IF;
END $$;

-- =====================================================
-- PARTE 6: TRIGGER PARA PREVENIR CAMBIOS NO AUTORIZADOS
-- =====================================================

CREATE OR REPLACE FUNCTION prevent_organization_id_change()
RETURNS TRIGGER AS $$
DECLARE
    v_user_org_id UUID;
BEGIN
    -- Si organization_id no cambió, permitir
    IF OLD.organization_id = NEW.organization_id THEN
        RETURN NEW;
    END IF;

    -- Obtener organization_id del usuario actual
    BEGIN
        v_user_org_id := get_user_organization_id();
    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'No se puede verificar la organización del usuario: %', SQLERRM;
    END;

    -- Solo permitir cambiar organization_id si el usuario pertenece a alguna de las organizaciones
    IF OLD.organization_id != v_user_org_id AND NEW.organization_id != v_user_org_id THEN
        RAISE EXCEPTION 'No se puede cambiar organization_id de % a %. El usuario no pertenece a ninguna de estas organizaciones.', 
            OLD.organization_id, NEW.organization_id;
    END IF;

    -- Verificar que la organización destino existe
    IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = NEW.organization_id) THEN
        RAISE EXCEPTION 'La organización destino % no existe', NEW.organization_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger de prevención a customers
DROP TRIGGER IF EXISTS prevent_org_change_customers ON customers;
CREATE TRIGGER prevent_org_change_customers
    BEFORE UPDATE ON customers
    FOR EACH ROW
    WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
    EXECUTE FUNCTION prevent_organization_id_change();

-- Aplicar trigger de prevención a work_orders
DROP TRIGGER IF EXISTS prevent_org_change_work_orders ON work_orders;
CREATE TRIGGER prevent_org_change_work_orders
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
    EXECUTE FUNCTION prevent_organization_id_change();

-- =====================================================
-- PARTE 7: RLS POLICIES PARA CUSTOMERS
-- =====================================================

-- Habilitar RLS en customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: SELECT - Solo ver clientes de su organización
DROP POLICY IF EXISTS customers_select_own_org ON customers;
CREATE POLICY customers_select_own_org ON customers
    FOR SELECT
    USING (organization_id = get_user_organization_id());

-- Policy: INSERT - Solo insertar en su organización
DROP POLICY IF EXISTS customers_insert_own_org ON customers;
CREATE POLICY customers_insert_own_org ON customers
    FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

-- Policy: UPDATE - Solo actualizar clientes de su organización
DROP POLICY IF EXISTS customers_update_own_org ON customers;
CREATE POLICY customers_update_own_org ON customers
    FOR UPDATE
    USING (organization_id = get_user_organization_id())
    WITH CHECK (organization_id = get_user_organization_id());

-- Policy: DELETE - Solo eliminar clientes de su organización
DROP POLICY IF EXISTS customers_delete_own_org ON customers;
CREATE POLICY customers_delete_own_org ON customers
    FOR DELETE
    USING (organization_id = get_user_organization_id());

-- =====================================================
-- PARTE 8: TABLA DE AUDITORÍA
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    old_organization_id UUID,
    new_organization_id UUID NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT
);

-- Función para registrar cambios
CREATE OR REPLACE FUNCTION log_organization_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
        INSERT INTO organization_audit_log (
            table_name,
            record_id,
            old_organization_id,
            new_organization_id,
            changed_by
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            OLD.organization_id,
            NEW.organization_id,
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar auditoría a customers
DROP TRIGGER IF EXISTS audit_org_change_customers ON customers;
CREATE TRIGGER audit_org_change_customers
    AFTER UPDATE ON customers
    FOR EACH ROW
    WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
    EXECUTE FUNCTION log_organization_change();

-- =====================================================
-- PARTE 9: COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION verify_legacy_data() IS 
'Verifica cuántos registros tienen organization_id NULL en las tablas críticas.';

COMMENT ON FUNCTION fix_legacy_organization_id(UUID) IS 
'Corrige registros con organization_id NULL asignándoles una organización por defecto.';

COMMENT ON FUNCTION get_user_organization_id() IS 
'Retorna el organization_id del usuario autenticado. Usa organización por defecto si el usuario no tiene una asignada.';

COMMENT ON FUNCTION ensure_organization_id_on_insert() IS 
'Trigger que asigna organization_id automáticamente a nuevos registros si falta.';

COMMENT ON FUNCTION prevent_organization_id_change() IS 
'Trigger que previene cambios no autorizados de organization_id.';

COMMENT ON TABLE organization_audit_log IS 
'Registra todos los cambios de organization_id para auditoría.';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================

-- =====================================================
-- PARTE 10: VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que todas las funciones se crearon
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN (
        'verify_legacy_data',
        'fix_legacy_organization_id',
        'get_user_organization_id',
        'ensure_organization_id_on_insert',
        'prevent_organization_id_change',
        'log_organization_change'
      );
    
    IF func_count < 6 THEN
        RAISE WARNING 'Solo se crearon % de 6 funciones esperadas', func_count;
    ELSE
        RAISE NOTICE '✅ Todas las funciones creadas correctamente';
    END IF;
END $$;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ Migración completada exitosamente!';
    RAISE NOTICE '✅ Protección multi-tenancy activada';
    RAISE NOTICE '✅ Triggers creados';
    RAISE NOTICE '✅ RLS policies aplicadas';
    RAISE NOTICE '';
    RAISE NOTICE 'Para verificar datos legacy, ejecuta: SELECT * FROM verify_legacy_data();';
END $$;
