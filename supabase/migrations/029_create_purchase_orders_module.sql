-- ==========================================
-- MIGRACIÓN: Purchase Orders Module
-- Fecha: 2026-02-02
-- Objetivo: Crear módulo de Purchase Orders SIN tocar tablas de inventario existentes
-- ==========================================

-- ==========================================
-- 1. TABLA: SUPPLIERS (Proveedores)
-- ==========================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'México',
  tax_id VARCHAR(50), -- RFC en México
  payment_terms TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_suppliers_organization 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE
);

-- Índices para suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ==========================================
-- 2. TABLA: PURCHASE_ORDERS (Órdenes de Compra)
-- ==========================================

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'in_transit', 'partial', 'received', 'cancelled')),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  received_date DATE,
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  received_by UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_purchase_orders_organization 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_purchase_orders_supplier 
    FOREIGN KEY (supplier_id) 
    REFERENCES suppliers(id) ON DELETE RESTRICT,
  CONSTRAINT fk_purchase_orders_received_by 
    FOREIGN KEY (received_by) 
    REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_purchase_orders_created_by 
    FOREIGN KEY (created_by) 
    REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);

-- ==========================================
-- 3. TABLA: PURCHASE_ORDER_ITEMS (Items de Orden)
-- ==========================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  purchase_order_id UUID NOT NULL,
  product_id UUID NOT NULL, -- ✅ SOLO REFERENCIA a inventory, NO modifica estructura
  quantity_ordered INTEGER NOT NULL CHECK (quantity_ordered > 0),
  quantity_received INTEGER DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost DECIMAL(10,2) NOT NULL CHECK (unit_cost >= 0),
  subtotal DECIMAL(12,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_po_items_organization 
    FOREIGN KEY (organization_id) 
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_items_purchase_order 
    FOREIGN KEY (purchase_order_id) 
    REFERENCES purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_po_items_product 
    FOREIGN KEY (product_id) 
    REFERENCES inventory(id) ON DELETE RESTRICT, -- ✅ SOLO LEE, no modifica
  CONSTRAINT check_quantity_received_not_exceed_ordered 
    CHECK (quantity_received <= quantity_ordered)
);

-- Índices para purchase_order_items
CREATE INDEX IF NOT EXISTS idx_po_items_organization_id ON purchase_order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_po_items_purchase_order_id ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_product_id ON purchase_order_items(product_id);

-- ==========================================
-- 4. FUNCIÓN: Generar número de orden automático
-- ==========================================

CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
  new_number VARCHAR(50);
  year_part VARCHAR(4);
  sequence_num INTEGER;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Obtener el siguiente número de secuencia para este año
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM purchase_orders
  WHERE order_number LIKE 'OC-' || year_part || '-%';
  
  -- Formato: OC-YYYY-XXXX
  new_number := 'OC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;

-- ==========================================
-- 5. FUNCIÓN: Incrementar stock de producto (SEGURA - Atómica)
-- ==========================================

CREATE OR REPLACE FUNCTION increment_product_stock(
  p_product_id UUID,
  p_quantity INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- ✅ Actualizar stock de forma atómica
  UPDATE inventory
  SET 
    current_stock = current_stock + p_quantity,
    updated_at = NOW()
  WHERE id = p_product_id;
  
  -- Verificar que el producto existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto con id % no encontrado', p_product_id;
  END IF;
END;
$$;

-- ==========================================
-- 6. TRIGGER: Actualizar totales de orden automáticamente
-- ==========================================

CREATE OR REPLACE FUNCTION update_purchase_order_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  order_subtotal DECIMAL(12,2);
  order_tax DECIMAL(12,2);
  order_total DECIMAL(12,2);
BEGIN
  -- Calcular totales sumando todos los items
  SELECT 
    COALESCE(SUM(subtotal), 0),
    COALESCE(SUM(subtotal * 0.16), 0), -- IVA 16%
    COALESCE(SUM(subtotal * 1.16), 0)
  INTO order_subtotal, order_tax, order_total
  FROM purchase_order_items
  WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  -- Actualizar orden
  UPDATE purchase_orders
  SET 
    subtotal = order_subtotal,
    tax = order_tax,
    total = order_total,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_purchase_order_totals
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_order_totals();

-- ==========================================
-- 7. TRIGGER: Actualizar status de orden basado en recepciones
-- ==========================================

CREATE OR REPLACE FUNCTION update_purchase_order_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  order_id_val UUID;
  total_ordered INTEGER;
  total_received INTEGER;
  current_status VARCHAR(50);
BEGIN
  order_id_val := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  
  -- Obtener totales
  SELECT 
    SUM(quantity_ordered),
    SUM(quantity_received),
    status
  INTO total_ordered, total_received, current_status
  FROM purchase_order_items poi
  JOIN purchase_orders po ON po.id = poi.purchase_order_id
  WHERE poi.purchase_order_id = order_id_val
  GROUP BY po.status;
  
  -- Actualizar status según recepciones
  IF total_received >= total_ordered AND total_ordered > 0 THEN
    UPDATE purchase_orders
    SET status = 'received', received_date = CURRENT_DATE
    WHERE id = order_id_val AND status != 'received';
  ELSIF total_received > 0 AND total_received < total_ordered THEN
    UPDATE purchase_orders
    SET status = 'partial'
    WHERE id = order_id_val AND status NOT IN ('received', 'cancelled');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trigger_update_purchase_order_status
  AFTER UPDATE OF quantity_received ON purchase_order_items
  FOR EACH ROW
  WHEN (NEW.quantity_received IS DISTINCT FROM OLD.quantity_received)
  EXECUTE FUNCTION update_purchase_order_status();

-- ==========================================
-- 8. TRIGGER: Actualizar updated_at automáticamente
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_purchase_order_items_updated_at
  BEFORE UPDATE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Suppliers RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select" ON suppliers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "suppliers_insert" ON suppliers
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "suppliers_update" ON suppliers
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "suppliers_delete" ON suppliers
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Purchase Orders RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_orders_select" ON purchase_orders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "purchase_orders_insert" ON purchase_orders
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "purchase_orders_update" ON purchase_orders
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "purchase_orders_delete" ON purchase_orders
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Purchase Order Items RLS
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchase_order_items_select" ON purchase_order_items
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "purchase_order_items_insert" ON purchase_order_items
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "purchase_order_items_update" ON purchase_order_items
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "purchase_order_items_delete" ON purchase_order_items
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- ==========================================
-- 10. COMENTARIOS Y DOCUMENTACIÓN
-- ==========================================

COMMENT ON TABLE suppliers IS 'Proveedores del taller - Tabla independiente del módulo de Purchase Orders';
COMMENT ON TABLE purchase_orders IS 'Órdenes de compra a proveedores - NO modifica tablas de inventario directamente';
COMMENT ON TABLE purchase_order_items IS 'Items de órdenes de compra - Solo referencia productos existentes en inventory';

COMMENT ON FUNCTION increment_product_stock IS 'Función segura para incrementar stock de productos - Usa actualización atómica';
COMMENT ON FUNCTION generate_purchase_order_number IS 'Genera número de orden automático con formato OC-YYYY-XXXX';

-- ==========================================
-- FIN DE MIGRACIÓN
-- ==========================================
