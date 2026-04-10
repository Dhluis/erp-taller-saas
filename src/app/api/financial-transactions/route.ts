import { NextRequest, NextResponse } from 'next/server';
/**
 * API: Financial Transactions (Libro de Movimientos)
 * GET /api/financial-transactions — List with filters
 * POST /api/financial-transactions — Create transaction
 */
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'

async function getOrgId(request: NextRequest) {
  const supabase = createClientFromRequest(request)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { error: 'No autorizado', status: 401 as const }
  const admin = getSupabaseServiceClient()
  const { data: profile } = await admin
    .from('users')
    .select('id, organization_id')
    .eq('auth_user_id', user.id)
    .single()
  if (!profile?.organization_id) return { error: 'Sin organización', status: 403 as const }
  return { organizationId: profile.organization_id, userId: profile.id }
}

export async function GET(request: NextRequest) {
  try {
    const org = await getOrgId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const type = searchParams.get('type') // 'income' | 'expense' | null
    const category = searchParams.get('category')
    const accountId = searchParams.get('account_id')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const summary = searchParams.get('summary') // 'daily' for day summary
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)

    const admin = getSupabaseServiceClient()

    // Daily summary mode
    if (summary === 'daily') {
      const targetDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
      
      const { data: transactions, error } = await admin
        .from('financial_transactions')
        .select('*')
        .eq('organization_id', org.organizationId)
        .eq('transaction_date', targetDate)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[Financial Transactions] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }

      const items = transactions || []
      const totalIncome = items.filter(t => t.transaction_type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      const totalExpense = items.filter(t => t.transaction_type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

      // Group by category
      const byCategory: Record<string, { income: number; expense: number; count: number }> = {}
      items.forEach(t => {
        if (!byCategory[t.category]) byCategory[t.category] = { income: 0, expense: 0, count: 0 }
        byCategory[t.category].count++
        if (t.transaction_type === 'income') byCategory[t.category].income += Number(t.amount)
        else byCategory[t.category].expense += Number(t.amount)
      })

      // Group by account
      const byAccount: Record<string, { income: number; expense: number; count: number; name?: string }> = {}
      items.forEach(t => {
        const accId = t.account_id || 'sin_cuenta'
        if (!byAccount[accId]) byAccount[accId] = { income: 0, expense: 0, count: 0 }
        byAccount[accId].count++
        if (t.transaction_type === 'income') byAccount[accId].income += Number(t.amount)
        else byAccount[accId].expense += Number(t.amount)
      })

      return NextResponse.json({
        success: true,
        data: {
          date: targetDate,
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          transactionCount: items.length,
          byCategory,
          byAccount,
          transactions: items
        }
      })
    }

    // Normal list mode
    let query = admin
      .from('financial_transactions')
      .select('*')
      .eq('organization_id', org.organizationId)

    if (type) query = query.eq('transaction_type', type)
    if (category) query = query.eq('category', category)
    if (accountId) query = query.eq('account_id', accountId)
    
    if (dateFrom && dateTo) {
      query = query.gte('transaction_date', dateFrom).lte('transaction_date', dateTo)
    } else {
      query = query.eq('transaction_date', date)
    }

    query = query.order('created_at', { ascending: false }).limit(limit)

    const { data: transactions, error } = await query

    if (error) {
      console.error('[Financial Transactions] Error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: transactions || []
    })
  } catch (e: any) {
    console.error('[Financial Transactions] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const org = await getOrgId(request)
    if ('error' in org) return NextResponse.json({ success: false, error: org.error }, { status: org.status })

    const body = await request.json()
    const { transaction_type, category, description, amount, reference_type, reference_id, account_id, transaction_date } = body

    if (!transaction_type || !category || !description || !amount) {
      return NextResponse.json(
        { success: false, error: 'Campos requeridos: transaction_type, category, description, amount' },
        { status: 400 }
      )
    }

    if (!['income', 'expense'].includes(transaction_type)) {
      return NextResponse.json(
        { success: false, error: 'transaction_type debe ser "income" o "expense"' },
        { status: 400 }
      )
    }

    const admin = getSupabaseServiceClient()
    const { data, error } = await admin
      .from('financial_transactions')
      .insert({
        organization_id: org.organizationId,
        transaction_type,
        category,
        description,
        amount: Number(amount),
        reference_type: reference_type || null,
        reference_id: reference_id || null,
        account_id: account_id || null,
        transaction_date: transaction_date || new Date().toISOString().split('T')[0],
        created_by: org.userId,
      })
      .select()
      .single()

    if (error) {
      console.error('[Financial Transactions] Insert error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (e: any) {
    console.error('[Financial Transactions] Error:', e)
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
