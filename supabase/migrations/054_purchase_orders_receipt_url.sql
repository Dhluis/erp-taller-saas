-- Migración 054: Campo para factura/recibo escaneado en órdenes de compra
-- Permite guardar la URL del documento de verificación al recibir mercancía

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS receipt_document_url TEXT DEFAULT NULL;

COMMENT ON COLUMN purchase_orders.receipt_document_url IS
  'URL del recibo/factura del proveedor escaneado al recibir la mercancía. Usado por sistema antifraude para verificar montos.';
