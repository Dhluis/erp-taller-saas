/**
 * API: Gastos (egresos operativos)
 * GET /api/expenses - Listar
 * POST /api/expenses - Crear
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { getExpenses, getExpensesStats, createExpense, type CreateExpenseData } from '@/lib/database/queries/expenses'
import { isSupabaseTableMissingError, MIGRATION_045_MESSAGE } from '@/lib/supabase/table-missing'
import { z } from 'zod'

async function getOrg(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'No autorizado', status: 401 as const }
  const admin = getSupabaseServiceClient()
  const { data: profile } = await admin.from('users').select('id, organization_id').eq('auth_user_id', user.id).single()
  if (!profile?.organization_id) return { error: 'Organización no encontrada', status: 403 as const }
  return { organizationId: profile.organization_id, userId: profile.id }
}

const createSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1),
  expense_date: z.string().optional(),
  description: z.string().optional().nullable(),
  reference_type: z.string().optional().nullable(),
  reference_id: z.string().uuid().optional().nullable(),
  cash_account_id: z.string().uuid().optional().nullable(),
  payment_method: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const category = request.nextUrl.searchParams.get('category') || undefined
    const from = request.nextUrl.searchParams.get('from') || undefined
    const to = request.nextUrl.searchParams.get('to') || undefined
    const cash_account_id = request.nextUrl.searchParams.get('cash_account_id') || undefined
    const list = await getExpenses(org.organizationId, { category, from, to, cash_account_id })
    const stats = await getExpensesStats(org.organizationId, from, to)
    return NextResponse.json({ success: true, data: list, stats })
  } catch (e) {
    if (isSupabaseTableMissingError(e)) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          stats: { total: 0, by_category: {}, count: 0 },
          migrationRequired: true,
          message: MIGRATION_045_MESSAGE
        },
        { status: 200 }
      )
    }
    console.error('GET /api/expenses:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrg(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors.map(e => e.message).join(', ') },
        { status: 400 }
      )
    }
    const data: CreateExpenseData = {
      amount: parsed.data.amount,
      category: parsed.data.category,
      expense_date: parsed.data.expense_date,
      description: parsed.data.description ?? undefined,
      reference_type: parsed.data.reference_type ?? undefined,
      reference_id: parsed.data.reference_id ?? undefined,
      cash_account_id: parsed.data.cash_account_id ?? undefined,
      payment_method: parsed.data.payment_method
    }
    const expense = await createExpense(org.organizationId, data, org.userId)
    return NextResponse.json({ success: true, data: expense })
  } catch (e) {
    if (isSupabaseTableMissingError(e)) {
      return NextResponse.json(
        {
          success: false,
          error: MIGRATION_045_MESSAGE,
          code: 'MIGRATION_REQUIRED',
          migration: '045'
        },
        { status: 503 }
      )
    }
    console.error('POST /api/expenses:', e)
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
