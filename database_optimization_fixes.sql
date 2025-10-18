-- OPTIMIZACIONES CRÍTICAS PARA EL ESQUEMA DE BASE DE DATOS
-- Ejecutar este script en el SQL Editor de Supabase

-- =====================================================
-- 1. CREAR TABLA PURCHASE_ORDERS FALTANTE (CRÍTICO)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    organization_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    order_number text NOT NULL UNIQUE,
    order_date date NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date date,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    subtotal numeric NOT NULL DEFAULT 0.00,
    tax_amount numeric NOT NULL DEFAULT 0.00,
    total numeric NOT NULL DEFAULT 0.00,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
    CONSTRAINT purchase_orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id),
    CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

-- =====================================================
-- 2. CORREGIR PROBLEMAS EN TABLA NOTIFICATIONS
-- =====================================================

-- Corregir el tipo USER-DEFINED que está mal definido
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('info', 'warning', 'success', 'error', 'stock_low', 'order_completed', 'quotation_created'));

-- =====================================================
-- 3. CORREGIR PROBLEMAS EN TABLA EMPLOYEES
-- =====================================================

-- Corregir el tipo ARRAY que está mal definido
ALTER TABLE public.employees 
ALTER COLUMN specialties TYPE text[] USING CASE 
    WHEN specialties IS NULL THEN NULL 
    ELSE ARRAY[specialties::text] 
END;

-- =====================================================
-- 4. AGREGAR ÍNDICES CRÍTICOS PARA RENDIMIENTO
-- =====================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON public.vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON public.vehicles(license_plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON public.vehicles(vin);

CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON public.work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_entry_date ON public.work_orders(entry_date);

CREATE INDEX IF NOT EXISTS idx_quotations_organization_id ON public.quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vehicle_id ON public.quotations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_valid_until ON public.quotations(valid_until);

CREATE INDEX IF NOT EXISTS idx_products_organization_id ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_code ON public.products(code);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);

CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON public.suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON public.suppliers(is_active);

CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON public.payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- =====================================================
-- 5. HABILITAR RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS en todas las tablas principales
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREAR POLÍTICAS RLS BÁSICAS
-- =====================================================

-- Políticas para purchase_orders
CREATE POLICY "Organizations can view their own purchase orders." ON public.purchase_orders FOR SELECT USING (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can insert their own purchase orders." ON public.purchase_orders FOR INSERT WITH CHECK (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can update their own purchase orders." ON public.purchase_orders FOR UPDATE USING (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can delete their own purchase orders." ON public.purchase_orders FOR DELETE USING (organization_id = '00000000-0000-0000-0000-000000000000');

-- Políticas para customers
CREATE POLICY "Organizations can view their own customers." ON public.customers FOR SELECT USING (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can insert their own customers." ON public.customers FOR INSERT WITH CHECK (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can update their own customers." ON public.customers FOR UPDATE USING (organization_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Organizations can delete their own customers." ON public.customers FOR DELETE USING (organization_id = '00000000-0000-0000-0000-000000000000');

-- Políticas para vehicles (a través de customers)
CREATE POLICY "Organizations can view vehicles of their customers." ON public.vehicles FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE organization_id = '00000000-0000-0000-0000-000000000000')
);
CREATE POLICY "Organizations can insert vehicles for their customers." ON public.vehicles FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM public.customers WHERE organization_id = '00000000-0000-0000-0000-000000000000')
);
CREATE POLICY "Organizations can update vehicles of their customers." ON public.vehicles FOR UPDATE USING (
    customer_id IN (SELECT id FROM public.customers WHERE organization_id = '00000000-0000-0000-0000-000000000000')
);
CREATE POLICY "Organizations can delete vehicles of their customers." ON public.vehicles FOR DELETE USING (
    customer_id IN (SELECT id FROM public.customers WHERE organization_id = '00000000-0000-0000-0000-000000000000')
);

-- =====================================================
-- 7. INSERTAR DATOS DE PRUEBA ESENCIALES
-- =====================================================

-- Insertar organización por defecto si no existe
INSERT INTO public.organizations (id, name, address, phone, email) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Taller Demo', 'Av. Principal 123', '555-0123', 'demo@taller.com')
ON CONFLICT (id) DO NOTHING;

-- Insertar proveedores de prueba
INSERT INTO public.suppliers (
    id, organization_id, name, contact_person, email, phone, address, is_active
) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Proveedor ABC', 'Juan Pérez', 'juan@proveedor-abc.com', '555-0123', 'Av. Principal 123', TRUE),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Distribuidora XYZ', 'María González', 'maria@distribuidora-xyz.com', '555-0456', 'Calle Secundaria 456', TRUE),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Suministros 123', 'Carlos López', 'carlos@suministros123.com', '555-0789', 'Boulevard Industrial 789', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Insertar órdenes de compra de prueba
INSERT INTO public.purchase_orders (
    organization_id, supplier_id, order_number, order_date, expected_delivery_date, 
    status, subtotal, tax_amount, total, notes
) VALUES
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000001', 'PO-001', CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending', 1000.00, 160.00, 1160.00, 'Orden de prueba 1'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000002', 'PO-002', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', 'confirmed', 2500.00, 400.00, 2900.00, 'Orden de prueba 2'),
    ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000003', 'PO-003', CURRENT_DATE, CURRENT_DATE + INTERVAL '21 days', 'shipped', 500.00, 80.00, 580.00, 'Orden de prueba 3')
ON CONFLICT (order_number) DO NOTHING;

-- =====================================================
-- 8. VERIFICAR OPTIMIZACIONES
-- =====================================================

-- Verificar que las tablas se crearon correctamente
SELECT 'purchase_orders' as table_name, COUNT(*) as record_count FROM public.purchase_orders
UNION ALL
SELECT 'suppliers' as table_name, COUNT(*) as record_count FROM public.suppliers
UNION ALL
SELECT 'organizations' as table_name, COUNT(*) as record_count FROM public.organizations;

-- Verificar índices creados
SELECT schemaname, tablename, indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('customers', 'vehicles', 'work_orders', 'quotations', 'products', 'purchase_orders')
ORDER BY tablename, indexname;
