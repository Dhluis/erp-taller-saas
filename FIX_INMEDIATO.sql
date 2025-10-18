-- SOLUCIÓN INMEDIATA - EJECUTAR EN SUPABASE SQL EDITOR
-- Este script soluciona TODOS los errores de una vez

-- 1. CREAR TABLA PAYMENTS SI NO EXISTE
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

-- 2. CREAR TABLA SUPPLIERS SI NO EXISTE
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

-- 3. ARREGLAR INVENTORY_MOVEMENTS
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

-- Hacer NOT NULL
ALTER TABLE public.inventory_movements 
ALTER COLUMN movement_type SET NOT NULL;

ALTER TABLE public.inventory_movements 
ALTER COLUMN reference_type SET NOT NULL;

-- 4. ARREGLAR PURCHASE_ORDERS
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

-- Hacer NOT NULL
ALTER TABLE public.purchase_orders 
ALTER COLUMN order_date SET NOT NULL;
ALTER TABLE public.purchase_orders 
ALTER COLUMN subtotal SET NOT NULL;
ALTER TABLE public.purchase_orders 
ALTER COLUMN tax_amount SET NOT NULL;
ALTER TABLE public.purchase_orders 
ALTER COLUMN total SET NOT NULL;

-- 5. INSERTAR DATOS DE EJEMPLO
-- Proveedores
INSERT INTO public.suppliers (id, organization_id, name, contact_person, email, phone, address, status) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Proveedor ABC', 'Juan Pérez', 'juan@abc.com', '555-0001', 'Calle Principal 123', 'active'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Distribuidora XYZ', 'María García', 'maria@xyz.com', '555-0002', 'Avenida Central 456', 'active')
ON CONFLICT (id) DO NOTHING;

-- Órdenes de compra
INSERT INTO public.purchase_orders (organization_id, supplier_id, order_number, order_date, expected_delivery_date, status, subtotal, tax_amount, total, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'PO-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', 1000.00, 160.00, 1160.00, 'Orden de prueba 1'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'PO-002', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'confirmed', 2500.00, 400.00, 2900.00, 'Orden de prueba 2')
ON CONFLICT (order_number) DO NOTHING;

-- Pagos
INSERT INTO public.payments (organization_id, supplier_id, invoice_number, amount, payment_date, payment_method, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'INV-001', 1160.00, CURRENT_DATE, 'transfer', 'completed', 'Pago completado'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'INV-002', 2900.00, CURRENT_DATE, 'check', 'pending', 'Pago pendiente')
ON CONFLICT DO NOTHING;

-- Movimientos de inventario
INSERT INTO public.inventory_movements (organization_id, product_id, movement_type, quantity, reference_type, reference_id, notes, user_id) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'in', 10, 'purchase', 'PO-001', 'Compra inicial', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'in', 5, 'purchase', 'PO-002', 'Reposición', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'out', 2, 'sale', 'SO-001', 'Venta', NULL)
ON CONFLICT DO NOTHING;

-- 6. HABILITAR RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- 7. CREAR POLÍTICAS RLS
DO $$ BEGIN
    CREATE POLICY "Enable all for payments" ON public.payments FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for suppliers" ON public.suppliers FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for inventory_movements" ON public.inventory_movements FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for purchase_orders" ON public.purchase_orders FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 8. MENSAJE DE CONFIRMACIÓN
DO $$
BEGIN
    RAISE NOTICE 'SOLUCIÓN INMEDIATA COMPLETADA';
    RAISE NOTICE 'Todas las tablas han sido creadas/corregidas';
    RAISE NOTICE 'Datos de ejemplo insertados';
    RAISE NOTICE 'RLS configurado';
    RAISE NOTICE 'NO deberías ver más errores en la consola';
END $$;



