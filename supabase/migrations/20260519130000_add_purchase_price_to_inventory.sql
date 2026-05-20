-- Agregar precio de compra a inventario
-- unit_price = precio que se cobra al cliente
-- purchase_price = lo que cuesta comprar la pieza al proveedor
ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) DEFAULT NULL;

-- Índice útil para reportes de margen
CREATE INDEX IF NOT EXISTS idx_inventory_prices
  ON inventory(organization_id, unit_price, purchase_price)
  WHERE purchase_price IS NOT NULL;
