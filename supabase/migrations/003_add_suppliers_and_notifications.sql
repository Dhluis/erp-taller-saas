-- =====================================================
-- MIGRACIÓN 003: SUPPLIERS Y NOTIFICATIONS
-- =====================================================
-- Agregar tablas para proveedores y sistema de notificaciones
-- Compatible con multi-tenancy (organization_id)

-- 1. TABLA DE PROVEEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    category VARCHAR(100), -- 'Repuestos', 'Herramientas', 'Lubricantes', etc.
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE NOTIFICACIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error', 'stock_low', 'order_completed', 'quotation_created')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Datos adicionales (ej: order_id, product_id, etc.)
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- 3. TABLA DE CATEGORÍAS DE PROVEEDORES
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE ÓRDENES DE COMPRA (para proveedores)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
    total_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    expected_delivery_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA DE ITEMS DE ÓRDENES DE COMPRA
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    received_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Índices para purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id ON purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_number ON purchase_orders(order_number);

-- Índices para purchase_order_items
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_organization_id ON purchase_order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_purchase_order_id ON purchase_order_items(purchase_order_id);

-- =====================================================
-- TRIGGERS Y FUNCIONES
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para asignar organization_id automáticamente
CREATE OR REPLACE FUNCTION set_org_from_jwt()
RETURNS TRIGGER AS $$
BEGIN
    NEW.organization_id = (auth.jwt() ->> 'organization_id')::UUID;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para organization_id
CREATE TRIGGER set_suppliers_organization_id BEFORE INSERT ON suppliers
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_notifications_organization_id BEFORE INSERT ON notifications
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_supplier_categories_organization_id BEFORE INSERT ON supplier_categories
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_purchase_orders_organization_id BEFORE INSERT ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_purchase_order_items_organization_id BEFORE INSERT ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

-- Función para generar número de orden de compra
CREATE OR REPLACE FUNCTION generate_purchase_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
    order_num TEXT;
BEGIN
    -- Formato: COMP-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    -- Obtener el siguiente número de secuencia para este mes
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM purchase_orders 
    WHERE organization_id = NEW.organization_id
    AND order_number LIKE 'COMP-' || year_month || '-%';
    
    -- Generar número de orden
    order_num := 'COMP-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.order_number := order_num;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_purchase_order_number_trigger BEFORE INSERT ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION generate_purchase_order_number();

-- =====================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Políticas para suppliers
CREATE POLICY "Users can view suppliers from their organization" ON suppliers
    FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can insert suppliers for their organization" ON suppliers
    FOR INSERT WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can update suppliers from their organization" ON suppliers
    FOR UPDATE USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can delete suppliers from their organization" ON suppliers
    FOR DELETE USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para notifications
CREATE POLICY "Users can view notifications from their organization" ON notifications
    FOR SELECT USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can insert notifications for their organization" ON notifications
    FOR INSERT WITH CHECK (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

CREATE POLICY "Users can update notifications from their organization" ON notifications
    FOR UPDATE USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para supplier_categories
CREATE POLICY "Users can manage supplier categories from their organization" ON supplier_categories
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para purchase_orders
CREATE POLICY "Users can manage purchase orders from their organization" ON purchase_orders
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para purchase_order_items
CREATE POLICY "Users can manage purchase order items from their organization" ON purchase_order_items
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================

-- Categorías de proveedores de ejemplo
INSERT INTO supplier_categories (organization_id, name, description) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Repuestos', 'Proveedores de repuestos automotrices'),
('550e8400-e29b-41d4-a716-446655440000', 'Herramientas', 'Proveedores de herramientas profesionales'),
('550e8400-e29b-41d4-a716-446655440000', 'Lubricantes', 'Proveedores de aceites y lubricantes'),
('550e8400-e29b-41d4-a716-446655440000', 'Equipos', 'Proveedores de equipos y maquinaria');

-- Proveedores de ejemplo
INSERT INTO suppliers (organization_id, name, contact_name, email, phone, address, category, status) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Autopartes del Norte', 'Carlos Mendoza', 'ventas@autopartesnorte.com', '+52 81 1234 5678', 'Av. Universidad 123, Monterrey, NL', 'Repuestos', 'active'),
('550e8400-e29b-41d4-a716-446655440000', 'Herramientas Profesionales', 'Ana García', 'ana@herramientaspro.com', '+52 55 9876 5432', 'Calle Reforma 456, CDMX', 'Herramientas', 'active'),
('550e8400-e29b-41d4-a716-446655440000', 'Lubricantes Premium', 'Roberto Silva', 'roberto@lubricantes.com', '+52 33 5555 1234', 'Blvd. López Mateos 789, Guadalajara, Jal', 'Lubricantes', 'active'),
('550e8400-e29b-41d4-a716-446655440000', 'Equipos Industriales', 'María López', 'maria@equiposind.com', '+52 81 4444 9999', 'Zona Industrial, Monterrey, NL', 'Equipos', 'inactive');

-- Notificaciones de ejemplo
INSERT INTO notifications (organization_id, type, title, message, data) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'warning', 'Stock Bajo', 'El producto "Filtro de Aceite" tiene menos de 10 unidades en stock', '{"product_id": "prod-001", "current_stock": 8}'),
('550e8400-e29b-41d4-a716-446655440000', 'info', 'Nueva Cotización', 'Se ha creado una nueva cotización #COT-202501-0001', '{"quotation_id": "quot-001", "customer_name": "Juan Pérez"}'),
('550e8400-e29b-41d4-a716-446655440000', 'success', 'Orden Completada', 'La orden de trabajo #ORD-202501-0005 ha sido completada', '{"order_id": "ord-005", "customer_name": "María García"}'),
('550e8400-e29b-41d4-a716-446655440000', 'warning', 'Stock Bajo', 'El producto "Pastillas de Freno" tiene menos de 5 unidades en stock', '{"product_id": "prod-002", "current_stock": 3}'),
('550e8400-e29b-41d4-a716-446655440000', 'info', 'Nueva Orden', 'Se ha creado una nueva orden de trabajo #ORD-202501-0006', '{"order_id": "ord-006", "customer_name": "Carlos Ruiz"}');

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE suppliers IS 'Proveedores de repuestos, herramientas y servicios para el taller';
COMMENT ON TABLE notifications IS 'Sistema de notificaciones para alertas y recordatorios';
COMMENT ON TABLE supplier_categories IS 'Categorías de proveedores (Repuestos, Herramientas, etc.)';
COMMENT ON TABLE purchase_orders IS 'Órdenes de compra a proveedores';
COMMENT ON TABLE purchase_order_items IS 'Items específicos dentro de las órdenes de compra';

COMMENT ON COLUMN suppliers.category IS 'Categoría del proveedor: Repuestos, Herramientas, Lubricantes, Equipos';
COMMENT ON COLUMN suppliers.status IS 'Estado del proveedor: active, inactive';
COMMENT ON COLUMN notifications.type IS 'Tipo de notificación: info, warning, success, error, stock_low, order_completed, quotation_created';
COMMENT ON COLUMN notifications.data IS 'Datos adicionales en formato JSON para la notificación';
COMMENT ON COLUMN purchase_orders.order_number IS 'Número único de orden de compra formato: COMP-YYYYMM-0001';
COMMENT ON COLUMN purchase_orders.status IS 'Estado de la orden: pending, approved, ordered, received, cancelled';

