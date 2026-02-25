-- Migración 044: Cuentas de efectivo (cash accounts) y movimientos
-- Módulo "Cuentas de efectivo" - Eagles ERP
-- Ejecutar en Supabase SQL Editor o vía CLI

-- =====================================================
-- 1. Tabla cash_accounts (cuentas de efectivo / cajas)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_number TEXT NOT NULL DEFAULT '001',
    account_type TEXT NOT NULL DEFAULT 'cash' CHECK (account_type IN ('cash', 'bank')),
    initial_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cash_accounts IS 'Cuentas de efectivo y cuentas bancarias por organización';
COMMENT ON COLUMN public.cash_accounts.account_type IS 'cash = Caja/efectivo, bank = Cuenta bancaria';

CREATE INDEX IF NOT EXISTS idx_cash_accounts_organization_id ON public.cash_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_accounts_is_active ON public.cash_accounts(is_active);

-- =====================================================
-- 2. Tabla cash_account_movements (movimientos: ingreso/retiro)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.cash_account_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_account_id UUID NOT NULL REFERENCES public.cash_accounts(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('deposit', 'withdrawal', 'adjustment')),
    amount DECIMAL(12,2) NOT NULL,
    notes TEXT,
    reference_type TEXT,
    reference_id UUID,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.cash_account_movements IS 'Movimientos de ingreso/retiro en cuentas de efectivo';
COMMENT ON COLUMN public.cash_account_movements.amount IS 'Siempre positivo; deposit suma, withdrawal resta';
COMMENT ON COLUMN public.cash_account_movements.reference_type IS 'Opcional: collection, payment, work_order, etc.';
COMMENT ON COLUMN public.cash_account_movements.reference_id IS 'ID del documento origen si aplica';

CREATE INDEX IF NOT EXISTS idx_cash_account_movements_cash_account_id ON public.cash_account_movements(cash_account_id);
CREATE INDEX IF NOT EXISTS idx_cash_account_movements_organization_id ON public.cash_account_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_cash_account_movements_created_at ON public.cash_account_movements(created_at DESC);

-- =====================================================
-- 3. RLS
-- =====================================================
ALTER TABLE public.cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_account_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_accounts_org" ON public.cash_accounts;
CREATE POLICY "cash_accounts_org" ON public.cash_accounts
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "cash_account_movements_org" ON public.cash_account_movements;
CREATE POLICY "cash_account_movements_org" ON public.cash_account_movements
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.users WHERE auth_user_id = auth.uid()
        )
    );

-- =====================================================
-- 4. Trigger updated_at para cash_accounts (usa función existente)
-- =====================================================
DROP TRIGGER IF EXISTS trigger_cash_accounts_updated_at ON public.cash_accounts;
CREATE TRIGGER trigger_cash_accounts_updated_at
    BEFORE UPDATE ON public.cash_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
