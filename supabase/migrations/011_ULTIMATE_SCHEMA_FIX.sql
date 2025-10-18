-- MIGRACIÓN DEFINITIVA - SOLUCIONA TODOS LOS PROBLEMAS DE ESQUEMA
-- Ejecutar este script en el SQL Editor de Supabase
-- Esta migración arregla TODAS las tablas de una vez

-- =====================================================
-- 1. CREAR TODAS LAS TABLAS FALTANTES
-- =====================================================

-- Tabla payments si no existe
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    supplier_id UUID NOT NULL,
    invoice_number TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'check', 'card')),
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla leads si no existe
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla campaigns si no existe
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

-- Tabla appointments si no existe
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

-- Tabla invoices si no existe
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_rfc TEXT NOT NULL,
    vehicle_info TEXT NOT NULL,
    service_description TEXT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_method TEXT,
    due_date DATE NOT NULL,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla notifications si no existe
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error', 'stock_low', 'order_completed', 'quotation_created')),
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CORREGIR INVENTORY_MOVEMENTS
-- =====================================================

-- Agregar columnas faltantes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'movement_type' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN movement_type TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'reference_type' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN reference_type TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'reference_id' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN reference_id TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'user_id' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_movements ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Migrar datos existentes
UPDATE public.inventory_movements 
SET movement_type = CASE 
    WHEN type = 'entrada' THEN 'in'
    WHEN type = 'salida' THEN 'out'
    WHEN type = 'ajuste' THEN 'adjustment'
    ELSE 'in'
END
WHERE movement_type IS NULL;

UPDATE public.inventory_movements 
SET reference_type = 'adjustment'
WHERE reference_type IS NULL;

-- Agregar constraints
ALTER TABLE public.inventory_movements 
ADD CONSTRAINT check_movement_type 
CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer'));

ALTER TABLE public.inventory_movements 
ADD CONSTRAINT check_reference_type 
CHECK (reference_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return'));

-- Hacer NOT NULL
ALTER TABLE public.inventory_movements 
ALTER COLUMN movement_type SET NOT NULL;

ALTER TABLE public.inventory_movements 
ALTER COLUMN reference_type SET NOT NULL;

-- Eliminar columnas obsoletas
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'type' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_movements DROP COLUMN type;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'movement_date' AND table_schema = 'public') THEN
        ALTER TABLE public.inventory_movements DROP COLUMN movement_date;
    END IF;
END $$;

-- =====================================================
-- 3. CORREGIR PURCHASE_ORDERS
-- =====================================================

-- Agregar columnas faltantes
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'order_date' AND table_schema = 'public') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN order_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'subtotal' AND table_schema = 'public') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'tax_amount' AND table_schema = 'public') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'total' AND table_schema = 'public') THEN
        ALTER TABLE public.purchase_orders ADD COLUMN total DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- Migrar datos existentes
UPDATE public.purchase_orders 
SET total = COALESCE(total_amount, 0)
WHERE total = 0 AND total_amount IS NOT NULL;

UPDATE public.purchase_orders 
SET subtotal = total - COALESCE(tax_amount, 0)
WHERE subtotal = 0 AND total > 0;

-- Agregar constraints
ALTER TABLE public.purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders 
ADD CONSTRAINT purchase_orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

-- Hacer NOT NULL
ALTER TABLE public.purchase_orders 
ALTER COLUMN order_date SET NOT NULL;

ALTER TABLE public.purchase_orders 
ALTER COLUMN subtotal SET NOT NULL;

ALTER TABLE public.purchase_orders 
ALTER COLUMN tax_amount SET NOT NULL;

ALTER TABLE public.purchase_orders 
ALTER COLUMN total SET NOT NULL;

-- Eliminar columna obsoleta
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'total_amount' AND table_schema = 'public') THEN
        ALTER TABLE public.purchase_orders DROP COLUMN total_amount;
    END IF;
END $$;

-- =====================================================
-- 4. INSERTAR DATOS DE EJEMPLO
-- =====================================================

-- Proveedores
INSERT INTO public.suppliers (id, organization_id, name, contact_person, email, phone, address, status) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Proveedor ABC', 'Juan Pérez', 'juan@abc.com', '555-0001', 'Calle Principal 123', 'active'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Distribuidora XYZ', 'María García', 'maria@xyz.com', '555-0002', 'Avenida Central 456', 'active')
ON CONFLICT (id) DO NOTHING;

-- Movimientos de inventario
INSERT INTO public.inventory_movements (organization_id, product_id, movement_type, quantity, reference_type, reference_id, notes, user_id) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'in', 10, 'purchase', 'PO-001', 'Compra inicial', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'in', 5, 'purchase', 'PO-002', 'Reposición', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'out', 2, 'sale', 'SO-001', 'Venta', NULL)
ON CONFLICT DO NOTHING;

-- Órdenes de compra
INSERT INTO public.purchase_orders (organization_id, supplier_id, order_number, order_date, expected_delivery_date, status, subtotal, tax_amount, total, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'PO-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', 1000.00, 160.00, 1160.00, 'Orden 1'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'PO-002', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'confirmed', 2500.00, 400.00, 2900.00, 'Orden 2')
ON CONFLICT (order_number) DO NOTHING;

-- Pagos
INSERT INTO public.payments (organization_id, supplier_id, invoice_number, amount, payment_date, payment_method, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'INV-001', 1160.00, CURRENT_DATE, 'transfer', 'completed', 'Pago completado'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'INV-002', 2900.00, CURRENT_DATE, 'check', 'pending', 'Pago pendiente')
ON CONFLICT DO NOTHING;

-- Leads
INSERT INTO public.leads (organization_id, name, email, phone, source, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Cliente Potencial 1', 'cliente1@email.com', '555-1001', 'website', 'new', 'Lead inicial'),
    ('00000000-0000-0000-0000-000000000000', 'Cliente Potencial 2', 'cliente2@email.com', '555-1002', 'referral', 'contacted', 'Contactado')
ON CONFLICT DO NOTHING;

-- Citas
INSERT INTO public.appointments (organization_id, customer_name, customer_phone, customer_email, vehicle_info, appointment_date, service_type, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Juan Pérez', '555-2001', 'juan@email.com', 'Toyota Corolla 2020', CURRENT_DATE + INTERVAL '1 day', 'Mantenimiento', 'scheduled', 'Cita programada'),
    ('00000000-0000-0000-0000-000000000000', 'María García', '555-2002', 'maria@email.com', 'Honda Civic 2019', CURRENT_DATE + INTERVAL '2 days', 'Reparación', 'confirmed', 'Cita confirmada')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 5. CREAR ÍNDICES
-- =====================================================

-- Índices para inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_org ON public.inventory_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON public.inventory_movements(created_at);

-- Índices para purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON public.purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_date ON public.purchase_orders(order_date);

-- Índices para payments
CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON public.payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_org ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_date ON public.leads(created_at);

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);

-- =====================================================
-- 6. HABILITAR RLS
-- =====================================================

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS
DO $$ BEGIN
    CREATE POLICY "Enable all for inventory_movements" ON public.inventory_movements FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for purchase_orders" ON public.purchase_orders FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for payments" ON public.payments FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for leads" ON public.leads FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for campaigns" ON public.campaigns FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for appointments" ON public.appointments FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for invoices" ON public.invoices FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for notifications" ON public.notifications FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for suppliers" ON public.suppliers FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    missing_columns TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Verificar tablas críticas
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements' AND table_schema = 'public') THEN
        missing_tables := array_append(missing_tables, 'inventory_movements');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_orders' AND table_schema = 'public') THEN
        missing_tables := array_append(missing_tables, 'purchase_orders');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments' AND table_schema = 'public') THEN
        missing_tables := array_append(missing_tables, 'payments');
    END IF;
    
    -- Verificar columnas críticas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_movements' AND column_name = 'movement_type' AND table_schema = 'public') THEN
        missing_columns := array_append(missing_columns, 'inventory_movements.movement_type');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_orders' AND column_name = 'order_date' AND table_schema = 'public') THEN
        missing_columns := array_append(missing_columns, 'purchase_orders.order_date');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'payment_date' AND table_schema = 'public') THEN
        missing_columns := array_append(missing_columns, 'payments.payment_date');
    END IF;
    
    -- Reportar resultados
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE EXCEPTION 'Tablas faltantes: %', array_to_string(missing_tables, ', ');
    END IF;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Columnas faltantes: %', array_to_string(missing_columns, ', ');
    END IF;
    
    RAISE NOTICE 'MIGRACIÓN DEFINITIVA COMPLETADA EXITOSAMENTE';
    RAISE NOTICE 'Todas las tablas y columnas críticas están presentes';
    RAISE NOTICE 'El sistema debería funcionar sin errores';
END $$;



