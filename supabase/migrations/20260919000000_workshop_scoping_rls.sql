-- =====================================================
-- MIGRACIÓN: Aislamiento por sucursal (workshop) para ASESOR/MECANICO
-- Fecha: 2026-09-19
-- Objetivo: ADMIN sigue viendo toda la organización. ASESOR/MECANICO solo
--           ven filas de su propia sucursal (workshop_id). Filas sin
--           sucursal asignada (workshop_id NULL) siguen siendo visibles
--           para todos — así no se rompen talleres de una sola sucursal
--           que nunca configuraron workshop_id (la inmensa mayoría de los
--           datos existentes hoy).
--
-- DISEÑO: usa políticas RESTRICTIVE, no reemplaza ninguna política
-- existente. Una política RESTRICTIVE se combina con AND sobre el grupo
-- de políticas PERMISSIVE ya existentes (las que aíslan por organization_id,
-- construidas en la auditoría de 5+ horas mencionada en CLAUDE.md) — por
-- eso esta migración no necesita conocer ni tocar los nombres de esas
-- políticas existentes, y no puede aflojarlas por accidente. Ver:
-- https://www.postgresql.org/docs/current/sql-createpolicy.html
--
-- IMPORTANTE: revisar y ejecutar manualmente (Supabase SQL Editor o
-- `npm run migrate`). No se aplicó automáticamente en esta sesión.
-- =====================================================

-- =====================================================
-- PARTE 1: FUNCIONES AUXILIARES (mismo patrón que get_user_organization_id)
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT role INTO v_role
    FROM users
    WHERE auth_user_id = v_user_id
    LIMIT 1;

    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_workshop_id()
RETURNS UUID AS $$
DECLARE
    v_workshop_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT workshop_id INTO v_workshop_id
    FROM users
    WHERE auth_user_id = v_user_id
    LIMIT 1;

    RETURN v_workshop_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PARTE 2: POLÍTICAS RESTRICTIVE — tablas núcleo del flujo de taller
-- =====================================================
-- Alcance de esta migración: customers, vehicles, work_orders, order_items,
-- quotations, quotation_items, invoices, invoice_items, payments, appointments.
-- Otras tablas con workshop_id (inventory, products, services, suppliers,
-- purchase_orders, employees, leads, campaigns, notifications,
-- vehicle_inspections, quotation_tracking, quotation_versions, price_history)
-- quedan fuera de este alcance inicial — mismo patrón, agregar si se desea.

DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'customers', 'vehicles', 'work_orders', 'order_items',
        'quotations', 'quotation_items', 'invoices', 'invoice_items',
        'payments', 'appointments'
    ];
    workshop_condition TEXT := '(
        get_user_role() = ''ADMIN''
        OR workshop_id IS NULL
        OR get_user_workshop_id() IS NULL
        OR workshop_id = get_user_workshop_id()
    )';
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_workshop_scope_select', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I AS RESTRICTIVE FOR SELECT USING %s',
            t || '_workshop_scope_select', t, workshop_condition
        );

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_workshop_scope_update', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I AS RESTRICTIVE FOR UPDATE USING %s',
            t || '_workshop_scope_update', t, workshop_condition
        );

        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_workshop_scope_delete', t);
        EXECUTE format(
            'CREATE POLICY %I ON %I AS RESTRICTIVE FOR DELETE USING %s',
            t || '_workshop_scope_delete', t, workshop_condition
        );
    END LOOP;
END $$;

-- =====================================================
-- PARTE 3: VERIFICACIÓN
-- =====================================================
-- Nota importante: estas políticas RESTRICTIVE solo protegen accesos que
-- pasan por RLS (ej. llamadas directas desde el navegador con la anon key).
-- Las API routes que usan el Service Role Client (getSupabaseServiceClient())
-- SIGUEN bypaseando RLS por diseño de Supabase — el filtrado para esas rutas
-- ya se agregó en la capa de aplicación (src/lib/auth/workshop-scope.ts).

SELECT
    'VERIFICACIÓN — políticas de aislamiento por sucursal' AS status,
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%_workshop_scope_%'
ORDER BY tablename, policyname;
