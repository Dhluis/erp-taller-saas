import { NextRequest, NextResponse } from 'next/server';
/**
 * Migration: Financial Transactions + Cash Accounts extension
 * POST /api/migrations/financial-transactions
 */
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = getSupabaseServiceClient() as any

    // 1. Create financial_transactions table
    const createTableSQL = `
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
    `

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_ft_org_date ON financial_transactions(organization_id, transaction_date DESC);
      CREATE INDEX IF NOT EXISTS idx_ft_org_type ON financial_transactions(organization_id, transaction_type);
      CREATE INDEX IF NOT EXISTS idx_ft_org_cat ON financial_transactions(organization_id, category);
    `

    // 2. Extend cash_accounts for bank/card support
    const extendCashAccounts = `
      ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS bank_name TEXT;
      ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS last_four_digits TEXT;
      ALTER TABLE cash_accounts ADD COLUMN IF NOT EXISTS card_brand TEXT;
    `

    // 3. Update account_type constraint to include 'card'
    const updateConstraint = `
      DO $$ 
      BEGIN
        -- Drop old constraint if exists
        ALTER TABLE cash_accounts DROP CONSTRAINT IF EXISTS cash_accounts_account_type_check;
        -- Add new constraint with 'card' type
        ALTER TABLE cash_accounts ADD CONSTRAINT cash_accounts_account_type_check 
          CHECK (account_type IN ('cash', 'bank', 'card'));
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Constraint update skipped: %', SQLERRM;
      END $$;
    `

    // 4. Enable RLS on financial_transactions
    const enableRLS = `
      ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
      
      DO $$
      BEGIN
        CREATE POLICY "financial_transactions_org_policy" 
          ON financial_transactions 
          FOR ALL 
          USING (true)
          WITH CHECK (true);
      EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Policy already exists';
      END $$;
    `

    const steps = [
      { name: 'Create financial_transactions table', sql: createTableSQL },
      { name: 'Create indexes', sql: createIndexes },
      { name: 'Extend cash_accounts columns', sql: extendCashAccounts },
      { name: 'Update account_type constraint', sql: updateConstraint },
      { name: 'Enable RLS', sql: enableRLS },
    ]

    const results: { step: string; success: boolean; error?: string }[] = []

    for (const step of steps) {
      try {
        // Try with 'sql' param first, then 'query'
        const { error } = await supabase.rpc('exec_sql', { sql: step.sql })
        if (error) {
          // Try alternate param name
          const { error: error2 } = await supabase.rpc('exec_sql', { query: step.sql })
          if (error2) {
            results.push({ step: step.name, success: false, error: error2.message })
          } else {
            results.push({ step: step.name, success: true })
          }
        } else {
          results.push({ step: step.name, success: true })
        }
      } catch (err: any) {
        results.push({ step: step.name, success: false, error: err.message })
      }
    }

    const allSuccess = results.every(r => r.success)

    return NextResponse.json({
      success: allSuccess,
      message: allSuccess ? 'Migration completed successfully' : 'Some steps failed',
      results
    })
  } catch (error: any) {
    console.error('[Migration] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
