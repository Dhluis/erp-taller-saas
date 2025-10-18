-- Migración para corregir la estructura de purchase_orders
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Agregar columnas faltantes a purchase_orders
DO $$ 
BEGIN
    -- Agregar order_date si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'order_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.purchase_orders ADD COLUMN order_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar subtotal si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'subtotal'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.purchase_orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar tax_amount si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'tax_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.purchase_orders ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar total si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'total'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.purchase_orders ADD COLUMN total DECIMAL(10,2) DEFAULT 0.00;
    END IF;
END $$;

-- 2. Migrar datos existentes de total_amount a total
UPDATE public.purchase_orders 
SET total = COALESCE(total_amount, 0)
WHERE total = 0 AND total_amount IS NOT NULL;

-- 3. Establecer subtotal basado en total si no está definido
UPDATE public.purchase_orders 
SET subtotal = total - COALESCE(tax_amount, 0)
WHERE subtotal = 0 AND total > 0;

-- 4. Agregar constraints para status
ALTER TABLE public.purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders 
ADD CONSTRAINT purchase_orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

-- 5. Hacer order_date NOT NULL
ALTER TABLE public.purchase_orders 
ALTER COLUMN order_date SET NOT NULL;

-- 6. Hacer subtotal NOT NULL
ALTER TABLE public.purchase_orders 
ALTER COLUMN subtotal SET NOT NULL;

-- 7. Hacer tax_amount NOT NULL
ALTER TABLE public.purchase_orders 
ALTER COLUMN tax_amount SET NOT NULL;

-- 8. Hacer total NOT NULL
ALTER TABLE public.purchase_orders 
ALTER COLUMN total SET NOT NULL;

-- 9. Eliminar la columna total_amount antigua si existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'total_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.purchase_orders DROP COLUMN total_amount;
    END IF;
END $$;

-- 10. Insertar algunos datos de ejemplo para testing
INSERT INTO public.purchase_orders (
    organization_id,
    supplier_id,
    order_number,
    order_date,
    expected_delivery_date,
    status,
    subtotal,
    tax_amount,
    total,
    notes
) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'PO-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', 1000.00, 160.00, 1160.00, 'Orden de prueba 1'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'PO-002', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'confirmed', 2500.00, 400.00, 2900.00, 'Orden de prueba 2'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'PO-003', CURRENT_DATE, CURRENT_DATE + INTERVAL '21 days', 'shipped', 500.00, 80.00, 580.00, 'Orden de prueba 3')
ON CONFLICT (order_number) DO NOTHING;

-- 11. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id ON public.purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON public.purchase_orders(order_date);



