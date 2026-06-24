-- Agregar customer_id a cash_advances para asociar anticipos con clientes
ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Índice para búsquedas por cliente
CREATE INDEX IF NOT EXISTS idx_cash_advances_customer_id
  ON cash_advances(customer_id) WHERE customer_id IS NOT NULL;
