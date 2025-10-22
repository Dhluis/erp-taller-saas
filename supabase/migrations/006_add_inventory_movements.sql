-- Migración 006: Tabla de movimientos de inventario
-- Fecha: 2025-01-27
-- Descripción: Crear sistema completo de tracking de movimientos de inventario

-- Tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entry', 'exit', 'adjustment', 'transfer')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  reference_type TEXT CHECK (reference_type IN ('purchase_order', 'work_order', 'adjustment', 'transfer', 'initial')),
  reference_id UUID,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_inventory_movements_organization ON inventory_movements(organization_id);
CREATE INDEX idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX idx_inventory_movements_created ON inventory_movements(created_at);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements(reference_type, reference_id);

-- RLS policies
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movements in their organization"
  ON inventory_movements FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM system_users WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Users can insert movements in their organization"
  ON inventory_movements FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM system_users WHERE email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Users can update movements in their organization"
  ON inventory_movements FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM system_users WHERE email = auth.jwt() ->> 'email'
  ));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_inventory_movements_updated_at
  BEFORE UPDATE ON inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para crear movimiento de inventario
CREATE OR REPLACE FUNCTION create_inventory_movement(
  p_product_id UUID,
  p_movement_type TEXT,
  p_quantity INTEGER,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_unit_cost DECIMAL DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_organization_id UUID;
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_movement_id UUID;
  v_total_cost DECIMAL;
BEGIN
  -- Obtener organization_id del usuario actual
  SELECT organization_id INTO v_organization_id
  FROM system_users 
  WHERE email = auth.jwt() ->> 'email';
  
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado o sin organización asignada';
  END IF;
  
  -- Obtener stock actual del producto
  SELECT COALESCE(stock, 0) INTO v_current_stock
  FROM products 
  WHERE id = p_product_id AND organization_id = v_organization_id;
  
  IF v_current_stock IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  
  -- Calcular nuevo stock
  IF p_movement_type = 'entry' OR p_movement_type = 'adjustment' THEN
    v_new_stock := v_current_stock + p_quantity;
  ELSIF p_movement_type = 'exit' THEN
    v_new_stock := v_current_stock - p_quantity;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente. Stock actual: %, Cantidad solicitada: %', v_current_stock, p_quantity;
    END IF;
  ELSIF p_movement_type = 'transfer' THEN
    v_new_stock := v_current_stock - p_quantity;
    IF v_new_stock < 0 THEN
      RAISE EXCEPTION 'Stock insuficiente para transferencia. Stock actual: %, Cantidad solicitada: %', v_current_stock, p_quantity;
    END IF;
  END IF;
  
  -- Calcular costo total
  v_total_cost := NULL;
  IF p_unit_cost IS NOT NULL THEN
    v_total_cost := p_unit_cost * p_quantity;
  END IF;
  
  -- Insertar movimiento
  INSERT INTO inventory_movements (
    organization_id,
    product_id,
    movement_type,
    quantity,
    previous_stock,
    new_stock,
    reference_type,
    reference_id,
    unit_cost,
    total_cost,
    notes,
    created_by
  ) VALUES (
    v_organization_id,
    p_product_id,
    p_movement_type,
    p_quantity,
    v_current_stock,
    v_new_stock,
    p_reference_type,
    p_reference_id,
    p_unit_cost,
    v_total_cost,
    p_notes,
    auth.uid()
  ) RETURNING id INTO v_movement_id;
  
  -- Actualizar stock del producto
  UPDATE products 
  SET stock = v_new_stock, updated_at = now()
  WHERE id = p_product_id;
  
  RETURN v_movement_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener historial de movimientos de un producto
CREATE OR REPLACE FUNCTION get_product_movement_history(p_product_id UUID)
RETURNS TABLE (
  id UUID,
  movement_type TEXT,
  quantity INTEGER,
  previous_stock INTEGER,
  new_stock INTEGER,
  reference_type TEXT,
  reference_id UUID,
  unit_cost DECIMAL,
  total_cost DECIMAL,
  notes TEXT,
  created_at TIMESTAMPTZ,
  created_by_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    im.id,
    im.movement_type,
    im.quantity,
    im.previous_stock,
    im.new_stock,
    im.reference_type,
    im.reference_id,
    im.unit_cost,
    im.total_cost,
    im.notes,
    im.created_at,
    au.email as created_by_email
  FROM inventory_movements im
  LEFT JOIN auth.users au ON im.created_by = au.id
  WHERE im.product_id = p_product_id
  AND im.organization_id IN (
    SELECT organization_id FROM system_users WHERE email = auth.jwt() ->> 'email'
  )
  ORDER BY im.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de movimientos
CREATE OR REPLACE FUNCTION get_inventory_movement_stats()
RETURNS TABLE (
  total_movements BIGINT,
  entries_count BIGINT,
  exits_count BIGINT,
  adjustments_count BIGINT,
  transfers_count BIGINT,
  total_value_in DECIMAL,
  total_value_out DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_movements,
    COUNT(*) FILTER (WHERE movement_type = 'entry') as entries_count,
    COUNT(*) FILTER (WHERE movement_type = 'exit') as exits_count,
    COUNT(*) FILTER (WHERE movement_type = 'adjustment') as adjustments_count,
    COUNT(*) FILTER (WHERE movement_type = 'transfer') as transfers_count,
    COALESCE(SUM(total_cost) FILTER (WHERE movement_type IN ('entry', 'adjustment')), 0) as total_value_in,
    COALESCE(SUM(total_cost) FILTER (WHERE movement_type IN ('exit', 'transfer')), 0) as total_value_out
  FROM inventory_movements
  WHERE organization_id IN (
    SELECT organization_id FROM system_users WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios para documentación
COMMENT ON TABLE inventory_movements IS 'Registro de todos los movimientos de inventario (entradas, salidas, ajustes, transferencias)';
COMMENT ON COLUMN inventory_movements.movement_type IS 'Tipo de movimiento: entry, exit, adjustment, transfer';
COMMENT ON COLUMN inventory_movements.reference_type IS 'Tipo de referencia: purchase_order, work_order, adjustment, transfer, initial';
COMMENT ON COLUMN inventory_movements.quantity IS 'Cantidad del movimiento (positiva para entradas, negativa para salidas)';
COMMENT ON COLUMN inventory_movements.previous_stock IS 'Stock anterior antes del movimiento';
COMMENT ON COLUMN inventory_movements.new_stock IS 'Stock después del movimiento';












