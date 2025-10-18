-- SOLUCIÓN COMPLETA FINAL - CREAR TODAS LAS TABLAS FALTANTES
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. CREAR TABLA SUPPLIERS (PROVEEDORES)
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CREAR TABLA PAYMENTS (PAGOS A PROVEEDORES)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    supplier_id UUID NOT NULL,
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

-- 3. CREAR TABLA COLLECTIONS (COBROS DE CLIENTES)
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

-- 4. CREAR TABLA PURCHASE_ORDERS (ÓRDENES DE COMPRA)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    supplier_id UUID NOT NULL,
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

-- 5. CREAR TABLA CAMPAIGNS (CAMPAÑAS)
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

-- 6. CREAR TABLA APPOINTMENTS (CITAS)
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CREAR TABLA WORK_ORDERS (ÓRDENES DE TRABAJO)
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    order_number TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    vehicle_info TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CREAR TABLA CUSTOMERS (CLIENTES)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    rfc TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. CREAR TABLA VEHICLES (VEHÍCULOS)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    customer_id UUID NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    license_plate TEXT,
    vin TEXT,
    color TEXT,
    mileage INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CREAR TABLA QUOTATIONS (COTIZACIONES)
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    quotation_number TEXT NOT NULL,
    client_id TEXT NOT NULL,
    vehicle_id TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted')),
    valid_until DATE,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    converted_to_order BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. CREAR TABLA QUOTATION_ITEMS (ITEMS DE COTIZACIÓN)
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    item_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. CREAR TABLA ORDER_ITEMS (ITEMS DE ÓRDENES)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    item_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. CREAR TABLA INVOICE_ITEMS (ITEMS DE FACTURAS)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    item_id UUID,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. CREAR TABLA PRICE_HISTORY (HISTORIAL DE PRECIOS)
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    change_date TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. CREAR TABLA QUOTATION_TRACKING (SEGUIMIENTO DE COTIZACIONES)
CREATE TABLE IF NOT EXISTS public.quotation_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. CREAR TABLA QUOTATION_VERSIONS (VERSIONES DE COTIZACIONES)
CREATE TABLE IF NOT EXISTS public.quotation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    changes_summary TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. ARREGLAR INVENTORY_MOVEMENTS - Agregar columnas faltantes
ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS movement_type TEXT;

ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS reference_type TEXT;

ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS reference_id TEXT;

ALTER TABLE public.inventory_movements 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Migrar datos existentes si hay columna 'type'
UPDATE public.inventory_movements 
SET movement_type = CASE 
    WHEN type = 'entrada' THEN 'in'
    WHEN type = 'salida' THEN 'out'
    WHEN type = 'ajuste' THEN 'adjustment'
    ELSE 'in'
END
WHERE movement_type IS NULL AND type IS NOT NULL;

-- Establecer valores por defecto
UPDATE public.inventory_movements 
SET movement_type = 'in'
WHERE movement_type IS NULL;

UPDATE public.inventory_movements 
SET reference_type = 'adjustment'
WHERE reference_type IS NULL;

-- Hacer NOT NULL
ALTER TABLE public.inventory_movements 
ALTER COLUMN movement_type SET NOT NULL;

ALTER TABLE public.inventory_movements 
ALTER COLUMN reference_type SET NOT NULL;

-- 18. INSERTAR DATOS DE EJEMPLO
INSERT INTO public.suppliers (id, organization_id, name, contact_person, email, phone, address, status) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Proveedor ABC', 'Juan Pérez', 'juan@abc.com', '555-0001', 'Calle Principal 123', 'active'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Distribuidora XYZ', 'María García', 'maria@xyz.com', '555-0002', 'Avenida Central 456', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (id, organization_id, name, email, phone, address, rfc, status) VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'Cliente ABC', 'cliente@abc.com', '555-1001', 'Calle Cliente 123', 'ABC123456789', 'active'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'Cliente XYZ', 'cliente@xyz.com', '555-1002', 'Avenida Cliente 456', 'XYZ987654321', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vehicles (id, organization_id, customer_id, make, model, year, license_plate, vin, color, mileage) VALUES
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'Toyota', 'Corolla', 2020, 'ABC123', '1HGBH41JXMN109186', 'Blanco', 50000),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'Honda', 'Civic', 2019, 'XYZ789', '2HGBH41JXMN109187', 'Azul', 45000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.work_orders (organization_id, order_number, customer_id, vehicle_info, status, priority, estimated_hours, total_cost, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'WO-001', 'C001', 'Toyota Corolla 2020 - ABC123', 'in_progress', 'medium', 4.5, 2500.00, 'Reparación de motor'),
    ('00000000-0000-0000-0000-000000000000', 'WO-002', 'C002', 'Honda Civic 2019 - XYZ789', 'completed', 'high', 6.0, 3200.00, 'Cambio de transmisión')
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO public.purchase_orders (organization_id, supplier_id, order_number, order_date, expected_delivery_date, status, subtotal, tax_amount, total, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'PO-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', 1000.00, 160.00, 1160.00, 'Orden de prueba 1'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'PO-002', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'confirmed', 2500.00, 400.00, 2900.00, 'Orden de prueba 2')
ON CONFLICT (order_number) DO NOTHING;

INSERT INTO public.payments (organization_id, supplier_id, invoice_number, amount, payment_date, payment_method, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'INV-001', 1160.00, CURRENT_DATE, 'transfer', 'completed', 'Pago completado'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'INV-002', 2900.00, CURRENT_DATE, 'check', 'pending', 'Pago pendiente')
ON CONFLICT DO NOTHING;

INSERT INTO public.collections (organization_id, client_id, invoice_id, amount, collection_date, payment_method, reference, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'C001', 'F001', 2500.00, CURRENT_DATE, 'transfer', 'REF-001', 'completed', 'Cobro completado'),
    ('00000000-0000-0000-0000-000000000000', 'C002', 'F002', 1800.00, CURRENT_DATE, 'cash', 'REF-002', 'pending', 'Cobro pendiente'),
    ('00000000-0000-0000-0000-000000000000', 'C003', 'F003', 3200.00, CURRENT_DATE, 'card', 'REF-003', 'completed', 'Cobro con tarjeta')
ON CONFLICT DO NOTHING;

INSERT INTO public.campaigns (organization_id, name, type, status, leads_generated, conversion_rate, budget, spent, start_date, end_date) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Campaña Email Q1', 'email', 'active', 150, 12.5, 5000.00, 3200.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days'),
    ('00000000-0000-0000-0000-000000000000', 'Campaña Redes Sociales', 'social', 'active', 75, 8.0, 3000.00, 1800.00, CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days')
ON CONFLICT DO NOTHING;

INSERT INTO public.appointments (organization_id, customer_name, customer_phone, customer_email, vehicle_info, appointment_date, service_type, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Juan Pérez', '555-0001', 'juan@email.com', 'Toyota Corolla 2020', CURRENT_TIMESTAMP + INTERVAL '1 day', 'Mantenimiento', 'scheduled', 'Cita programada'),
    ('00000000-0000-0000-0000-000000000000', 'María García', '555-0002', 'maria@email.com', 'Honda Civic 2019', CURRENT_TIMESTAMP + INTERVAL '2 days', 'Reparación', 'confirmed', 'Cita confirmada')
ON CONFLICT DO NOTHING;

INSERT INTO public.quotations (organization_id, quotation_number, client_id, vehicle_id, status, valid_until, subtotal, discount_amount, tax_amount, total, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'COT-001', 'C001', 'V001', 'sent', CURRENT_DATE + INTERVAL '30 days', 2500.00, 250.00, 360.00, 2610.00, 'Cotización para reparación'),
    ('00000000-0000-0000-0000-000000000000', 'COT-002', 'C002', 'V002', 'approved', CURRENT_DATE + INTERVAL '15 days', 1800.00, 0.00, 288.00, 2088.00, 'Cotización aprobada')
ON CONFLICT (quotation_number) DO NOTHING;

INSERT INTO public.inventory_movements (organization_id, product_id, movement_type, quantity, reference_type, reference_id, notes, user_id) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'in', 10, 'purchase', 'PO-001', 'Compra inicial', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'in', 5, 'purchase', 'PO-002', 'Reposición', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'out', 2, 'sale', 'SO-001', 'Venta', NULL)
ON CONFLICT DO NOTHING;

-- 19. HABILITAR RLS EN TODAS LAS TABLAS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_versions ENABLE ROW LEVEL SECURITY;

-- 20. CREAR POLÍTICAS RLS PARA TODAS LAS TABLAS
CREATE POLICY IF NOT EXISTS "Enable all for suppliers" ON public.suppliers FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for payments" ON public.payments FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for collections" ON public.collections FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for purchase_orders" ON public.purchase_orders FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for campaigns" ON public.campaigns FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for appointments" ON public.appointments FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for work_orders" ON public.work_orders FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for customers" ON public.customers FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for vehicles" ON public.vehicles FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for quotations" ON public.quotations FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for quotation_items" ON public.quotation_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for order_items" ON public.order_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for invoice_items" ON public.invoice_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for price_history" ON public.price_history FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for quotation_tracking" ON public.quotation_tracking FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for quotation_versions" ON public.quotation_versions FOR ALL USING (true);

-- 21. MENSAJE DE CONFIRMACIÓN FINAL
SELECT 'TODAS LAS TABLAS CREADAS - SISTEMA COMPLETO' as resultado;








