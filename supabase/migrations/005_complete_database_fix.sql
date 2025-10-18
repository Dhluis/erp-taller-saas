-- =====================================================
-- MIGRACIÓN 005: ARREGLO COMPLETO DE BASE DE DATOS
-- =====================================================
-- Solución definitiva para todas las tablas faltantes y problemas de esquema
-- Compatible con multi-tenancy (organization_id)
-- Ejecutar este script en el SQL Editor de Supabase

-- =====================================================
-- 1. CREAR TABLAS FALTANTES
-- =====================================================

-- 1.1 TABLA SUPPLIERS (PROVEEDORES)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 TABLA PAYMENTS (PAGOS A PROVEEDORES)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'transfer' CHECK (payment_method IN ('cash', 'transfer', 'check', 'card')),
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 TABLA COLLECTIONS (COBROS DE CLIENTES)
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    client_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    collection_date DATE NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'transfer' CHECK (payment_method IN ('cash', 'transfer', 'card', 'check')),
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 TABLA PURCHASE_ORDERS (ÓRDENES DE COMPRA)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 TABLA PURCHASE_ORDER_ITEMS (ITEMS DE ÓRDENES DE COMPRA)
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_code TEXT,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 TABLA CAMPAIGNS (CAMPAÑAS)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'phone', 'social', 'event')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    leads_generated INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    budget DECIMAL(10,2) DEFAULT 0,
    spent DECIMAL(10,2) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.7 TABLA APPOINTMENTS (CITAS)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    vehicle_info TEXT,
    appointment_date TIMESTAMPTZ NOT NULL,
    service_type TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    estimated_duration INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.8 TABLA LEADS (LEADS COMERCIALES)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    company TEXT,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    source TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    last_contact DATE,
    assigned_to TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.9 TABLA INVOICES (FACTURAS)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_rfc TEXT,
    vehicle_info TEXT,
    service_description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    due_date DATE,
    paid_date DATE,
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.10 TABLA INVOICE_ITEMS (ITEMS DE FACTURAS)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ARREGLAR TABLA INVENTORY_MOVEMENTS
-- =====================================================

-- 2.1 Agregar columnas faltantes
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS movement_type TEXT;

ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS reference_type TEXT;

ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS reference_id TEXT;

ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- 2.2 Migrar datos existentes si hay columna 'type'
UPDATE public.inventory_movements 
SET movement_type = CASE 
    WHEN type = 'entrada' THEN 'in'
    WHEN type = 'salida' THEN 'out'
    WHEN type = 'ajuste' THEN 'adjustment'
    ELSE 'in'
END
WHERE movement_type IS NULL AND type IS NOT NULL;

-- 2.3 Establecer valores por defecto
UPDATE public.inventory_movements 
SET movement_type = 'in'
WHERE movement_type IS NULL;

UPDATE public.inventory_movements 
SET reference_type = 'adjustment'
WHERE reference_type IS NULL;

-- 2.4 Hacer NOT NULL
ALTER TABLE public.inventory_movements 
ALTER COLUMN movement_type SET NOT NULL;

ALTER TABLE public.inventory_movements 
ALTER COLUMN reference_type SET NOT NULL;

-- =====================================================
-- 3. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON public.payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- Índices para collections
CREATE INDEX IF NOT EXISTS idx_collections_organization_id ON public.collections(organization_id);
CREATE INDEX IF NOT EXISTS idx_collections_client_id ON public.collections(client_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_date ON public.collections(collection_date);

-- Índices para purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id ON public.purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(order_date);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments(customer_name);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

-- Índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- =====================================================
-- 4. HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CREAR POLÍTICAS RLS
-- =====================================================

-- Políticas para suppliers
CREATE POLICY IF NOT EXISTS "Enable all for suppliers" ON public.suppliers FOR ALL USING (true);

-- Políticas para payments
CREATE POLICY IF NOT EXISTS "Enable all for payments" ON public.payments FOR ALL USING (true);

-- Políticas para collections
CREATE POLICY IF NOT EXISTS "Enable all for collections" ON public.collections FOR ALL USING (true);

-- Políticas para purchase_orders
CREATE POLICY IF NOT EXISTS "Enable all for purchase_orders" ON public.purchase_orders FOR ALL USING (true);

-- Políticas para purchase_order_items
CREATE POLICY IF NOT EXISTS "Enable all for purchase_order_items" ON public.purchase_order_items FOR ALL USING (true);

-- Políticas para campaigns
CREATE POLICY IF NOT EXISTS "Enable all for campaigns" ON public.campaigns FOR ALL USING (true);

-- Políticas para appointments
CREATE POLICY IF NOT EXISTS "Enable all for appointments" ON public.appointments FOR ALL USING (true);

-- Políticas para leads
CREATE POLICY IF NOT EXISTS "Enable all for leads" ON public.leads FOR ALL USING (true);

-- Políticas para invoices
CREATE POLICY IF NOT EXISTS "Enable all for invoices" ON public.invoices FOR ALL USING (true);

-- Políticas para invoice_items
CREATE POLICY IF NOT EXISTS "Enable all for invoice_items" ON public.invoice_items FOR ALL USING (true);

-- =====================================================
-- 6. INSERTAR DATOS DE EJEMPLO
-- =====================================================

-- Insertar suppliers de ejemplo
INSERT INTO public.suppliers (id, organization_id, name, contact_person, email, phone, address, status) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Proveedor ABC', 'Juan Pérez', 'juan@abc.com', '555-0001', 'Calle Principal 123', 'active'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Distribuidora XYZ', 'María García', 'maria@xyz.com', '555-0002', 'Avenida Central 456', 'active'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Repuestos Automotrices', 'Carlos López', 'carlos@repuestos.com', '555-0003', 'Zona Industrial 789', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insertar purchase_orders de ejemplo
INSERT INTO public.purchase_orders (organization_id, supplier_id, order_number, order_date, expected_delivery_date, status, subtotal, tax_amount, total, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'PO-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', 1000.00, 160.00, 1160.00, 'Orden de prueba 1'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'PO-002', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'confirmed', 2500.00, 400.00, 2900.00, 'Orden de prueba 2'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'PO-003', CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 'shipped', 1800.00, 288.00, 2088.00, 'Orden de prueba 3')
ON CONFLICT (order_number) DO NOTHING;

-- Insertar payments de ejemplo
INSERT INTO public.payments (organization_id, supplier_id, invoice_number, amount, payment_date, payment_method, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'INV-001', 1160.00, CURRENT_DATE, 'transfer', 'completed', 'Pago completado'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'INV-002', 2900.00, CURRENT_DATE, 'check', 'pending', 'Pago pendiente'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'INV-003', 2088.00, CURRENT_DATE, 'transfer', 'completed', 'Pago completado')
ON CONFLICT DO NOTHING;

-- Insertar collections de ejemplo
INSERT INTO public.collections (organization_id, client_id, invoice_id, amount, collection_date, payment_method, reference, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'C001', 'F001', 2500.00, CURRENT_DATE, 'transfer', 'REF-001', 'completed', 'Cobro completado'),
    ('00000000-0000-0000-0000-000000000000', 'C002', 'F002', 1800.00, CURRENT_DATE, 'cash', 'REF-002', 'pending', 'Cobro pendiente'),
    ('00000000-0000-0000-0000-000000000000', 'C003', 'F003', 3200.00, CURRENT_DATE, 'card', 'REF-003', 'completed', 'Cobro completado')
ON CONFLICT DO NOTHING;

-- Insertar appointments de ejemplo
INSERT INTO public.appointments (organization_id, customer_name, customer_phone, customer_email, vehicle_info, appointment_date, service_type, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Ana García', '555-0101', 'ana@email.com', 'Toyota Corolla 2020', CURRENT_DATE + INTERVAL '1 day', 'Mantenimiento', 'scheduled', 'Cita programada'),
    ('00000000-0000-0000-0000-000000000000', 'Luis Martínez', '555-0102', 'luis@email.com', 'Honda Civic 2019', CURRENT_DATE + INTERVAL '2 days', 'Reparación', 'confirmed', 'Cita confirmada'),
    ('00000000-0000-0000-0000-000000000000', 'María López', '555-0103', 'maria@email.com', 'Nissan Sentra 2021', CURRENT_DATE + INTERVAL '3 days', 'Diagnóstico', 'scheduled', 'Cita programada')
ON CONFLICT DO NOTHING;

-- Insertar leads de ejemplo
INSERT INTO public.leads (organization_id, name, company, phone, email, source, status, value, notes, assigned_to) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Roberto Silva', 'Transportes Silva', '555-0201', 'roberto@transportes.com', 'Web', 'new', 15000, 'Interesado en mantenimiento', 'Juan Pérez'),
    ('00000000-0000-0000-0000-000000000000', 'Carmen Ruiz', 'Fletera Ruiz', '555-0202', 'carmen@fletera.com', 'Referido', 'contacted', 25000, 'Cliente potencial', 'María García'),
    ('00000000-0000-0000-0000-000000000000', 'Pedro González', 'Logística González', '555-0203', 'pedro@logistica.com', 'Evento', 'qualified', 35000, 'Cliente calificado', 'Carlos López')
ON CONFLICT DO NOTHING;

-- Insertar invoices de ejemplo
INSERT INTO public.invoices (organization_id, invoice_number, customer_name, customer_rfc, vehicle_info, service_description, status, subtotal, tax_amount, total, due_date, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'INV-001', 'Cliente Ejemplo 1', 'RFC001', 'Toyota Corolla 2020', 'Mantenimiento completo', 'paid', 2500.00, 400.00, 2900.00, CURRENT_DATE, 'Factura pagada'),
    ('00000000-0000-0000-0000-000000000000', 'INV-002', 'Cliente Ejemplo 2', 'RFC002', 'Honda Civic 2019', 'Reparación de frenos', 'sent', 1800.00, 288.00, 2088.00, CURRENT_DATE + INTERVAL '30 days', 'Factura enviada'),
    ('00000000-0000-0000-0000-000000000000', 'INV-003', 'Cliente Ejemplo 3', 'RFC003', 'Nissan Sentra 2021', 'Cambio de aceite', 'draft', 500.00, 80.00, 580.00, CURRENT_DATE + INTERVAL '15 days', 'Borrador')
ON CONFLICT (invoice_number) DO NOTHING;

-- Insertar inventory_movements de ejemplo
INSERT INTO public.inventory_movements (organization_id, product_id, movement_type, quantity, reference_type, reference_id, notes, user_id) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'in', 10, 'purchase', 'PO-001', 'Compra inicial', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'in', 5, 'purchase', 'PO-002', 'Reposición', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'out', 2, 'sale', 'SO-001', 'Venta', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000013', 'in', 8, 'purchase', 'PO-003', 'Compra nueva', NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- 7. CREAR FUNCIONES UTILITARIAS
-- =====================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para actualizar updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_order_items_updated_at BEFORE UPDATE ON public.purchase_order_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. MENSAJE DE CONFIRMACIÓN
-- =====================================================

SELECT 'BASE DE DATOS COMPLETAMENTE ARREGLADA - TODAS LAS TABLAS CREADAS' as resultado;

-- Verificar que todas las tablas existen
SELECT 
    table_name,
    'CREADA' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'suppliers', 'payments', 'collections', 'purchase_orders', 
    'purchase_order_items', 'campaigns', 'appointments', 'leads', 
    'invoices', 'invoice_items', 'inventory_movements'
)
ORDER BY table_name;







