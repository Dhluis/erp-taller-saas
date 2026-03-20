import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id
    let supabase
    try {
      supabase = getSupabaseServiceClient()
    } catch (e: any) {
      console.error('❌ [API Public Order] Error initializing Supabase Service Role client:', e.message)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuración de servidor incompleta', 
          message: 'Falta SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de producción (Vercel).' 
        },
        { status: 500 }
      )
    }

    // Obtener la orden de trabajo con datos limitados para el cliente público
    // Simplificamos la query para evitar errores de columnas inexistentes
    const { data, error: orderError } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(*),
        vehicle:vehicles(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    const order = data as any

    if (orderError || !order) {
      console.error('❌ [API Public Order] Error fetching order:', orderError)
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada', details: orderError },
        { status: 404 }
      )
    }

    // Obtener la configuración de la empresa (logo, nombre)
    const { data: companySettings } = order.organization_id ? await supabase
      .from('company_settings')
      .select('company_name, logo_url')
      .eq('organization_id', order.organization_id)
      .single() : { data: null };

    // Obtener notas marcadas como 'customer' o 'general'
    const { data: notesRaw, error: notesError } = await supabase
      .from('work_orders')
      .select('notes')
      .eq('id', id)
      .single()

    if (notesError) {
      console.error('❌ [API Public Order] Error fetching notes:', notesError)
    }

    const notesData = notesRaw as any
    const rawNotes = notesData?.notes
    const publicNotes = (Array.isArray(rawNotes) ? rawNotes : [])
      .filter((n: any) => n && (n.category === 'customer' || n.category === 'general'))
      .map((n: any) => ({
        id: n.id || crypto.randomUUID(),
        text: n.text || '',
        createdAt: n.createdAt || n.created_at || new Date().toISOString(),
        category: n.category || 'general'
      }))

    // Manejar casos donde customer o vehicle vengan como arrays (común en joins de Supabase)
    const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer
    const vehicle = Array.isArray(order.vehicle) ? order.vehicle[0] : order.vehicle

    const publicOrder = {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      milestone: order.status, // Usa el estatus real del Kanban
      description: order.description,
      estimated_completion: order.estimated_completion,
      created_at: order.created_at,
      updated_at: order.updated_at || order.created_at,
      vehicle: vehicle,
      assigned_to: order.assigned_to,
      images: order.images || [],
      customer_name: (customer as any)?.name || 'Cliente',
      notes: publicNotes,
      company: companySettings || { company_name: null, logo_url: null }
    }

    return NextResponse.json({ success: true, data: publicOrder })
  } catch (error: any) {
    console.error('❌ [API Public Order] Critical Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno', message: error.message },
      { status: 500 }
    )
  }
}
