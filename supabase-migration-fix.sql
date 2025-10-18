-- =====================================================
-- MIGRACIÓN CORREGIDA PARA EAGLES ERP
-- Soluciona problemas de columnas existentes
-- =====================================================

-- 1. Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Eliminar tablas existentes si tienen problemas
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.quotation_items CASCADE;
DROP TABLE IF EXISTS public.inventory_movements CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE;
DROP TABLE IF EXISTS public.quotations CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.system_users CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;

-- 3. Crear tabla organizations
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 4. Crear tabla customers (clientes)
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 5. Crear tabla vehicles
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    license_plate TEXT,
    vin TEXT,
    color TEXT,
    mileage INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Crear tabla work_orders
CREATE TABLE public.work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    description TEXT,
    estimated_cost DECIMAL(10,2) DEFAULT 0.00,
    final_cost DECIMAL(10,2) DEFAULT 0.00,
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. Crear tabla products (inventario)
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    type TEXT NOT NULL DEFAULT 'product' CHECK (type IN ('product', 'service')),
    unit TEXT NOT NULL DEFAULT 'piece',
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,2) DEFAULT 16.00,
    stock_quantity INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 1000,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    updated_by UUID
);

-- 8. Crear tabla inventory_categories
CREATE TABLE public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    updated_by UUID
);

-- 8. Crear tabla suppliers
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
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
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    updated_by UUID
);

-- 9. Crear tabla employees
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'mechanic' CHECK (role IN ('mechanic', 'supervisor', 'receptionist', 'manager')),
    specialties TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 10. Crear tabla services
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estimated_hours DECIMAL(5,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 11. Crear tabla order_items
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.work_orders(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_percent DECIMAL(5,2) DEFAULT 16.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    mechanic_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 12. Crear tabla quotations
CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    quotation_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted')),
    valid_until DATE NOT NULL,
    terms_and_conditions TEXT,
    notes TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    updated_by UUID
);

-- 13. Crear tabla quotation_items
CREATE TABLE public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    inventory_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_percent DECIMAL(5,2) DEFAULT 16.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 14. Crear tabla invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_method TEXT,
    notes TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    updated_by UUID
);

-- 15. Crear tabla inventory_movements
CREATE TABLE public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'adjustment', 'transfer')),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reference TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID
);

-- 16. Crear tabla system_users
CREATE TABLE public.system_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee', 'viewer')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 17. Crear tabla company_settings
CREATE TABLE public.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    company_name TEXT NOT NULL,
    tax_id TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    currency TEXT DEFAULT 'MXN',
    tax_rate DECIMAL(5,2) DEFAULT 16.00,
    working_hours JSONB DEFAULT '{}',
    invoice_terms TEXT,
    appointment_defaults JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 18. Crear tabla appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT NOT NULL,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 19. Crear tabla leads
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 20. Crear tabla campaigns
CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'phone', 'social', 'event')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    leads_generated INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    budget DECIMAL(10,2) DEFAULT 0,
    spent DECIMAL(10,2) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 21. Crear tabla payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE NOT NULL,
    invoice_number TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'check', 'card')),
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- =====================================================
-- CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para customers
CREATE INDEX idx_customers_organization_id ON public.customers(organization_id);
CREATE INDEX idx_customers_name ON public.customers(name);

-- Índices para vehicles
CREATE INDEX idx_vehicles_customer_id ON public.vehicles(customer_id);
CREATE INDEX idx_vehicles_license_plate ON public.vehicles(license_plate);

-- Índices para work_orders
CREATE INDEX idx_work_orders_organization_id ON public.work_orders(organization_id);
CREATE INDEX idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_entry_date ON public.work_orders(entry_date);

-- Índices para products
CREATE INDEX idx_products_organization_id ON public.products(organization_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);

-- Índices para order_items
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_service_id ON public.order_items(service_id);
CREATE INDEX idx_order_items_inventory_id ON public.order_items(inventory_id);

-- Índices para quotations
CREATE INDEX idx_quotations_organization_id ON public.quotations(organization_id);
CREATE INDEX idx_quotations_customer_id ON public.quotations(customer_id);
CREATE INDEX idx_quotations_status ON public.quotations(status);

-- =====================================================
-- CONFIGURAR ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas (permitir todo por ahora)
CREATE POLICY "Enable all operations for all users" ON public.organizations FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.customers FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.vehicles FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.work_orders FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.products FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.suppliers FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.employees FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.services FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.order_items FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.quotations FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.quotation_items FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.invoices FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.inventory_movements FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.system_users FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.company_settings FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.appointments FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.leads FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.campaigns FOR ALL USING (true);
CREATE POLICY "Enable all operations for all users" ON public.payments FOR ALL USING (true);

-- =====================================================
-- INSERTAR DATOS INICIALES
-- =====================================================

-- Insertar organización por defecto
INSERT INTO public.organizations (id, name, address, phone, email) 
VALUES ('00000000-0000-0000-0000-000000000000', 'EAGLES ERP Demo', 'Dirección de ejemplo', '555-0123', 'demo@eagles.com');

-- Insertar empleados de ejemplo
INSERT INTO public.employees (organization_id, name, email, phone, role, specialties) VALUES
('00000000-0000-0000-0000-000000000000', 'Carlos Méndez', 'carlos@eagles.com', '555-0001', 'mechanic', ARRAY['motor', 'transmisión']),
('00000000-0000-0000-0000-000000000000', 'Ana García', 'ana@eagles.com', '555-0002', 'mechanic', ARRAY['eléctrico', 'diagnóstico']),
('00000000-0000-0000-0000-000000000000', 'Roberto López', 'roberto@eagles.com', '555-0003', 'supervisor', ARRAY['carrocería', 'suspensión']),
('00000000-0000-0000-0000-000000000000', 'María Rodríguez', 'maria@eagles.com', '555-0004', 'receptionist', ARRAY['atención al cliente']);

-- Insertar servicios de ejemplo
INSERT INTO public.services (organization_id, code, name, description, category, base_price, estimated_hours) VALUES
('00000000-0000-0000-0000-000000000000', 'SER001', 'Cambio de aceite', 'Cambio de aceite y filtro', 'Mantenimiento', 800.00, 0.5),
('00000000-0000-0000-0000-000000000000', 'SER002', 'Afinación completa', 'Afinación completa del motor', 'Mantenimiento', 2500.00, 2.0),
('00000000-0000-0000-0000-000000000000', 'SER003', 'Revisión de frenos', 'Revisión y ajuste de frenos', 'Frenos', 1200.00, 1.0),
('00000000-0000-0000-0000-000000000000', 'SER004', 'Alineación y balanceo', 'Alineación y balanceo de llantas', 'Suspensión', 650.00, 1.0),
('00000000-0000-0000-0000-000000000000', 'SER005', 'Diagnóstico computarizado', 'Diagnóstico con scanner', 'Diagnóstico', 500.00, 0.5);

-- Insertar categorías de inventario de ejemplo
INSERT INTO public.inventory_categories (organization_id, name, description, is_active) VALUES
('00000000-0000-0000-0000-000000000000', 'Lubricantes', 'Aceites y lubricantes para motor', true),
('00000000-0000-0000-0000-000000000000', 'Filtros', 'Filtros de aire, aceite y combustible', true),
('00000000-0000-0000-0000-000000000000', 'Frenos', 'Sistema de frenos y componentes', true),
('00000000-0000-0000-0000-000000000000', 'Encendido', 'Sistema de encendido y bujías', true);

-- Insertar productos de ejemplo
INSERT INTO public.products (organization_id, code, name, description, category, type, unit, price, cost, stock_quantity, min_stock) VALUES
('00000000-0000-0000-0000-000000000000', 'PROD001', 'Aceite 5W-30', 'Aceite sintético 5W-30', 'Lubricantes', 'product', 'litro', 150.00, 120.00, 50, 10),
('00000000-0000-0000-0000-000000000000', 'PROD002', 'Filtro de aceite', 'Filtro de aceite estándar', 'Filtros', 'product', 'pieza', 80.00, 60.00, 30, 5),
('00000000-0000-0000-0000-000000000000', 'PROD003', 'Pastillas de freno', 'Pastillas de freno delanteras', 'Frenos', 'product', 'juego', 400.00, 300.00, 20, 5),
('00000000-0000-0000-0000-000000000000', 'PROD004', 'Bujías', 'Bujías de encendido', 'Encendido', 'product', 'juego', 200.00, 150.00, 15, 3);

-- Insertar configuración de empresa
INSERT INTO public.company_settings (organization_id, company_name, tax_id, address, phone, email, currency, tax_rate) VALUES
('00000000-0000-0000-0000-000000000000', 'EAGLES ERP Demo', 'RFC123456789', 'Dirección de ejemplo', '555-0123', 'demo@eagles.com', 'MXN', 16.00);

-- =====================================================
-- VERIFICAR CREACIÓN DE TABLAS
-- =====================================================

-- Mostrar todas las tablas creadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;
