-- Fix para tabla payments - Agregar columna due_date faltante
-- Ejecutar en Supabase SQL Editor

-- Verificar si la tabla payments existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        -- Agregar columna due_date si no existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'payments' AND column_name = 'due_date') THEN
            ALTER TABLE public.payments 
            ADD COLUMN due_date DATE;
            
            RAISE NOTICE 'Columna due_date agregada a la tabla payments';
        ELSE
            RAISE NOTICE 'Columna due_date ya existe en la tabla payments';
        END IF;
        
        -- Agregar columna supplier_name si no existe
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'payments' AND column_name = 'supplier_name') THEN
            ALTER TABLE public.payments 
            ADD COLUMN supplier_name TEXT;
            
            RAISE NOTICE 'Columna supplier_name agregada a la tabla payments';
        ELSE
            RAISE NOTICE 'Columna supplier_name ya existe en la tabla payments';
        END IF;
        
        -- Agregar columna reference si no existe (como alternativa a reference_number)
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'payments' AND column_name = 'reference') THEN
            ALTER TABLE public.payments 
            ADD COLUMN reference TEXT;
            
            RAISE NOTICE 'Columna reference agregada a la tabla payments';
        ELSE
            RAISE NOTICE 'Columna reference ya existe en la tabla payments';
        END IF;
        
        -- Agregar columna method si no existe (como alternativa a payment_method)
        IF NOT EXISTS (SELECT FROM information_schema.columns 
                      WHERE table_name = 'payments' AND column_name = 'method') THEN
            ALTER TABLE public.payments 
            ADD COLUMN method TEXT CHECK (method IN ('cash', 'transfer', 'check', 'card', 'bank_transfer', 'credit_card', 'other'));
            
            RAISE NOTICE 'Columna method agregada a la tabla payments';
        ELSE
            RAISE NOTICE 'Columna method ya existe en la tabla payments';
        END IF;
        
        -- Actualizar constraint de status para incluir nuevos valores
        ALTER TABLE public.payments 
        DROP CONSTRAINT IF EXISTS payments_status_check;
        
        ALTER TABLE public.payments 
        ADD CONSTRAINT payments_status_check 
        CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'paid', 'overdue'));
        
        RAISE NOTICE 'Constraint de status actualizado en la tabla payments';
        
    ELSE
        RAISE NOTICE 'Tabla payments no existe, creándola...';
        
        -- Crear tabla payments completa
        CREATE TABLE IF NOT EXISTS public.payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
            supplier_id UUID NOT NULL,
            supplier_name TEXT,
            invoice_number TEXT,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            currency TEXT DEFAULT 'MXN',
            payment_date DATE NOT NULL,
            due_date DATE,
            payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'check', 'card', 'bank_transfer', 'credit_card', 'other')),
            method TEXT CHECK (method IN ('cash', 'transfer', 'check', 'card', 'bank_transfer', 'credit_card', 'other')),
            reference TEXT,
            reference_number TEXT,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'paid', 'overdue')),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID
        );
        
        RAISE NOTICE 'Tabla payments creada exitosamente';
    END IF;
END $$;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_payments_organization_id ON public.payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON public.payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- Verificar estructura final
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'payments' 
ORDER BY ordinal_position;

