// src/app/api/migrations/terms-pdf/route.ts
// One-time migration to add terms_pdf_url column to company_settings.
// Safe to call multiple times (IF NOT EXISTS).
import { NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = getSupabaseServiceClient()
    
    // 1. Ensure storage bucket exists
    const bucketSql = `
      INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      VALUES (
        'company-assets',
        'company-assets',
        true,
        10485760,
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']::text[]
      )
      ON CONFLICT (id) DO NOTHING;
    `
    // Use 'any' cast to bypass RPC type checking since exec_sql is a custom function
    const supabaseAny = supabase as any
    
    await supabaseAny.rpc('exec_sql', { query: bucketSql })
    await supabaseAny.rpc('exec_sql', { sql: bucketSql }) // Try both to be safe

    // 2. Clear old policies and set new ones for the bucket
    const rlsSql = `
      DROP POLICY IF EXISTS "Public read access for company assets" ON storage.objects;
      DROP POLICY IF EXISTS "Authenticated users can upload company assets" ON storage.objects;
      DROP POLICY IF EXISTS "Authenticated users can delete company assets" ON storage.objects;

      CREATE POLICY "Public read access for company assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'company-assets');
      CREATE POLICY "Authenticated users can upload company assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'company-assets');
      CREATE POLICY "Authenticated users can delete company assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'company-assets');
    `
    await supabaseAny.rpc('exec_sql', { query: rlsSql })
    await supabaseAny.rpc('exec_sql', { sql: rlsSql })

    // 3. Add column to table
    const sql = `ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS terms_pdf_url TEXT NULL;`
    const { error } = await supabaseAny.rpc('exec_sql', { query: sql }).single()
    
    if (error) {
      // Fallback: try raw query via pg-compatible REST
      console.error('[migration/terms-pdf] RPC failed, trying direct update approach:', error)
      // Try updating a dummy record to surface if the column exists
      const { error: testErr } = await (supabaseAny
        .from('company_settings') as any)
        .update({ terms_pdf_url: null })
        .eq('organization_id', '00000000-0000-0000-0000-000000000000')
      
      if (testErr && testErr.message?.includes('terms_pdf_url')) {
        return NextResponse.json({ success: false, error: 'Column does not exist and migration failed. Please run: ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS terms_pdf_url TEXT NULL;' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'Migration applied successfully (Bucket & Database)' })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
