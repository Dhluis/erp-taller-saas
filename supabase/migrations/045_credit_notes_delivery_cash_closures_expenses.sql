-- Migración 045: Ajustes/devoluciones, entregas, arqueo de caja y gastos
-- Eagles ERP - Módulos conectados a facturación, cuentas de efectivo y compras

-- =====================================================
-- 1. NOTAS DE CRÉDITO (Ajustes y devoluciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    sales_invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    credit_note_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'applied', 'cancelled')),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    notes TEXT,
    issued_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, credit_note_number)
);

COMMENT ON TABLE public.credit_notes IS 'Notas de crédito / ajustes vinculados a facturas de venta';

CREATE INDEX IF NOT EXISTS idx_credit_notes_organization_id ON public.credit_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_sales_invoice_id ON public.credit_notes(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON public.credit_notes(status);
CREATE INDEX IF NOT EXISTS idx_credit_notes_created_at ON public.credit_notes(created_at DESC);

CREATE TABLE IF NOT EXISTS public.credit_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_id UUID NOT NULL REFERENCES public.credit_notes(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'part')),
    item_name TEXT NOT NULL,
    description TEXT,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON public.credit_note_items(credit_note_id);

-- =====================================================
-- 2. ENTREGAS (Remisiones / comprobantes de entrega)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.delivery_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    sales_invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    delivery_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
    delivered_at TIMESTAMPTZ,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, delivery_number)
);

COMMENT ON TABLE public.delivery_notes IS 'Comprobantes de entrega / remisiones vinculados a OT o factura';

CREATE INDEX IF NOT EXISTS idx_delivery_notes_organization_id ON public.delivery_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_work_order_id ON public.delivery_notes(work_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_sales_invoice_id ON public.delivery_notes(sales_invoice_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_customer_id ON public.delivery_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_delivery_notes_created_at ON public.delivery_notes(created_at DESC);

CREATE TABLE IF NOT EXISTS public.delivery_note_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_note_id UUID NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    unit TEXT DEFAULT 'un',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_note_items_delivery_note_id ON public.delivery_note_items(delivery_note_id);

-- =====================================================
-- 3. ARQUEO DE CAJA (Cierres por cuenta de efectivo)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cash_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_account_id UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    closed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    closing_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    counted_amount DECIMAL(12,2) NOT NULL,
    difference DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cash_closures IS 'Arqueos de caja / cierres de turno por cuenta de efectivo';

CREATE INDEX IF NOT EXISTS idx_cash_closures_cash_account_id ON public.cash_closures(cash_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_organization_id ON public.cash_closures(organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_closures_closed_at ON public.cash_closures(closed_at DESC);

-- =====================================================
-- 4. GASTOS (Egresos operativos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    category TEXT NOT NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    reference_type TEXT,
    reference_id UUID,
    cash_account_id UUID REFERENCES public.cash_accounts(id) ON DELETE SET NULL,
    payment_method TEXT DEFAULT 'cash',
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.expenses IS 'Gastos y egresos operativos (no OC)';

CREATE INDEX IF NOT EXISTS idx_expenses_organization_id ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_cash_account_id ON public.expenses(cash_account_id);

-- =====================================================
-- 5. RLS
-- =====================================================
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'credit_notes' AND policyname = 'credit_notes_org') THEN
    CREATE POLICY "credit_notes_org" ON public.credit_notes FOR ALL
    USING (organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'credit_note_items' AND policyname = 'credit_note_items_via_note') THEN
    CREATE POLICY "credit_note_items_via_note" ON public.credit_note_items FOR ALL
    USING (EXISTS (SELECT 1 FROM public.credit_notes cn WHERE cn.id = credit_note_id AND cn.organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.credit_notes cn WHERE cn.id = credit_note_id AND cn.organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'delivery_notes' AND policyname = 'delivery_notes_org') THEN
    CREATE POLICY "delivery_notes_org" ON public.delivery_notes FOR ALL
    USING (organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'delivery_note_items' AND policyname = 'delivery_note_items_via_note') THEN
    CREATE POLICY "delivery_note_items_via_note" ON public.delivery_note_items FOR ALL
    USING (EXISTS (SELECT 1 FROM public.delivery_notes dn WHERE dn.id = delivery_note_id AND dn.organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid())))
    WITH CHECK (EXISTS (SELECT 1 FROM public.delivery_notes dn WHERE dn.id = delivery_note_id AND dn.organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid())));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cash_closures' AND policyname = 'cash_closures_org') THEN
    CREATE POLICY "cash_closures_org" ON public.cash_closures FOR ALL
    USING (organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'expenses' AND policyname = 'expenses_org') THEN
    CREATE POLICY "expenses_org" ON public.expenses FOR ALL
    USING (organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()))
    WITH CHECK (organization_id IN (SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()));
  END IF;
END $$;

-- Trigger updated_at (usa función existente si existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS trigger_credit_notes_updated_at ON public.credit_notes;
    CREATE TRIGGER trigger_credit_notes_updated_at BEFORE UPDATE ON public.credit_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    DROP TRIGGER IF EXISTS trigger_delivery_notes_updated_at ON public.delivery_notes;
    CREATE TRIGGER trigger_delivery_notes_updated_at BEFORE UPDATE ON public.delivery_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON public.expenses;
    CREATE TRIGGER trigger_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
