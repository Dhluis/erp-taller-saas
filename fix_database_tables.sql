-- MIGRACIÓN URGENTE - CREAR TABLAS FALTANTES
-- Ejecutar este script en el SQL Editor de Supabase
-- Soluciona el error: "Could not find the table 'public.purchase_orders' in the schema cache"

-- =====================================================
-- 1. CREAR TABLA PURCHASE_ORDERS (URGENTE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    supplier_id UUID NOT NULL,
    order_number TEXT NOT NULL UNIQUE,
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Organizations can view their own purchase orders." ON public.purchase_orders FOR SELECT USING (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can insert their own purchase orders." ON public.purchase_orders FOR INSERT WITH CHECK (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can update their own purchase orders." ON public.purchase_orders FOR UPDATE USING (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can delete their own purchase orders." ON public.purchase_orders FOR DELETE USING (organization_id = '00000000-0000-0000-0000-000000000000');

-- =====================================================
-- 2. CREAR TABLA SUPPLIERS (SI NO EXISTE)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'México',
    tax_id TEXT,
    payment_terms TEXT,
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Organizations can view their own suppliers." ON public.suppliers FOR SELECT USING (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can insert their own suppliers." ON public.suppliers FOR INSERT WITH CHECK (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can update their own suppliers." ON public.suppliers FOR UPDATE USING (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can delete their own suppliers." ON public.suppliers FOR DELETE USING (organization_id = '00000000-0000-0000-0000-000000000000');

-- =====================================================
-- 3. INSERTAR DATOS DE PRUEBA
-- =====================================================

-- Insertar proveedores de prueba
INSERT INTO public.suppliers (
    organization_id,
    name,
    contact_person,
    email,
    phone,
    address,
    is_active
) VALUES
    ('00000000-0000-0000-0000-000000000000', 'Proveedor ABC', 'Juan Pérez', 'juan@proveedor-abc.com', '555-0123', 'Av. Principal 123', TRUE),
    ('00000000-0000-0000-0000-000000000000', 'Distribuidora XYZ', 'María González', 'maria@distribuidora-xyz.com', '555-0456', 'Calle Secundaria 456', TRUE),
    ('00000000-0000-0000-0000-000000000000', 'Suministros 123', 'Carlos López', 'carlos@suministros123.com', '555-0789', 'Boulevard Industrial 789', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insertar órdenes de compra de prueba
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
    ('00000000-0000-0000-0000-000000000000', 
     (SELECT id FROM public.suppliers WHERE name = 'Proveedor ABC' LIMIT 1), 
     'PO-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', 1000.00, 160.00, 1160.00, 'Orden de prueba 1'),
    ('00000000-0000-0000-0000-000000000000', 
     (SELECT id FROM public.suppliers WHERE name = 'Distribuidora XYZ' LIMIT 1), 
     'PO-002', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'confirmed', 2500.00, 400.00, 2900.00, 'Orden de prueba 2'),
    ('00000000-0000-0000-0000-000000000000', 
     (SELECT id FROM public.suppliers WHERE name = 'Suministros 123' LIMIT 1), 
     'PO-003', CURRENT_DATE, CURRENT_DATE + INTERVAL '21 days', 'shipped', 500.00, 80.00, 580.00, 'Orden de prueba 3')
ON CONFLICT (order_number) DO NOTHING;

-- =====================================================
-- 4. CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization_id ON public.purchase_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON public.purchase_orders(order_date);

CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);

-- =====================================================
-- 5. VERIFICAR CREACIÓN
-- =====================================================

-- Verificar que las tablas se crearon correctamente
SELECT 'purchase_orders' as table_name, COUNT(*) as record_count FROM public.purchase_orders
UNION ALL
SELECT 'suppliers' as table_name, COUNT(*) as record_count FROM public.suppliers;
