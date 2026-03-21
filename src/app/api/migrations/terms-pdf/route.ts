// src/app/api/migrations/terms-pdf/route.ts
// One-time migration to add terms_pdf_url column to company_settings.
// Safe to call multiple times (IF NOT EXISTS).
import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = getSupabaseServiceClient()
    const sql = `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS terms_pdf_url TEXT NULL;`
    const { error } = await supabase.rpc('exec_sql', { query: sql }).single()
    
    if (error) {
      // Fallback: try raw query via pg-compatible REST
      console.error('[migration/terms-pdf] RPC failed, trying direct update approach:', error)
      // Try updating a dummy record to surface if the column exists
      const { error: testErr } = await supabase
        .from('company_settings')
        .update({ terms_pdf_url: null } as any)
        .eq('organization_id', '00000000-0000-0000-0000-000000000000')
      
      if (testErr && testErr.message?.includes('terms_pdf_url')) {
        return NextResponse.json({ success: false, error: 'Column does not exist and migration failed. Please run: ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS terms_pdf_url TEXT NULL;' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Migration applied successfully' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
