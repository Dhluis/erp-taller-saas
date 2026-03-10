import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 1. Get one lead to see its columns
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .limit(1)
      .maybeSingle()
    
    if (leadError) {
      return NextResponse.json({ error: 'Error fetching lead', details: leadError }, { status: 500 })
    }

    // 2. Try several join variations to see which one (if any) works
    const testJoins = [
      '*, assigned_user:users(id, full_name, email)',
      '*, assigned_user:profiles(id, full_name, email)',
      '*, assigned_user:system_users(id, full_name, email)',
      '*, assigned_to_user:users!leads_assigned_to_fkey(id, full_name, email)',
    ]
    
    const joinResults = await Promise.all(testJoins.map(async (join) => {
      const { data, error } = await supabase
        .from('leads')
        .select(join)
        .limit(1)
      return { join, success: !error, error: error?.message }
    }))

    return NextResponse.json({
      leadColumns: lead ? Object.keys(lead) : 'No leads found',
      joinResults
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
