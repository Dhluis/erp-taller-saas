-- Migración completa para EAGLES ERP
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Crear extensión UUID si no existe
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Crear tabla organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Crear tabla customers (clientes)
CREATE TABLE IF NOT EXISTS public.customers (
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

-- 4. Crear tabla vehicles
CREATE TABLE IF NOT EXISTS public.vehicles (
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

-- 5. Crear tabla work_orders
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    order_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    description TEXT,
    estimated_cost DECIMAL(10,2),
    final_cost DECIMAL(10,2),
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    estimated_completion TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 6. Crear tabla inventory
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    code TEXT,
    name TEXT NOT NULL,
    description TEXT,
    quantity INTEGER DEFAULT 0 NOT NULL,
    min_quantity INTEGER DEFAULT 1 NOT NULL,
    unit_price DECIMAL(10,2),
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 7. Crear tabla suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    category TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 8. Crear tabla notifications
CREATE TYPE IF NOT EXISTS public.notification_type AS ENUM ('info', 'warning', 'error', 'success', 'stock_low', 'order_completed', 'quotation_created');

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 9. Crear tabla appointments
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    vehicle_info TEXT NOT NULL,
    service_type TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    estimated_duration INTEGER DEFAULT 60 NOT NULL,
    status TEXT DEFAULT 'scheduled' NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 10. Crear tabla leads
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    source TEXT,
    status TEXT DEFAULT 'new' NOT NULL,
    interest TEXT,
    estimated_value DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 11. Crear tabla campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 12. Agregar campaign_id a leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;

-- 13. Crear tabla invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    work_order_id UUID REFERENCES public.work_orders(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    status TEXT DEFAULT 'draft' NOT NULL,
    payment_method TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 14. Crear tabla invoice_items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount_percent DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    subtotal DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    total DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 15. Crear tabla system_users
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT DEFAULT 'mechanic' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    phone TEXT,
    address TEXT,
    hire_date DATE,
    salary DECIMAL(10,2),
    permissions JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 16. Crear tabla company_settings
CREATE TABLE IF NOT EXISTS public.company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
    company_name TEXT NOT NULL,
    tax_id TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    currency TEXT DEFAULT 'MXN' NOT NULL,
    tax_rate DECIMAL(5,2) DEFAULT 16.00 NOT NULL,
    working_hours JSONB DEFAULT '{}'::jsonb NOT NULL,
    invoice_terms TEXT,
    appointment_defaults JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 17. Crear índices
CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON public.customers (organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer_id ON public.vehicles (customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_organization_id ON public.work_orders (organization_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_customer_id ON public.work_orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_id ON public.work_orders (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inventory_organization_id ON public.inventory (organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON public.suppliers (organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON public.notifications (organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON public.appointments (organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON public.leads (organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON public.campaigns (organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON public.invoices (organization_id);
CREATE INDEX IF NOT EXISTS idx_system_users_organization_id ON public.system_users (organization_id);

-- 18. Habilitar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- 19. Crear políticas RLS básicas (permitir todo por ahora para testing)
CREATE POLICY IF NOT EXISTS "Enable all for organizations" ON public.organizations FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for customers" ON public.customers FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for vehicles" ON public.vehicles FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for work_orders" ON public.work_orders FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for inventory" ON public.inventory FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for suppliers" ON public.suppliers FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for notifications" ON public.notifications FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for appointments" ON public.appointments FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for leads" ON public.leads FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for campaigns" ON public.campaigns FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for invoices" ON public.invoices FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for invoice_items" ON public.invoice_items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for system_users" ON public.system_users FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Enable all for company_settings" ON public.company_settings FOR ALL USING (true);

-- 20. Insertar datos de ejemplo
INSERT INTO public.organizations (id, name, address, phone, email) 
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mi Taller Express S.A. de C.V.', 'Calle del Taller 123, Col. Centro, CDMX', '5512345678', 'contacto@mitaller.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.customers (id, organization_id, name, email, phone, address) 
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Juan Pérez', 'juan@example.com', '5512345678', 'Calle Falsa 123'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'María García', 'maria@example.com', '5587654321', 'Av. Siempre Viva 456')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.vehicles (id, customer_id, brand, model, year, license_plate, color) 
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Toyota', 'Corolla', 2020, 'ABC123', 'Blanco'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Honda', 'Civic', 2019, 'XYZ789', 'Azul')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.suppliers (id, organization_id, name, contact_name, email, phone, address, category, status, notes) 
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AutoPartes Central', 'Juan Pérez', 'juan.perez@autopartes.com', '5512345678', 'Calle Falsa 123, CDMX', 'Refacciones', 'active', 'Proveedor principal de refacciones generales.'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a32', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'LubriMax', 'Ana Gómez', 'ana.gomez@lubrimax.com', '5587654321', 'Av. Siempre Viva 456, EdoMex', 'Lubricantes', 'active', 'Especialistas en aceites y fluidos.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.notifications (id, organization_id, type, title, message, read) 
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'warning', 'Stock Bajo', 'El filtro de aceite XYZ-456 está por agotarse. Quedan 3 unidades.', FALSE),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'info', 'Nueva Orden de Servicio', 'Se ha creado la orden #OS-202408-005 para Cliente Ejemplo.', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.appointments (id, organization_id, customer_name, customer_phone, customer_email, vehicle_info, service_type, appointment_date, appointment_time, estimated_duration, status, notes) 
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Carlos Ruiz', '5511223344', 'carlos@example.com', 'Nissan Versa 2018 - XYZ789', 'Cambio de aceite', '2025-01-10', '10:00:00', 60, 'scheduled', 'Cliente prefiere esperar.'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Laura García', '5599887766', 'laura@example.com', 'Honda CRV 2022 - ABC456', 'Revisión de frenos', '2025-01-11', '14:30:00', 90, 'confirmed', 'Urgente, ruidos al frenar.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.leads (id, organization_id, name, email, phone, source, status, interest, estimated_value, notes) 
VALUES 
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sofía Hernández', 'sofia@example.com', '5533445566', 'Web', 'new', 'Servicio de frenos', 300.00, 'Interesada en presupuesto.'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pedro López', 'pedro@example.com', '5577889900', 'Referral', 'contacted', 'Cambio de llantas', 500.00, 'Contactado, enviar cotización.')
ON CONFLICT (id) DO NOTHING;

-- 21. Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 22. Aplicar triggers de updated_at a todas las tablas
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'organizations', 'customers', 'vehicles', 'work_orders', 'inventory',
            'suppliers', 'notifications', 'appointments', 'leads', 'campaigns',
            'invoices', 'invoice_items', 'system_users', 'company_settings'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS set_updated_at_%I ON public.%I;
            CREATE TRIGGER set_updated_at_%I
            BEFORE UPDATE ON public.%I
            FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
        ', table_name, table_name, table_name, table_name);
    END LOOP;
END $$;

-- 23. Mensaje de confirmación
SELECT 'Migración completada exitosamente. Todas las tablas han sido creadas.' as message;

