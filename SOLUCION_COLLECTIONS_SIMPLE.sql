-- SOLUCIÓN SIMPLE - SOLO CREAR TABLA COLLECTIONS
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. CREAR TABLA COLLECTIONS (COBROS)
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    client_id TEXT NOT NULL,
    invoice_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    collection_date DATE NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'transfer' CHECK (payment_method IN ('cash', 'transfer', 'card', 'check')),
    reference TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INSERTAR DATOS DE EJEMPLO
INSERT INTO public.collections (organization_id, client_id, invoice_id, amount, collection_date, payment_method, reference, status, notes) VALUES
    ('00000000-0000-0000-0000-000000000000', 'C001', 'F001', 2500.00, CURRENT_DATE, 'transfer', 'REF-001', 'completed', 'Cobro completado'),
    ('00000000-0000-0000-0000-000000000000', 'C002', 'F002', 1800.00, CURRENT_DATE, 'cash', 'REF-002', 'pending', 'Cobro pendiente'),
    ('00000000-0000-0000-0000-000000000000', 'C003', 'F003', 3200.00, CURRENT_DATE, 'card', 'REF-003', 'completed', 'Cobro con tarjeta')
ON CONFLICT DO NOTHING;

-- 3. HABILITAR RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- 4. CREAR POLÍTICA RLS
CREATE POLICY IF NOT EXISTS "Enable all for collections" ON public.collections FOR ALL USING (true);

-- 5. MENSAJE DE CONFIRMACIÓN
SELECT 'TABLA COLLECTIONS CREADA - ERROR SOLUCIONADO' as resultado;








