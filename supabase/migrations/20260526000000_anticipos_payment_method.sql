-- Migración 055: Método de pago y cuenta en anticipos
-- Permite registrar anticipos por Efectivo, Transferencia o Tarjeta
-- y ligarlos a la cuenta de cash_accounts correspondiente

ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS cash_account_id UUID
    REFERENCES cash_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'transfer', 'card'));

COMMENT ON COLUMN cash_advances.cash_account_id IS
  'Cuenta de la que se descontó el anticipo (caja, banco, tarjeta)';

COMMENT ON COLUMN cash_advances.payment_method IS
  'Método de entrega: cash = efectivo, transfer = transferencia, card = tarjeta';
