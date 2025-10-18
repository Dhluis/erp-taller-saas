-- =============================================
-- MIGRACIÓN 002: NUEVAS FUNCIONALIDADES ERP TALLER
-- =============================================
-- Descripción: Agrega tablas para empleados, servicios, cotizaciones, 
--              suscripciones Stripe, tracking de precios y límites de uso
-- Fecha: 2024-01-XX
-- Compatibilidad: Mantiene tablas existentes (organizations, customers, vehicles, work_orders, inventory)

-- =============================================
-- 1. EXTENSIONES Y CONFIGURACIÓN
-- =============================================

-- Extensión para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función helper para extraer organization_id del JWT
CREATE OR REPLACE FUNCTION auth.organization_id()
RETURNS TEXT LANGUAGE SQL STABLE AS $$
  SELECT COALESCE(
    NULLIF(CURRENT_SETTING('request.jwt.claims', true), '')::jsonb->>'organization_id',
    ''
  );
$$;

-- =============================================
-- 2. TABLAS NUEVAS
-- =============================================

-- 2.1 EMPLOYEES - Personal del taller (mecánicos, supervisores, etc.)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    role TEXT NOT NULL CHECK (role IN ('mechanic', 'supervisor', 'admin', 'receptionist')),
    specialties TEXT[] DEFAULT '{}', -- Array de especialidades: ['engine', 'transmission', 'electrical']
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.2 SERVICES - Catálogo de servicios del taller
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    code TEXT NOT NULL, -- Código único del servicio
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('maintenance', 'repair', 'diagnostic', 'bodywork', 'electrical', 'suspension')),
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    estimated_hours DECIMAL(6,2) DEFAULT 1.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, code) -- Código único por organización
);

-- 2.3 ORDER_ITEMS - Items/servicios en órdenes (mejorada)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id),
    inventory_id UUID REFERENCES public.inventory(id),
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    description TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_percent DECIMAL(5,2) DEFAULT 16.00, -- IVA México
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    mechanic_id UUID REFERENCES public.employees(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.4 QUOTATIONS - Sistema de cotizaciones
CREATE TABLE IF NOT EXISTS public.quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    quotation_number TEXT NOT NULL, -- Formato: COT-YYYYMM-0001
    client_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'converted')),
    valid_until DATE,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    converted_to_order BOOLEAN DEFAULT false,
    order_id UUID REFERENCES public.work_orders(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, quotation_number)
);

-- 2.5 QUOTATION_ITEMS - Items en cotizaciones
CREATE TABLE IF NOT EXISTS public.quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id),
    inventory_id UUID REFERENCES public.inventory(id),
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    description TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_percent DECIMAL(5,2) DEFAULT 16.00,
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.6 QUOTATION_TRACKING - Historial de cambios en cotizaciones
CREATE TABLE IF NOT EXISTS public.quotation_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'created', 'sent', 'viewed', 'approved', 'rejected'
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.7 SUBSCRIPTIONS - Suscripciones Stripe
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('starter', 'professional', 'enterprise')),
    status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'trialing')),
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.8 PRICE_HISTORY - Historial de cambios de precios
CREATE TABLE IF NOT EXISTS public.price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    item_id UUID NOT NULL,
    old_price DECIMAL(10,2) NOT NULL,
    new_price DECIMAL(10,2) NOT NULL,
    changed_by UUID, -- ID del usuario que hizo el cambio
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.9 PAYMENT_HISTORY - Historial de pagos con Stripe
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'MXN',
    status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'canceled')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2.10 USAGE_TRACKING - Control de límites por plan
CREATE TABLE IF NOT EXISTS public.usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('orders', 'clients', 'users', 'storage', 'api_calls')),
    current_usage INTEGER DEFAULT 0,
    limit_value INTEGER NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, metric_type, period_start)
);

-- =============================================
-- 3. ÍNDICES PARA OPTIMIZACIÓN
-- =============================================

-- Índices en foreign keys
CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON public.employees(role) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_services_org ON public.services(organization_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_code ON public.services(organization_id, code);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org ON public.order_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_order_items_status ON public.order_items(status);

CREATE INDEX IF NOT EXISTS idx_quotations_org ON public.quotations(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotations_client ON public.quotations(client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON public.quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_number ON public.quotations(organization_id, quotation_number);

CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation ON public.quotation_items(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_items_org ON public.quotation_items(organization_id);

CREATE INDEX IF NOT EXISTS idx_quotation_tracking_quotation ON public.quotation_tracking(quotation_id);
CREATE INDEX IF NOT EXISTS idx_quotation_tracking_action ON public.quotation_tracking(action);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_price_history_org ON public.price_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item ON public.price_history(item_type, item_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_org ON public.payment_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe ON public.payment_history(stripe_payment_intent_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_org ON public.usage_tracking(organization_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_metric ON public.usage_tracking(metric_type);

-- =============================================
-- 4. TRIGGERS AUTOMÁTICOS
-- =============================================

-- 4.1 Función para actualizar timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.2 Función para calcular totales de items
CREATE OR REPLACE FUNCTION public.calculate_item_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calcular subtotal
    NEW.subtotal = NEW.quantity * NEW.unit_price;
    
    -- Calcular descuento
    NEW.discount_amount = NEW.subtotal * (NEW.discount_percent / 100);
    
    -- Calcular base imponible
    DECLARE
        taxable_amount DECIMAL(10,2);
    BEGIN
        taxable_amount := NEW.subtotal - NEW.discount_amount;
        NEW.tax_amount := taxable_amount * (NEW.tax_percent / 100);
        NEW.total := taxable_amount + NEW.tax_amount;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Función para generar número de cotización
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
    quotation_num TEXT;
BEGIN
    -- Formato: COT-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    -- Obtener siguiente número de secuencia para el mes
    SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM public.quotations
    WHERE organization_id = NEW.organization_id
    AND quotation_number LIKE 'COT-' || year_month || '-%';
    
    -- Formatear número con ceros a la izquierda
    quotation_num := 'COT-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    NEW.quotation_number := quotation_num;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.4 Función para asignar organization_id desde JWT
CREATE OR REPLACE FUNCTION public.assign_organization_id()
RETURNS TRIGGER AS $$
DECLARE
    jwt_claims JSONB;
    org_id TEXT;
BEGIN
    BEGIN
        jwt_claims := CURRENT_SETTING('request.jwt.claims', true)::jsonb;
        org_id := jwt_claims->>'organization_id';
    EXCEPTION WHEN OTHERS THEN
        org_id := '';
    END;

    IF org_id = '' THEN
        RAISE EXCEPTION 'Missing organization_id in JWT claims';
    END IF;

    NEW.organization_id := org_id::UUID;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers a las tablas
DROP TRIGGER IF EXISTS trg_employees_updated ON public.employees;
CREATE TRIGGER trg_employees_updated
    BEFORE UPDATE ON public.employees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_services_updated ON public.services;
CREATE TRIGGER trg_services_updated
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_order_items_updated ON public.order_items;
CREATE TRIGGER trg_order_items_updated
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_order_items_totals ON public.order_items;
CREATE TRIGGER trg_order_items_totals
    BEFORE INSERT OR UPDATE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_item_totals();

DROP TRIGGER IF EXISTS trg_quotations_updated ON public.quotations;
CREATE TRIGGER trg_quotations_updated
    BEFORE UPDATE ON public.quotations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_quotations_number ON public.quotations;
CREATE TRIGGER trg_quotations_number
    BEFORE INSERT ON public.quotations
    FOR EACH ROW EXECUTE FUNCTION public.generate_quotation_number();

DROP TRIGGER IF EXISTS trg_quotation_items_updated ON public.quotation_items;
CREATE TRIGGER trg_quotation_items_updated
    BEFORE UPDATE ON public.quotation_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_quotation_items_totals ON public.quotation_items;
CREATE TRIGGER trg_quotation_items_totals
    BEFORE INSERT OR UPDATE ON public.quotation_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_item_totals();

-- Triggers para asignar organization_id automáticamente
DROP TRIGGER IF EXISTS trg_employees_org ON public.employees;
CREATE TRIGGER trg_employees_org
    BEFORE INSERT ON public.employees
    FOR EACH ROW WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS trg_services_org ON public.services;
CREATE TRIGGER trg_services_org
    BEFORE INSERT ON public.services
    FOR EACH ROW WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS trg_order_items_org ON public.order_items;
CREATE TRIGGER trg_order_items_org
    BEFORE INSERT ON public.order_items
    FOR EACH ROW WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS trg_quotations_org ON public.quotations;
CREATE TRIGGER trg_quotations_org
    BEFORE INSERT ON public.quotations
    FOR EACH ROW WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.assign_organization_id();

DROP TRIGGER IF EXISTS trg_quotation_items_org ON public.quotation_items;
CREATE TRIGGER trg_quotation_items_org
    BEFORE INSERT ON public.quotation_items
    FOR EACH ROW WHEN (NEW.organization_id IS NULL)
    EXECUTE FUNCTION public.assign_organization_id();

-- =============================================
-- 5. FUNCIONES DE NEGOCIO
-- =============================================

-- 5.1 Convertir cotización a orden
CREATE OR REPLACE FUNCTION public.convert_quotation_to_order(quotation_uuid UUID)
RETURNS UUID AS $$
DECLARE
    new_order_id UUID;
    quotation_rec RECORD;
    item_rec RECORD;
BEGIN
    -- Obtener datos de la cotización
    SELECT * INTO quotation_rec
    FROM public.quotations
    WHERE id = quotation_uuid AND status = 'approved';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quotation not found or not approved';
    END IF;
    
    -- Crear nueva orden
    INSERT INTO public.work_orders (
        organization_id, customer_id, vehicle_id, status, description, 
        estimated_cost, notes
    ) VALUES (
        quotation_rec.organization_id,
        quotation_rec.client_id,
        quotation_rec.vehicle_id,
        'reception',
        'Orden generada desde cotización: ' || quotation_rec.quotation_number,
        quotation_rec.total,
        quotation_rec.notes
    ) RETURNING id INTO new_order_id;
    
    -- Copiar items de cotización a orden
    FOR item_rec IN 
        SELECT * FROM public.quotation_items 
        WHERE quotation_id = quotation_uuid
    LOOP
        INSERT INTO public.order_items (
            organization_id, order_id, service_id, inventory_id, item_type,
            description, quantity, unit_price, discount_percent, discount_amount,
            tax_percent, subtotal, tax_amount, total, status
        ) VALUES (
            item_rec.organization_id, new_order_id, item_rec.service_id, 
            item_rec.inventory_id, item_rec.item_type, item_rec.description,
            item_rec.quantity, item_rec.unit_price, item_rec.discount_percent,
            item_rec.discount_amount, item_rec.tax_percent, item_rec.subtotal,
            item_rec.tax_amount, item_rec.total, 'pending'
        );
    END LOOP;
    
    -- Marcar cotización como convertida
    UPDATE public.quotations
    SET converted_to_order = true, order_id = new_order_id, status = 'converted'
    WHERE id = quotation_uuid;
    
    RETURN new_order_id;
END;
$$ LANGUAGE plpgsql;

-- 5.2 Verificar límites de uso
CREATE OR REPLACE FUNCTION public.check_usage_limits(org_id UUID, metric TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_usage INTEGER;
    limit_value INTEGER;
BEGIN
    SELECT ut.current_usage, ut.limit_value
    INTO current_usage, limit_value
    FROM public.usage_tracking ut
    WHERE ut.organization_id = org_id 
    AND ut.metric_type = metric
    AND ut.period_start <= NOW()
    AND ut.period_end >= NOW();
    
    IF NOT FOUND THEN
        RETURN true; -- Sin límites configurados
    END IF;
    
    RETURN current_usage < limit_value;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en todas las tablas nuevas
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para cada tabla
DO $$
BEGIN
    -- Employees
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='employees' AND policyname='employees_org_policy') THEN
        CREATE POLICY employees_org_policy ON public.employees
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;

    -- Services
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='services' AND policyname='services_org_policy') THEN
        CREATE POLICY services_org_policy ON public.services
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;

    -- Order Items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='order_items_org_policy') THEN
        CREATE POLICY order_items_org_policy ON public.order_items
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;

    -- Quotations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotations' AND policyname='quotations_org_policy') THEN
        CREATE POLICY quotations_org_policy ON public.quotations
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;

    -- Quotation Items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotation_items' AND policyname='quotation_items_org_policy') THEN
        CREATE POLICY quotation_items_org_policy ON public.quotation_items
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;

    -- Quotation Tracking
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='quotation_tracking' AND policyname='quotation_tracking_org_policy') THEN
        CREATE POLICY quotation_tracking_org_policy ON public.quotation_tracking
            FOR ALL USING (
                quotation_id IN (
                    SELECT id FROM public.quotations 
                    WHERE organization_id = auth.organization_id()::UUID
                )
            );
    END IF;

    -- Subscriptions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='subscriptions' AND policyname='subscriptions_org_policy') THEN
        CREATE POLICY subscriptions_org_policy ON public.subscriptions
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;

    -- Price History
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='price_history' AND policyname='price_history_org_policy') THEN
        CREATE POLICY price_history_org_policy ON public.price_history
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;

    -- Payment History
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='payment_history' AND policyname='payment_history_org_policy') THEN
        CREATE POLICY payment_history_org_policy ON public.payment_history
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;

    -- Usage Tracking
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='usage_tracking' AND policyname='usage_tracking_org_policy') THEN
        CREATE POLICY usage_tracking_org_policy ON public.usage_tracking
            FOR ALL USING (organization_id = auth.organization_id()::UUID)
            WITH CHECK (organization_id = auth.organization_id()::UUID);
    END IF;
END $$;

-- =============================================
-- 7. DATOS DE EJEMPLO
-- =============================================

-- Insertar servicios comunes de talleres mexicanos
INSERT INTO public.services (organization_id, code, name, description, category, base_price, estimated_hours) VALUES
('00000000-0000-0000-0000-000000000000', 'SRV-001', 'Cambio de aceite', 'Cambio de aceite sintético 5W-30', 'maintenance', 800.00, 1.0),
('00000000-0000-0000-0000-000000000000', 'SRV-002', 'Afinación completa', 'Afinación completa del motor', 'maintenance', 2500.00, 3.0),
('00000000-0000-0000-0000-000000000000', 'SRV-003', 'Revisión de frenos', 'Revisión y ajuste del sistema de frenos', 'repair', 1200.00, 2.0),
('00000000-0000-0000-0000-000000000000', 'SRV-004', 'Cambio de pastillas', 'Cambio de pastillas de freno delanteras', 'repair', 1800.00, 1.5),
('00000000-0000-0000-0000-000000000000', 'SRV-005', 'Alineación y balanceo', 'Alineación y balanceo de llantas', 'suspension', 650.00, 1.5),
('00000000-0000-0000-0000-000000000000', 'SRV-006', 'Diagnóstico computarizado', 'Diagnóstico con scanner automotriz', 'diagnostic', 500.00, 0.5),
('000000000-0000-0000-0000-000000000000', 'SRV-007', 'Reparación de aire acondicionado', 'Revisión y reparación del sistema A/C', 'electrical', 3500.00, 4.0),
('00000000-0000-0000-0000-000000000000', 'SRV-008', 'Cambio de batería', 'Cambio de batería automotriz', 'electrical', 1200.00, 0.5),
('00000000-0000-0000-0000-000000000000', 'SRV-009', 'Reparación de transmisión', 'Reparación general de transmisión', 'repair', 8000.00, 8.0),
('00000000-0000-0000-0000-000000000000', 'SRV-010', 'Pintura y enderezado', 'Trabajos de pintura y enderezado', 'bodywork', 5000.00, 6.0)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Insertar empleados de ejemplo
INSERT INTO public.employees (organization_id, name, email, phone, role, specialties, hourly_rate) VALUES
('00000000-0000-0000-0000-000000000000', 'Carlos Méndez', 'carlos@taller.com', '555-0101', 'mechanic', ARRAY['engine', 'transmission'], 150.00),
('00000000-0000-0000-0000-000000000000', 'Ana García', 'ana@taller.com', '555-0102', 'mechanic', ARRAY['electrical', 'diagnostic'], 140.00),
('00000000-0000-0000-0000-000000000000', 'Roberto López', 'roberto@taller.com', '555-0103', 'supervisor', ARRAY['bodywork', 'suspension'], 200.00),
('00000000-0000-0000-0000-000000000000', 'María Rodríguez', 'maria@taller.com', '555-0104', 'receptionist', ARRAY['customer_service'], 120.00)
ON CONFLICT DO NOTHING;

-- Insertar límites de uso para plan starter
INSERT INTO public.usage_tracking (organization_id, metric_type, current_usage, limit_value) VALUES
('00000000-0000-0000-0000-000000000000', 'orders', 0, 100),
('00000000-0000-0000-0000-000000000000', 'clients', 0, 50),
('00000000-0000-0000-0000-000000000000', 'users', 0, 3),
('00000000-0000-0000-0000-000000000000', 'storage', 0, 1000),
('00000000-0000-0000-0000-000000000000', 'api_calls', 0, 10000)
ON CONFLICT (organization_id, metric_type, period_start) DO NOTHING;

-- =============================================
-- 8. COMENTARIOS Y DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE public.employees IS 'Personal del taller: mecánicos, supervisores, recepcionistas';
COMMENT ON TABLE public.services IS 'Catálogo de servicios ofrecidos por el taller';
COMMENT ON TABLE public.order_items IS 'Items/servicios incluidos en cada orden de trabajo';
COMMENT ON TABLE public.quotations IS 'Sistema de cotizaciones para clientes';
COMMENT ON TABLE public.quotation_items IS 'Items incluidos en cada cotización';
COMMENT ON TABLE public.quotation_tracking IS 'Historial de cambios y acciones en cotizaciones';
COMMENT ON TABLE public.subscriptions IS 'Suscripciones Stripe para el modelo SaaS';
COMMENT ON TABLE public.price_history IS 'Historial de cambios de precios en servicios/productos';
COMMENT ON TABLE public.payment_history IS 'Historial de pagos procesados con Stripe';
COMMENT ON TABLE public.usage_tracking IS 'Control de límites de uso por plan de suscripción';

-- =============================================
-- FIN DE LA MIGRACIÓN
-- =============================================

