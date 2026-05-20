-- =====================================================
-- MIGRACIÓN 053: Control Anti-Fraude y Anticipos
-- =====================================================

-- 1. Agregar campos de aprobación a purchase_orders
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_note TEXT,
  ADD COLUMN IF NOT EXISTS estimated_amount DECIMAL(10,2);

-- 2. Tabla de anticipos de efectivo
CREATE TABLE IF NOT EXISTS cash_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
  notes TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- RLS para cash_advances
ALTER TABLE cash_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_advances_org_isolation" ON cash_advances
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- 3. Agregar campos a expenses para ligar anticipos y comprobantes
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS advance_id UUID REFERENCES cash_advances(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- Índice para buscar gastos por anticipo
CREATE INDEX IF NOT EXISTS idx_expenses_advance_id ON expenses(advance_id) WHERE advance_id IS NOT NULL;

-- Índice para POs pendientes de aprobación
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(organization_id, status);
