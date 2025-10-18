-- =============================================
-- MIGRACIÓN 1: CONFIGURACIÓN INICIAL
-- =============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear función para generar UUIDs
CREATE OR REPLACE FUNCTION uuid_generate_v4()
RETURNS UUID AS $$
BEGIN
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MIGRACIÓN 2: ORGANIZACIONES Y MULTI-TENANCY
-- =============================================

-- Crear tabla de organizaciones
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para organizaciones
CREATE POLICY "Users can view their own organization." ON public.organizations FOR SELECT USING (auth.jwt() ->> 'organization_id' = id::TEXT);
CREATE POLICY "Users can update their own organization." ON public.organizations FOR UPDATE USING (auth.jwt() ->> 'organization_id' = id::TEXT);

-- Crear tabla de clientes
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own clients." ON public.clients FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own clients." ON public.clients FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own clients." ON public.clients FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own clients." ON public.clients FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- Crear tabla de vehículos
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER,
    license_plate TEXT,
    vin TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own vehicles." ON public.vehicles FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own vehicles." ON public.vehicles FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own vehicles." ON public.vehicles FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own vehicles." ON public.vehicles FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- Crear tabla de órdenes de trabajo
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    order_number TEXT NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    description TEXT,
    total_amount DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own work orders." ON public.work_orders FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own work orders." ON public.work_orders FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own work orders." ON public.work_orders FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own work orders." ON public.work_orders FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- Crear tabla de inventario
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    sku TEXT,
    quantity INTEGER DEFAULT 0 NOT NULL,
    unit_price DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own inventory." ON public.inventory FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own inventory." ON public.inventory FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own inventory." ON public.inventory FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own inventory." ON public.inventory FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- =============================================
-- MIGRACIÓN 3: PROVEEDORES Y NOTIFICACIONES
-- =============================================

-- Crear tabla de proveedores
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

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own suppliers." ON public.suppliers FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own suppliers." ON public.suppliers FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own suppliers." ON public.suppliers FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own suppliers." ON public.suppliers FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- Crear tabla de notificaciones
DO $$ BEGIN
    CREATE TYPE public.notification_type AS ENUM ('info', 'warning', 'error', 'success', 'stock_low', 'order_completed', 'quotation_created');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own notifications." ON public.notifications FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own notifications." ON public.notifications FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own notifications." ON public.notifications FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own notifications." ON public.notifications FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- =============================================
-- MIGRACIÓN 4: NUEVAS FUNCIONALIDADES
-- =============================================

-- Crear tabla de citas
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

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own appointments." ON public.appointments FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own appointments." ON public.appointments FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own appointments." ON public.appointments FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own appointments." ON public.appointments FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- Crear tabla de leads
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

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own leads." ON public.leads FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own leads." ON public.leads FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own leads." ON public.leads FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own leads." ON public.leads FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- Crear tabla de campañas
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

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own campaigns." ON public.campaigns FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own campaigns." ON public.campaigns FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own campaigns." ON public.campaigns FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own campaigns." ON public.campaigns FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- Crear tabla de facturas
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    customer_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
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

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organizations can view their own invoices." ON public.invoices FOR SELECT USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can insert their own invoices." ON public.invoices FOR INSERT WITH CHECK (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can update their own invoices." ON public.invoices FOR UPDATE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);
CREATE POLICY "Organizations can delete their own invoices." ON public.invoices FOR DELETE USING (auth.jwt() ->> 'organization_id' = organization_id::TEXT);

-- =============================================
-- TRIGGERS Y FUNCIONES
-- =============================================

-- Función para asignar organization_id automáticamente
CREATE OR REPLACE FUNCTION public.set_org_from_jwt()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.jwt() ->> 'organization_id' IS NULL THEN
    RAISE EXCEPTION 'organization_id not found in JWT';
  END IF;
  NEW.organization_id = (auth.jwt() ->> 'organization_id')::UUID;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers a todas las tablas
CREATE TRIGGER set_organization_id_clients
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_vehicles
BEFORE INSERT ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_work_orders
BEFORE INSERT ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_inventory
BEFORE INSERT ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_suppliers
BEFORE INSERT ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_notifications
BEFORE INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_appointments
BEFORE INSERT ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_leads
BEFORE INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_campaigns
BEFORE INSERT ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

CREATE TRIGGER set_organization_id_invoices
BEFORE INSERT ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_org_from_jwt();

-- Triggers para updated_at
CREATE TRIGGER set_updated_at_clients
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_vehicles
BEFORE UPDATE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_work_orders
BEFORE UPDATE ON public.work_orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_inventory
BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_suppliers
BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_notifications
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_appointments
BEFORE UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_leads
BEFORE UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_campaigns
BEFORE UPDATE ON public.campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_invoices
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================
-- DATOS DE EJEMPLO
-- =============================================

-- Insertar organización de ejemplo
INSERT INTO public.organizations (id, name, description) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Taller Ejemplo S.A.', 'Taller automotriz de ejemplo');

-- Insertar clientes de ejemplo
INSERT INTO public.clients (organization_id, name, email, phone, address) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Juan Pérez', 'juan@email.com', '5512345678', 'Calle Falsa 123'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'María García', 'maria@email.com', '5598765432', 'Av. Principal 456');

-- Insertar vehículos de ejemplo
INSERT INTO public.vehicles (organization_id, client_id, brand, model, year, license_plate, color) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', (SELECT id FROM public.clients WHERE name = 'Juan Pérez' LIMIT 1), 'Toyota', 'Corolla', 2020, 'ABC123', 'Blanco'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', (SELECT id FROM public.clients WHERE name = 'María García' LIMIT 1), 'Honda', 'Civic', 2019, 'XYZ789', 'Azul');

-- Insertar inventario de ejemplo
INSERT INTO public.inventory (organization_id, name, description, sku, quantity, unit_price, category) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Filtro de Aceite', 'Filtro de aceite para motor', 'FIL-001', 50, 150.00, 'Filtros'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bujías', 'Bujías de encendido', 'BUJ-001', 30, 200.00, 'Encendido'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Aceite Motor', 'Aceite sintético 5W-30', 'ACE-001', 20, 300.00, 'Lubricantes');

-- Insertar proveedores de ejemplo
INSERT INTO public.suppliers (organization_id, name, contact_name, email, phone, address, category, status, notes) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AutoPartes Central', 'Juan Pérez', 'juan@autopartes.com', '5512345678', 'Calle Falsa 123', 'Refacciones', 'active', 'Proveedor principal'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'LubriMax', 'Ana Gómez', 'ana@lubrimax.com', '5587654321', 'Av. Siempre Viva 456', 'Lubricantes', 'active', 'Especialistas en aceites');

-- Insertar notificaciones de ejemplo
INSERT INTO public.notifications (organization_id, type, title, message, read) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'warning', 'Stock Bajo', 'El filtro de aceite XYZ-456 está por agotarse. Quedan 3 unidades.', FALSE),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'info', 'Nueva Orden', 'Se ha creado la orden #OS-202408-005 para Cliente Ejemplo.', FALSE),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'success', 'Orden Completada', 'La orden #OS-202407-123 ha sido marcada como completada.', TRUE);

-- Insertar citas de ejemplo
INSERT INTO public.appointments (organization_id, customer_name, customer_phone, customer_email, vehicle_info, service_type, appointment_date, appointment_time, estimated_duration, status, notes) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Carlos Ruiz', '5511223344', 'carlos@example.com', 'Nissan Versa 2018 - XYZ789', 'Cambio de aceite', '2025-01-10', '10:00:00', 60, 'scheduled', 'Cliente prefiere esperar.'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Laura García', '5599887766', 'laura@example.com', 'Honda CRV 2022 - ABC456', 'Revisión de frenos', '2025-01-11', '14:30:00', 90, 'confirmed', 'Urgente, ruidos al frenar.');

-- Insertar leads de ejemplo
INSERT INTO public.leads (organization_id, name, email, phone, source, status, interest, estimated_value, notes) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sofía Hernández', 'sofia@example.com', '5533445566', 'Web', 'new', 'Servicio de frenos', 300.00, 'Interesada en presupuesto.'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Pedro López', 'pedro@example.com', '5577889900', 'Referral', 'contacted', 'Cambio de llantas', 500.00, 'Contactado, enviar cotización.');

-- Insertar campañas de ejemplo
INSERT INTO public.campaigns (organization_id, name, description, start_date, end_date, budget, status) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Campaña Invierno 2025', 'Descuentos en servicios de mantenimiento para el invierno.', '2025-01-01', '2025-02-28', 1500.00, 'active'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Revisión Gratuita', 'Ofrecer revisión de 20 puntos gratuita para nuevos clientes.', '2024-12-01', '2024-12-31', 500.00, 'completed');
