-- =====================================================
-- MIGRACIÓN: Reemplazar políticas "Enable all" por aislamiento de organización real
-- Fecha: 2026-09-19
-- Objetivo: invoice_items y notifications tenían una política PERMISSIVE
-- "Enable all" con qual = true — sin NINGÚN filtro, ni siquiera de
-- organization_id. Cualquier usuario autenticado de cualquier organización
-- podía leer/escribir cualquier fila de esas dos tablas vía RLS. Las demás
-- políticas de esas tablas solo filtran por workshop_id (no por
-- organization_id), y hoy 0 filas tienen workshop_id asignado en ninguna
-- de las dos tablas — así que sin esta migración, quitar "Enable all" a
-- secas hubiera dejado ambas tablas inaccesibles para todos vía RLS.
--
-- Se reemplaza por el patrón ya usado en invoices/payments/quotations:
-- organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())
-- Las políticas RESTRICTIVE de sucursal ya aplicadas (20260919000000) siguen
-- narrowing por encima de esto para invoice_items sin tocarlas.
-- =====================================================

-- invoice_items
DROP POLICY IF EXISTS "Enable all for invoice_items" ON invoice_items;

DROP POLICY IF EXISTS invoice_items_select_own_org ON invoice_items;
CREATE POLICY invoice_items_select_own_org ON invoice_items
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS invoice_items_insert_own_org ON invoice_items;
CREATE POLICY invoice_items_insert_own_org ON invoice_items
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS invoice_items_update_own_org ON invoice_items;
CREATE POLICY invoice_items_update_own_org ON invoice_items
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS invoice_items_delete_own_org ON invoice_items;
CREATE POLICY invoice_items_delete_own_org ON invoice_items
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));

-- notifications
DROP POLICY IF EXISTS "Enable all for notifications" ON notifications;

DROP POLICY IF EXISTS notifications_select_own_org ON notifications;
CREATE POLICY notifications_select_own_org ON notifications
    FOR SELECT
    USING (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS notifications_insert_own_org ON notifications;
CREATE POLICY notifications_insert_own_org ON notifications
    FOR INSERT
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS notifications_update_own_org ON notifications;
CREATE POLICY notifications_update_own_org ON notifications
    FOR UPDATE
    USING (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()))
    WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS notifications_delete_own_org ON notifications;
CREATE POLICY notifications_delete_own_org ON notifications
    FOR DELETE
    USING (organization_id = (SELECT organization_id FROM users WHERE auth_user_id = auth.uid()));

-- Verificación
SELECT
    'VERIFICACIÓN — invoice_items y notifications post-fix' AS status,
    tablename,
    policyname,
    permissive,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('invoice_items', 'notifications')
ORDER BY tablename, cmd;
