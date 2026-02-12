#!/usr/bin/env node
/**
 * Ejecuta la migración 039 (mercadopago_payment_id) contra la base Supabase.
 * Requiere DATABASE_URL en .env.local (Supabase Dashboard → Project Settings → Database → Connection string).
 */
const path = require('path')
const fs = require('fs')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const sql = `
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS mercadopago_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_organizations_mp_payment
  ON public.organizations(mercadopago_payment_id)
  WHERE mercadopago_payment_id IS NOT NULL;

COMMENT ON COLUMN public.organizations.mercadopago_payment_id IS 'ID del pago en MercadoPago para tracking';
`

async function run() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl || !databaseUrl.startsWith('postgres')) {
    console.error('❌ Falta DATABASE_URL en .env.local')
    console.log('Obtén la connection string en: Supabase Dashboard → Project Settings → Database → Connection string (URI)')
    console.log('Agrégala a .env.local: DATABASE_URL=postgresql://postgres.[ref]:[PASSWORD]@...')
    process.exit(1)
  }

  let pg
  try {
    pg = require('pg')
  } catch (e) {
    console.error('❌ Instala pg: npm install pg --save-dev')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    console.log('📄 Ejecutando migración 039 (mercadopago_payment_id)...')
    await client.query(sql)
    console.log('✅ Migración 039 aplicada.')

    const { rows } = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'organizations' AND column_name = 'mercadopago_payment_id'
    `)
    if (rows.length) {
      console.log('📋 Columna verificada:', rows[0])
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
