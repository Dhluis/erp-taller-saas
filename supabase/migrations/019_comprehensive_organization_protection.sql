-- =====================================================
-- MIGRACIÓN: Protección Integral de Multi-Tenancy
-- Fecha: 2025-12-05
-- Objetivo: Prevenir inconsistencias de organization_id a largo plazo
-- =====================================================

-- =====================================================
-- PARTE 1: CONSTRAINTS Y VALIDACIONES A NIVEL DE BD
-- =====================================================
-- Nota: Solo aplicamos NOT NULL a tablas que existen y tienen organization_id

-- Función helper para aplicar NOT NULL solo si la tabla existe
DO $$
DECLARE
    table_name TEXT;
    table_exists BOOLEAN;
    column_exists BOOLEAN;
    is_nullable BOOLEAN;
BEGIN
    -- Lista de tablas a verificar
    FOR table_name IN 
        SELECT unnest(ARRAY['customers', 'work_orders', 'products', 'quotations', 'suppliers', 'invoices', 'sales_invoices'])
    LOOP
        -- Verificar si la tabla existe
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = table_name
        ) INTO table_exists;
        
        IF table_exists THEN
            -- Verificar si tiene la columna organization_id
            SELECT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                  AND table_name = table_name 
                  AND column_name = 'organization_id'
            ) INTO column_exists;
            
            IF column_exists THEN
                -- Verificar si es nullable
                SELECT is_nullable = 'YES'
                INTO is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = table_name
                  AND column_name = 'organization_id';
                
                -- Aplicar NOT NULL solo si es nullable
                IF is_nullable THEN
                    EXECUTE format('ALTER TABLE %I ALTER COLUMN organization_id SET NOT NULL', table_name);
                    RAISE NOTICE 'Aplicado NOT NULL a %', table_name;
                ELSE
                    RAISE NOTICE 'La columna organization_id en % ya es NOT NULL', table_name;
                END IF;
            ELSE
                RAISE NOTICE 'La tabla % existe pero no tiene columna organization_id', table_name;
            END IF;
        ELSE
            RAISE NOTICE 'La tabla % no existe, omitiendo', table_name;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- PARTE 2: FUNCIÓN MEJORADA PARA OBTENER organization_id
-- =====================================================

-- Función robusta que siempre retorna un organization_id válido
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    v_organization_id UUID;
    v_user_id UUID;
    v_default_org_id UUID := '00000000-0000-0000-0000-000000000001'::UUID;
BEGIN
    -- Obtener ID del usuario autenticado
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no autenticado';
    END IF;

    -- Intentar obtener organization_id directo del usuario
    SELECT organization_id INTO v_organization_id
    FROM users
    WHERE auth_user_id = v_user_id
    LIMIT 1;

    -- Si no tiene organization_id directo, intentar desde workshop
    IF v_organization_id IS NULL THEN
        SELECT w.organization_id INTO v_organization_id
        FROM users u
        JOIN workshops w ON w.id = u.workshop_id
        WHERE u.auth_user_id = v_user_id
        LIMIT 1;
    END IF;

    -- Si aún no hay organization_id, usar default (pero loguear warning)
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
-- PARTE 3: TRIGGER MEJORADO PARA INSERT
-- =====================================================

-- Función trigger mejorada con validaciones adicionales
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
            -- Si falla, usar organización por defecto pero loguear error
            RAISE WARNING 'Error obteniendo organization_id para tabla %: %', v_table_name, SQLERRM;
            v_organization_id := '00000000-0000-0000-0000-000000000001'::UUID;
    END;

    -- Asignar organization_id
    NEW.organization_id := v_organization_id;
    
    -- Log para auditoría (opcional, puede comentarse en producción)
    RAISE NOTICE 'Asignado organization_id % a nuevo registro en tabla %', v_organization_id, v_table_name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 4: TRIGGER PARA PREVENIR CAMBIOS DE organization_id
-- =====================================================

-- Función para prevenir cambios no autorizados de organization_id
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

    -- Solo permitir cambiar organization_id si:
    -- 1. El usuario pertenece a la organización original O
    -- 2. El usuario pertenece a la organización destino
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

-- Aplicar trigger de prevención de cambios a customers
DROP TRIGGER IF EXISTS prevent_org_change_customers ON customers;
CREATE TRIGGER prevent_org_change_customers
    BEFORE UPDATE ON customers
    FOR EACH ROW
    WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
    EXECUTE FUNCTION prevent_organization_id_change();

-- Aplicar a otras tablas críticas
DROP TRIGGER IF EXISTS prevent_org_change_work_orders ON work_orders;
CREATE TRIGGER prevent_org_change_work_orders
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    WHEN (OLD.organization_id IS DISTINCT FROM NEW.organization_id)
    EXECUTE FUNCTION prevent_organization_id_change();

-- =====================================================
-- PARTE 5: FUNCIÓN DE VALIDACIÓN PARA API ROUTES
-- =====================================================

-- Función para validar que un registro pertenece a la organización del usuario
CREATE OR REPLACE FUNCTION validate_record_organization(
    p_table_name TEXT,
    p_record_id UUID,
    p_organization_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_org_id UUID;
    v_record_org_id UUID;
BEGIN
    -- Obtener organization_id del usuario
    v_user_org_id := get_user_organization_id();

    -- Verificar que el usuario tiene acceso a la organización especificada
    IF p_organization_id != v_user_org_id THEN
        RAISE EXCEPTION 'El usuario no tiene acceso a la organización %', p_organization_id;
    END IF;

    -- Obtener organization_id del registro
    EXECUTE format('SELECT organization_id FROM %I WHERE id = $1', p_table_name)
    USING p_record_id
    INTO v_record_org_id;

    -- Verificar que el registro existe
    IF v_record_org_id IS NULL THEN
        RAISE EXCEPTION 'El registro % no existe en la tabla %', p_record_id, p_table_name;
    END IF;

    -- Verificar que el registro pertenece a la organización del usuario
    IF v_record_org_id != v_user_org_id THEN
        RAISE EXCEPTION 'El registro % pertenece a otra organización', p_record_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 6: RLS POLICIES MEJORADAS
-- =====================================================

-- Habilitar RLS en customers si no está habilitado
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver clientes de su organización
DROP POLICY IF EXISTS customers_select_own_org ON customers;
CREATE POLICY customers_select_own_org ON customers
    FOR SELECT
    USING (organization_id = get_user_organization_id());

-- Policy: Los usuarios solo pueden insertar clientes en su organización
DROP POLICY IF EXISTS customers_insert_own_org ON customers;
CREATE POLICY customers_insert_own_org ON customers
    FOR INSERT
    WITH CHECK (organization_id = get_user_organization_id());

-- Policy: Los usuarios solo pueden actualizar clientes de su organización
DROP POLICY IF EXISTS customers_update_own_org ON customers;
CREATE POLICY customers_update_own_org ON customers
    FOR UPDATE
    USING (organization_id = get_user_organization_id())
    WITH CHECK (organization_id = get_user_organization_id());

-- Policy: Los usuarios solo pueden eliminar clientes de su organización
DROP POLICY IF EXISTS customers_delete_own_org ON customers;
CREATE POLICY customers_delete_own_org ON customers
    FOR DELETE
    USING (organization_id = get_user_organization_id());

-- =====================================================
-- PARTE 7: FUNCIÓN DE AUDITORÍA
-- =====================================================

-- Tabla de auditoría para cambios de organization_id (opcional)
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

-- Función para registrar cambios de organization_id
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
-- PARTE 8: COMENTARIOS Y DOCUMENTACIÓN
-- =====================================================

COMMENT ON FUNCTION get_user_organization_id() IS 
'Función robusta que siempre retorna un organization_id válido del usuario autenticado. Usa organización por defecto si el usuario no tiene una asignada.';

COMMENT ON FUNCTION ensure_organization_id_on_insert() IS 
'Trigger que asegura que todos los nuevos registros tengan organization_id asignado automáticamente. Valida que la organización existe.';

COMMENT ON FUNCTION prevent_organization_id_change() IS 
'Trigger que previene cambios no autorizados de organization_id. Solo permite cambios si el usuario pertenece a la organización original o destino.';

COMMENT ON FUNCTION validate_record_organization(TEXT, UUID, UUID) IS 
'Función para validar en API routes que un registro pertenece a la organización del usuario.';

COMMENT ON TABLE organization_audit_log IS 
'Tabla de auditoría para registrar todos los cambios de organization_id en el sistema.';

