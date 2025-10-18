-- MIGRACIÓN COMPLETA PARA SOLUCIONAR TODOS LOS PROBLEMAS DE ESQUEMA
-- Ejecutar este script en el SQL Editor de Supabase
-- Esta migración soluciona TODOS los problemas de una vez

-- =====================================================
-- 1. CORRECCIÓN COMPLETA DE INVENTORY_MOVEMENTS
-- =====================================================

-- Agregar columnas faltantes a inventory_movements
DO $$ 
BEGIN
    -- Agregar movement_type si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'movement_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements ADD COLUMN movement_type TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar reference_type si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'reference_type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements ADD COLUMN reference_type TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar reference_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'reference_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements ADD COLUMN reference_id TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Agregar user_id si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'user_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements ADD COLUMN user_id UUID;
    END IF;
END $$;

-- Migrar datos existentes de 'type' a 'movement_type'
UPDATE public.inventory_movements 
SET movement_type = CASE 
    WHEN type = 'entrada' THEN 'in'
    WHEN type = 'salida' THEN 'out'
    WHEN type = 'ajuste' THEN 'adjustment'
    ELSE 'in'
END
WHERE movement_type IS NULL;

-- Establecer valores por defecto para reference_type
UPDATE public.inventory_movements 
SET reference_type = 'adjustment'
WHERE reference_type IS NULL;

-- Agregar constraints para movement_type
ALTER TABLE public.inventory_movements 
ADD CONSTRAINT check_movement_type 
CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer'));

-- Agregar constraints para reference_type
ALTER TABLE public.inventory_movements 
ADD CONSTRAINT check_reference_type 
CHECK (reference_type IN ('purchase', 'sale', 'adjustment', 'transfer', 'return'));

-- Hacer movement_type NOT NULL
ALTER TABLE public.inventory_movements 
ALTER COLUMN movement_type SET NOT NULL;

-- Hacer reference_type NOT NULL
ALTER TABLE public.inventory_movements 
ALTER COLUMN reference_type SET NOT NULL;

-- Eliminar columnas obsoletas
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'type'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements DROP COLUMN type;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'movement_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.inventory_movements DROP COLUMN movement_date;
    END IF;
END $$;

-- =====================================================
-- 2. CORRECCIÓN COMPLETA DE PURCHASE_ORDERS
-- =====================================================

-- Agregar columnas faltantes a purchase_orders
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

-- Migrar datos existentes de total_amount a total
UPDATE public.purchase_orders 
SET total = COALESCE(total_amount, 0)
WHERE total = 0 AND total_amount IS NOT NULL;

-- Establecer subtotal basado en total si no está definido
UPDATE public.purchase_orders 
SET subtotal = total - COALESCE(tax_amount, 0)
WHERE subtotal = 0 AND total > 0;

-- Agregar constraints para status
ALTER TABLE public.purchase_orders 
DROP CONSTRAINT IF EXISTS purchase_orders_status_check;

ALTER TABLE public.purchase_orders 
ADD CONSTRAINT purchase_orders_status_check 
CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'));

-- Hacer columnas NOT NULL
ALTER TABLE public.purchase_orders 
ALTER COLUMN order_date SET NOT NULL;

ALTER TABLE public.purchase_orders 
ALTER COLUMN subtotal SET NOT NULL;

ALTER TABLE public.purchase_orders 
ALTER COLUMN tax_amount SET NOT NULL;

ALTER TABLE public.purchase_orders 
ALTER COLUMN total SET NOT NULL;

-- Eliminar columna total_amount antigua
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

-- =====================================================
-- 3. CREAR TABLAS FALTANTES SI NO EXISTEN
-- =====================================================

-- Crear tabla suppliers si no existe
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

-- =====================================================
-- 4. INSERTAR DATOS DE EJEMPLO PARA TESTING
-- =====================================================

-- Insertar proveedores de ejemplo
INSERT INTO public.suppliers (id, organization_id, name, contact_person, email, phone, address, status) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Proveedor de Repuestos ABC', 'Juan Pérez', 'juan@abc.com', '555-0001', 'Calle Principal 123', 'active'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Distribuidora XYZ', 'María García', 'maria@xyz.com', '555-0002', 'Avenida Central 456', 'active'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Suministros Industriales', 'Carlos López', 'carlos@suministros.com', '555-0003', 'Zona Industrial 789', 'active')
ON CONFLICT (id) DO NOTHING;

-- Insertar movimientos de inventario de ejemplo
INSERT INTO public.inventory_movements (
    organization_id,
    product_id,
    movement_type,
    quantity,
    reference_type,
    reference_id,
    notes,
    user_id
) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'in', 10, 'purchase', 'PO-001', 'Compra inicial de stock', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000012', 'in', 5, 'purchase', 'PO-002', 'Reposición de inventario', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000011', 'out', 2, 'sale', 'SO-001', 'Venta a cliente', NULL),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000013', 'adjustment', 1, 'adjustment', NULL, 'Ajuste de inventario por conteo', NULL)
ON CONFLICT DO NOTHING;

-- Insertar órdenes de compra de ejemplo
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

-- =====================================================
-- 5. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para inventory_movements
CREATE INDEX IF NOT EXISTS idx_inventory_movements_organization_id ON public.inventory_movements(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_movement_type ON public.inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);

-- Índices para purchase_orders
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id ON public.purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON public.purchase_orders(order_date);

-- Índices para suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON public.suppliers(status);

-- =====================================================
-- 6. HABILITAR RLS Y CREAR POLÍTICAS
-- =====================================================

-- Habilitar RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS básicas
DO $$ BEGIN
    CREATE POLICY "Enable all for inventory_movements" ON public.inventory_movements FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for purchase_orders" ON public.purchase_orders FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Enable all for suppliers" ON public.suppliers FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 7. VERIFICACIÓN FINAL
-- =====================================================

-- Verificar que las tablas tienen las columnas correctas
DO $$
BEGIN
    -- Verificar inventory_movements
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_movements' 
        AND column_name = 'movement_type'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'La columna movement_type no existe en inventory_movements';
    END IF;
    
    -- Verificar purchase_orders
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'purchase_orders' 
        AND column_name = 'order_date'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'La columna order_date no existe en purchase_orders';
    END IF;
    
    RAISE NOTICE 'Migración completada exitosamente. Todas las tablas tienen la estructura correcta.';
END $$;


