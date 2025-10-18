-- Script para crear la tabla collections en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Crear la tabla collections
CREATE TABLE IF NOT EXISTS public.collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.system_users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.system_users(id) ON DELETE SET NULL,
    notes TEXT,
    payment_method VARCHAR(50),
    paid_date TIMESTAMP WITH TIME ZONE,
    reference_number VARCHAR(100),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_collections_customer_id ON public.collections(customer_id);
CREATE INDEX IF NOT EXISTS idx_collections_status ON public.collections(status);
CREATE INDEX IF NOT EXISTS idx_collections_due_date ON public.collections(due_date);
CREATE INDEX IF NOT EXISTS idx_collections_organization_id ON public.collections(organization_id);
CREATE INDEX IF NOT EXISTS idx_collections_reference_number ON public.collections(reference_number);

-- Crear trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar el trigger a la tabla collections
DROP TRIGGER IF EXISTS update_collections_updated_at ON public.collections;
CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para la tabla collections
-- Política para lectura: usuarios pueden ver solo las collections de su organización
CREATE POLICY "Users can view collections from their organization" ON public.collections
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Política para inserción: usuarios pueden crear collections en su organización
CREATE POLICY "Users can create collections in their organization" ON public.collections
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Política para actualización: usuarios pueden actualizar collections de su organización
CREATE POLICY "Users can update collections in their organization" ON public.collections
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Política para eliminación: usuarios pueden eliminar collections de su organización
CREATE POLICY "Users can delete collections in their organization" ON public.collections
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Comentarios en la tabla y columnas
COMMENT ON TABLE public.collections IS 'Tabla para gestionar cobros y pagos de clientes';
COMMENT ON COLUMN public.collections.id IS 'Identificador único del cobro';
COMMENT ON COLUMN public.collections.customer_id IS 'ID del cliente asociado al cobro';
COMMENT ON COLUMN public.collections.amount IS 'Monto del cobro';
COMMENT ON COLUMN public.collections.currency IS 'Moneda del cobro (por defecto MXN)';
COMMENT ON COLUMN public.collections.status IS 'Estado del cobro: pending, paid, overdue, cancelled';
COMMENT ON COLUMN public.collections.due_date IS 'Fecha de vencimiento del cobro';
COMMENT ON COLUMN public.collections.payment_method IS 'Método de pago utilizado';
COMMENT ON COLUMN public.collections.paid_date IS 'Fecha en que se realizó el pago';
COMMENT ON COLUMN public.collections.reference_number IS 'Número de referencia del pago';
COMMENT ON COLUMN public.collections.notes IS 'Notas adicionales sobre el cobro';
COMMENT ON COLUMN public.collections.organization_id IS 'ID de la organización propietaria del cobro';
