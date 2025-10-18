-- =====================================================
-- MIGRACIÓN 004: TODAS LAS NUEVAS FUNCIONALIDADES
-- =====================================================
-- Agregar tablas para citas, comercial, facturación, usuarios y configuraciones
-- Compatible con multi-tenancy (organization_id)

-- 1. TABLA DE CITAS/APPOINTMENTS
-- =====================================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    vehicle_info VARCHAR(255) NOT NULL,
    service_type VARCHAR(255) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
    notes TEXT,
    estimated_duration INTEGER DEFAULT 60, -- en minutos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA DE LEADS COMERCIALES
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    value DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    last_contact DATE,
    assigned_to VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA DE CAMPAÑAS COMERCIALES
-- =====================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'phone', 'social', 'event')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
    leads_generated INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    budget DECIMAL(10,2) DEFAULT 0,
    spent DECIMAL(10,2) DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA DE FACTURAS/INVOICES
-- =====================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_rfc VARCHAR(20) NOT NULL,
    vehicle_info VARCHAR(255) NOT NULL,
    service_description TEXT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    payment_method VARCHAR(50),
    due_date DATE NOT NULL,
    paid_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. TABLA DE USUARIOS DEL SISTEMA
-- =====================================================
CREATE TABLE IF NOT EXISTS system_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'mechanic', 'receptionist')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
    last_login TIMESTAMP WITH TIME ZONE,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. TABLA DE CONFIGURACIONES DE EMPRESA
-- =====================================================
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    rfc VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    website VARCHAR(255),
    logo_url TEXT,
    business_hours JSONB DEFAULT '{}',
    billing_settings JSONB DEFAULT '{}',
    service_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

-- Índices para appointments
CREATE INDEX IF NOT EXISTS idx_appointments_organization_id ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_name);

-- Índices para leads
CREATE INDEX IF NOT EXISTS idx_leads_organization_id ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);

-- Índices para campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(type);

-- Índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Índices para system_users
CREATE INDEX IF NOT EXISTS idx_system_users_organization_id ON system_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_users_role ON system_users(role);
CREATE INDEX IF NOT EXISTS idx_system_users_status ON system_users(status);
CREATE INDEX IF NOT EXISTS idx_system_users_email ON system_users(email);

-- Índices para company_settings
CREATE INDEX IF NOT EXISTS idx_company_settings_organization_id ON company_settings(organization_id);

-- =====================================================
-- TRIGGERS Y FUNCIONES
-- =====================================================

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_users_updated_at BEFORE UPDATE ON system_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para asignar organization_id automáticamente
CREATE OR REPLACE FUNCTION set_org_from_jwt()
RETURNS TRIGGER AS $$
BEGIN
    NEW.organization_id = (auth.jwt() ->> 'organization_id')::UUID;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para organization_id
CREATE TRIGGER set_appointments_organization_id BEFORE INSERT ON appointments
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_leads_organization_id BEFORE INSERT ON leads
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_campaigns_organization_id BEFORE INSERT ON campaigns
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_invoices_organization_id BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_system_users_organization_id BEFORE INSERT ON system_users
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

CREATE TRIGGER set_company_settings_organization_id BEFORE INSERT ON company_settings
    FOR EACH ROW EXECUTE FUNCTION set_org_from_jwt();

-- Función para generar número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_month TEXT;
    sequence_num INTEGER;
    invoice_num TEXT;
BEGIN
    -- Formato: FAC-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    -- Obtener el siguiente número de secuencia para este mes
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices 
    WHERE organization_id = NEW.organization_id
    AND invoice_number LIKE 'FAC-' || year_month || '-%';
    
    -- Generar número de factura
    invoice_num := 'FAC-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    NEW.invoice_number := invoice_num;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER generate_invoice_number_trigger BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- =====================================================
-- RLS (ROW LEVEL SECURITY)
-- =====================================================

-- Habilitar RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para appointments
CREATE POLICY "Users can manage appointments from their organization" ON appointments
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para leads
CREATE POLICY "Users can manage leads from their organization" ON leads
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para campaigns
CREATE POLICY "Users can manage campaigns from their organization" ON campaigns
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para invoices
CREATE POLICY "Users can manage invoices from their organization" ON invoices
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para system_users
CREATE POLICY "Users can manage system users from their organization" ON system_users
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- Políticas para company_settings
CREATE POLICY "Users can manage company settings from their organization" ON company_settings
    FOR ALL USING (organization_id = (auth.jwt() ->> 'organization_id')::UUID);

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================

-- Configuración de empresa de ejemplo
INSERT INTO company_settings (organization_id, company_name, rfc, address, phone, email, website, business_hours, billing_settings, service_settings) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Taller Automotriz del Norte', 'TAN800101ABC', 'Av. Universidad 123, Monterrey, NL, México', '+52 81 1234 5678', 'contacto@tallerdelnorte.com', 'www.tallerdelnorte.com', 
'{"monday": "08:00 - 18:00", "tuesday": "08:00 - 18:00", "wednesday": "08:00 - 18:00", "thursday": "08:00 - 18:00", "friday": "08:00 - 18:00", "saturday": "08:00 - 14:00", "sunday": "Cerrado"}',
'{"currency": "MXN", "tax_rate": 16, "invoice_prefix": "FAC", "payment_terms": 30}',
'{"default_service_time": 120, "require_appointment": true, "send_notifications": true}');

-- Usuarios del sistema de ejemplo
INSERT INTO system_users (organization_id, name, email, phone, role, status, permissions) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Juan Pérez', 'juan@tallerdelnorte.com', '+52 81 1234 5678', 'admin', 'active', '["all"]'),
('550e8400-e29b-41d4-a716-446655440000', 'María García', 'maria@tallerdelnorte.com', '+52 81 2345 6789', 'manager', 'active', '["orders", "customers", "inventory", "reports"]'),
('550e8400-e29b-41d4-a716-446655440000', 'Carlos López', 'carlos@tallerdelnorte.com', '+52 81 3456 7890', 'mechanic', 'active', '["orders", "inventory"]'),
('550e8400-e29b-41d4-a716-446655440000', 'Ana Rodríguez', 'ana@tallerdelnorte.com', '+52 81 4567 8901', 'receptionist', 'pending', '["orders", "customers", "appointments"]');

-- Citas de ejemplo
INSERT INTO appointments (organization_id, customer_name, customer_phone, customer_email, vehicle_info, service_type, appointment_date, appointment_time, status, notes, estimated_duration) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Juan Pérez', '+52 81 1111 2222', 'juan@email.com', 'Toyota Corolla 2020 - ABC123', 'Cambio de aceite y filtro', '2025-01-25', '09:00', 'scheduled', 'Cliente prefiere aceite sintético', 60),
('550e8400-e29b-41d4-a716-446655440000', 'María García', '+52 55 3333 4444', 'maria@email.com', 'Honda Civic 2019 - XYZ789', 'Revisión general', '2025-01-26', '14:00', 'confirmed', 'Revisión de frenos incluida', 120),
('550e8400-e29b-41d4-a716-446655440000', 'Carlos Ruiz', '+52 33 5555 6666', 'carlos@email.com', 'Nissan Sentra 2021 - DEF456', 'Alineación y balanceo', '2025-01-27', '10:30', 'completed', 'Cliente satisfecho con el servicio', 90);

-- Leads de ejemplo
INSERT INTO leads (organization_id, name, company, phone, email, source, status, value, notes, assigned_to) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Roberto Martínez', 'Transportes del Norte', '+52 81 1111 2222', 'roberto@transportes.com', 'Referido', 'qualified', 15000, 'Interesado en mantenimiento de flota', 'Juan Pérez'),
('550e8400-e29b-41d4-a716-446655440000', 'Ana López', NULL, '+52 55 3333 4444', 'ana@email.com', 'Facebook', 'contacted', 5000, 'Necesita reparación de auto particular', 'María García'),
('550e8400-e29b-41d4-a716-446655440000', 'Carlos Hernández', 'Flecha Roja', '+52 33 5555 6666', 'carlos@flecharoja.com', 'Google Ads', 'proposal', 25000, 'Evaluando propuesta para 20 vehículos', 'Pedro López');

-- Campañas de ejemplo
INSERT INTO campaigns (organization_id, name, type, status, leads_generated, conversion_rate, budget, spent, start_date, end_date) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Campaña Facebook Q1', 'social', 'active', 45, 12.5, 5000, 3200, '2025-01-01', '2025-03-31'),
('550e8400-e29b-41d4-a716-446655440000', 'Email Marketing Enero', 'email', 'completed', 120, 8.3, 2000, 2000, '2025-01-01', '2025-01-31'),
('550e8400-e29b-41d4-a716-446655440000', 'Evento Automotriz', 'event', 'active', 30, 20.0, 8000, 4500, '2025-01-15', '2025-02-15');

-- Facturas de ejemplo
INSERT INTO invoices (organization_id, customer_name, customer_rfc, vehicle_info, service_description, subtotal, tax, total, status, payment_method, due_date, paid_date) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Juan Pérez', 'PEPJ800101ABC', 'Toyota Corolla 2020 - ABC123', 'Cambio de aceite, filtro de aire y revisión general', 850.00, 136.00, 986.00, 'paid', 'Efectivo', '2025-01-25', '2025-01-20'),
('550e8400-e29b-41d4-a716-446655440000', 'María García', 'GARM850315DEF', 'Honda Civic 2019 - XYZ789', 'Reparación de frenos delanteros', 1200.00, 192.00, 1392.00, 'sent', NULL, '2025-01-30', NULL),
('550e8400-e29b-41d4-a716-446655440000', 'Carlos Ruiz', 'RUIC900520GHI', 'Nissan Sentra 2021 - DEF456', 'Alineación y balanceo', 650.00, 104.00, 754.00, 'overdue', NULL, '2025-01-15', NULL);

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE appointments IS 'Citas y citas programadas para servicios';
COMMENT ON TABLE leads IS 'Leads comerciales y prospectos';
COMMENT ON TABLE campaigns IS 'Campañas de marketing y ventas';
COMMENT ON TABLE invoices IS 'Facturas y documentos de cobro';
COMMENT ON TABLE system_users IS 'Usuarios del sistema con roles y permisos';
COMMENT ON TABLE company_settings IS 'Configuraciones de la empresa';

COMMENT ON COLUMN appointments.status IS 'Estado de la cita: scheduled, confirmed, completed, cancelled';
COMMENT ON COLUMN leads.status IS 'Estado del lead: new, contacted, qualified, proposal, negotiation, won, lost';
COMMENT ON COLUMN campaigns.type IS 'Tipo de campaña: email, phone, social, event';
COMMENT ON COLUMN invoices.status IS 'Estado de la factura: draft, sent, paid, overdue, cancelled';
COMMENT ON COLUMN system_users.role IS 'Rol del usuario: admin, manager, mechanic, receptionist';
COMMENT ON COLUMN system_users.permissions IS 'Permisos del usuario en formato JSON array';

