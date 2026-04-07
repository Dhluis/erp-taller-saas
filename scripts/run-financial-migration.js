require('dotenv').config({ path: '.env.vercel' });
const { createClient } = require('@supabase/supabase-js');

async function runFinancialMigration() {
  try {
    console.log('🚀 Iniciando migración financiera...');
    
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    console.log('📍 Supabase URL:', supabaseUrl);
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Error: Variables de entorno de Supabase no configuradas');
      process.exit(1);
    }
    
    // Crear cliente Supabase con el Service Role Key (importante para DDL)
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const migrationSQL = `
      -- 1. Create financial_transactions table
      CREATE TABLE IF NOT EXISTS financial_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL,
        transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        reference_type TEXT,
        reference_id UUID,
        account_id UUID,
        transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_by UUID,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      -- 2. Create indexes
      CREATE INDEX IF NOT EXISTS idx_ft_org_date ON financial_transactions(organization_id, transaction_date DESC);
      CREATE INDEX IF NOT EXISTS idx_ft_org_type ON financial_transactions(organization_id, transaction_type);
      CREATE INDEX IF NOT EXISTS idx_ft_org_cat ON financial_transactions(organization_id, category);

      -- 3. Extend cash_accounts for bank/card support
      ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS bank_name TEXT;
      ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS last_four_digits TEXT;
      ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS card_brand TEXT;

      -- 4. Update account_type constraint
      DO $$ 
      BEGIN
        ALTER TABLE cash_accounts DROP CONSTRAINT IF EXISTS cash_accounts_account_type_check;
        ALTER TABLE cash_accounts ADD CONSTRAINT cash_accounts_account_type_check 
          CHECK (account_type IN ('cash', 'bank', 'card'));
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
      END $$;

      -- 5. Enable RLS
      ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
      
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'financial_transactions' 
          AND policyname = 'financial_transactions_org_policy'
        ) THEN
          CREATE POLICY "financial_transactions_org_policy" 
            ON financial_transactions 
            FOR ALL 
            USING (true)
            WITH CHECK (true);
        END IF;
      END $$;
    `;

    console.log('📄 Ejecutando migración SQL...');
    
    // Intentar con 'sql' o 'query' según lo que espere el RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.log('⚠️ Reintentando con parámetro "query"...');
      const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { query: migrationSQL });
      if (error2) {
        console.error('❌ Error ejecutando migración:', error2);
        process.exit(1);
      }
    }
    
    console.log('✅ Migración ejecutada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  }
}

runFinancialMigration();
