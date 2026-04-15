const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function fixSchema() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Variables de entorno de Supabase no encontradas en .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  const sql = `
-- Reparación de la tabla company_settings
-- Añade columnas faltantes requeridas por el frontend actual

ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS signature_url TEXT,
ADD COLUMN IF NOT EXISTS terms_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_terms TEXT,
ADD COLUMN IF NOT EXISTS appointment_defaults JSONB DEFAULT '{}'::jsonb;

-- Asegurar que las columnas existan con los nombres correctos
DO $$ 
BEGIN
    -- Tax Rate
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'tax_rate') THEN
        ALTER TABLE public.company_settings ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 16.00 NOT NULL;
    END IF;
    
    -- Company Name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'company_name') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'name') THEN
            ALTER TABLE public.company_settings RENAME COLUMN name TO company_name;
        ELSE
            ALTER TABLE public.company_settings ADD COLUMN company_name TEXT NOT NULL DEFAULT 'Mi Empresa';
        END IF;
    END IF;

    -- Tax ID (RFC)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'tax_id') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'rfc') THEN
            ALTER TABLE public.company_settings RENAME COLUMN rfc TO tax_id;
        ELSE
            ALTER TABLE public.company_settings ADD COLUMN tax_id TEXT;
        END IF;
    END IF;

    -- Logo URL
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'logo_url') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'company_settings' AND column_name = 'logo') THEN
            ALTER TABLE public.company_settings RENAME COLUMN logo TO logo_url;
        ELSE
            ALTER TABLE public.company_settings ADD COLUMN logo_url TEXT;
        END IF;
    END IF;
END $$;

-- Recargar la caché del esquema
NOTIFY pgrst, 'reload schema';
  `

  console.log('🚀 Ejecutando fix de esquema en Supabase...')
  const { data, error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    console.error('❌ Error ejecutando el SQL:', error)
    process.exit(1)
  }

  console.log('✅ Esquema actualizado exitosamente!')
  console.log('📊 Resultado:', data)
}

fixSchema()
