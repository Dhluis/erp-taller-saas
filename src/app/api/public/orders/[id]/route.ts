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

    // Obtener la orden de trabajo con datos del cliente y vehículo
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

    // ✅ NUEVO: Obtener items de servicio / cotización
    const { data: orderItemsRaw } = await supabase
      .from('order_items')
      .select('id, item_type, item_name, description, quantity, unit_price, total_price')
      .eq('work_order_id', id)
      .order('created_at', { ascending: true })

    // ✅ NUEVO: Obtener datos de inspección de entrada
    const { data: inspectionRaw } = await supabase
      .from('vehicle_inspections')
      .select('fuel_level, fluids_check, valuable_items, will_diagnose, authorize_test_drive, entry_reason, procedures')
      .eq('order_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Obtener la configuración de la empresa (logo, nombre, teléfono)
    const { data: companySettings } = order.organization_id ? await supabase
      .from('company_settings')
      .select('company_name, logo_url, phone, address, email')
      .eq('organization_id', order.organization_id)
      .single() : { data: null }

    // Obtener notas marcadas como 'customer' o 'general'
    const rawNotes = order?.notes
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
      milestone: order.status,
      description: order.description,
      diagnosis: order.diagnosis,                        // ✅ NUEVO
      estimated_completion: order.estimated_completion,
      created_at: order.created_at,
      updated_at: order.updated_at || order.created_at,
      entry_date: order.entry_date,                      // ✅ NUEVO
      vehicle: vehicle,
      assigned_to: order.assigned_to,
      images: order.images || [],
      customer_name: (customer as any)?.name || 'Cliente',
      notes: publicNotes,
      company: companySettings || { company_name: null, logo_url: null, phone: null, address: null, email: null },

      // ✅ NUEVO: Resumen financiero
      financial: {
        subtotal: order.subtotal || order.estimated_cost || null,
        tax_amount: order.tax_amount || null,
        discount_amount: order.discount_amount || null,
        total_amount: order.total_amount || order.final_cost || null,
        estimated_cost: order.estimated_cost || null,
      },

      customer_signature: order.customer_signature || null,
      terms_accepted: order.terms_accepted || false,
      terms_accepted_at: order.terms_accepted_at || null,
      terms_file_url: order.terms_file_url || null,

      // ✅ NUEVO: Items de servicio / cotización
      order_items: (orderItemsRaw || []).map((item: any) => ({
        id: item.id,
        item_type: item.item_type,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      })),

      // ✅ NUEVO: Inspección de entrada
      inspection: inspectionRaw ? {
        fuel_level: inspectionRaw.fuel_level,
        fluids_check: inspectionRaw.fluids_check,
        valuable_items: inspectionRaw.valuable_items,
        will_diagnose: inspectionRaw.will_diagnose,
        authorize_test_drive: inspectionRaw.authorize_test_drive,
        entry_reason: inspectionRaw.entry_reason,
      } : null,
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
