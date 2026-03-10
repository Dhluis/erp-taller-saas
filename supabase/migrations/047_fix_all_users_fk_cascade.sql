-- ============================================================================
-- MIGRACIÓN: Fix FK ON DELETE para todas las tablas que referencian public.users
-- Usa DO blocks para encontrar y dropear constraints dinámicamente,
-- independiente del nombre auto-generado por Postgres.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Dropear TODOS los FK constraints que apuntan a public.users(id)
  -- sin importar su nombre exacto
  FOR r IN
    SELECT
      tc.table_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.key_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
      AND ccu.table_name = 'users'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I',
      r.table_name,
      r.constraint_name
    );
    RAISE NOTICE 'Dropped FK: %.%', r.table_name, r.constraint_name;
  END LOOP;
END $$;

-- Ahora re-crear todos los FK con ON DELETE SET NULL
-- (solo columnas verificadas que existen en la BD real)

-- products
ALTER TABLE public.products
  ADD CONSTRAINT products_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.products
  ADD CONSTRAINT products_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- inventory_movements
ALTER TABLE public.inventory_movements
  ADD CONSTRAINT inventory_movements_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- purchase_orders
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT purchase_orders_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- invoices
ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- quotations
ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.quotations
  ADD CONSTRAINT quotations_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- organization_audit_log
ALTER TABLE public.organization_audit_log
  ADD CONSTRAINT organization_audit_log_changed_by_fkey
  FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- work_order_history
ALTER TABLE public.work_order_history
  ADD CONSTRAINT work_order_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- work_orders (ya fixeado en 046 pero re-aplicamos por si acaso)
ALTER TABLE public.work_orders
  ADD CONSTRAINT work_orders_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.users(id) ON DELETE SET NULL;
