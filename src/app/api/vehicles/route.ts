import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: vehicles, error } = await supabase
      .from('vehicles')
      .select(`
        *,
        customer:customers!customer_id (
          id,
          name,
          email,
          phone
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({ success: true, data: vehicles })
  } catch (error: any) {
    console.error('❌ API Error fetching vehicles:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}