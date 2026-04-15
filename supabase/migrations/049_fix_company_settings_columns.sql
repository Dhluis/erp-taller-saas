-- =====================================================
-- Migración 049: Añadir columnas faltantes a company_settings
-- Corrige el error: "Could not find the 'signature_url' column"
-- Idempotente: usa ADD COLUMN IF NOT EXISTS y bloques DO.
-- =====================================================

-- 1. Añadir columnas nuevas que el frontend requiere
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS terms_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_terms TEXT,
ADD COLUMN IF NOT EXISTS appointment_defaults JSONB DEFAULT '{}'::jsonb;

-- 2. Asegurar columnas con los nombres correctos que espera el código
DO $$ 
BEGIN
    -- tax_rate
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'tax_rate'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 16.00;
    END IF;
    
    -- company_name (puede estar como 'name' en instalaciones antiguas)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'company_name'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'name'
        ) THEN
            ALTER TABLE public.company_settings RENAME COLUMN name TO company_name;
        ELSE
            ALTER TABLE public.company_settings ADD COLUMN company_name TEXT NOT NULL DEFAULT 'Mi Empresa';
        END IF;
    END IF;

    -- tax_id (puede estar como 'rfc' en instalaciones antiguas)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'tax_id'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'rfc'
        ) THEN
            ALTER TABLE public.company_settings RENAME COLUMN rfc TO tax_id;
        ELSE
            ALTER TABLE public.company_settings ADD COLUMN tax_id TEXT;
        END IF;
    END IF;

    -- logo_url (puede estar como 'logo' en instalaciones antiguas)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'logo_url'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'logo'
        ) THEN
            ALTER TABLE public.company_settings RENAME COLUMN logo TO logo_url;
        ELSE
            ALTER TABLE public.company_settings ADD COLUMN logo_url TEXT;
        END IF;
    END IF;

    -- working_hours (campo JSONB para horarios)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'working_hours'
    ) THEN
        ALTER TABLE public.company_settings ADD COLUMN working_hours JSONB NOT NULL DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. Recargar la caché del esquema de PostgREST
NOTIFY pgrst, 'reload schema';

COMMENT ON TABLE public.company_settings IS 'Configuración general de la empresa/organización. Actualizado en 049.';
