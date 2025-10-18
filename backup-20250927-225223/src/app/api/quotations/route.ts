import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/quotations - Listar cotizaciones
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: quotations, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          name,
          email
        ),
        vehicles (
          brand,
          model,
          year,
          license_plate
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching quotations:', error)
      return NextResponse.json(
        { error: 'Error al obtener cotizaciones' },
        { status: 500 }
      )
    }

    return NextResponse.json(quotations || [])
  } catch (error) {
    console.error('Error in GET /api/quotations:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/quotations - Crear nueva cotización
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validar datos requeridos
    const { client_id, vehicle_id, items } = body
    if (!client_id || !vehicle_id || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el cliente y vehículo existen
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', client_id)
      .single()

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id')
      .eq('id', vehicle_id)
      .single()

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      )
    }

    // Generar número de cotización
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    
    // Obtener el siguiente número secuencial
    const { data: lastQuotation, error: lastError } = await supabase
      .from('quotations')
      .select('quotation_number')
      .like('quotation_number', `COT-${year}${month}-%`)
      .order('quotation_number', { ascending: false })
      .limit(1)

    let nextNumber = 1
    if (lastQuotation && lastQuotation.length > 0) {
      const lastNumber = parseInt(lastQuotation[0].quotation_number.split('-')[2])
      nextNumber = lastNumber + 1
    }

    const quotationNumber = `COT-${year}${month}-${String(nextNumber).padStart(4, '0')}`

    // Crear la cotización
    const quotationData = {
      quotation_number: quotationNumber,
      client_id,
      vehicle_id,
      status: body.status || 'draft',
      valid_until: body.valid_until,
      payment_terms: body.payment_terms || '30 días',
      delivery_time: body.delivery_time || '5-7 días hábiles',
      subtotal: body.subtotal || 0,
      discount_amount: body.discount_amount || 0,
      tax_amount: body.tax_amount || 0,
      total: body.total || 0,
      terms_conditions: body.terms_conditions || '',
      notes: body.notes || ''
    }

    const { data: newQuotation, error: createError } = await supabase
      .from('quotations')
      .insert(quotationData)
      .select()
      .single()

    if (createError) {
      console.error('Error creating quotation:', createError)
      return NextResponse.json(
        { error: 'Error al crear cotización' },
        { status: 500 }
      )
    }

    // Crear los items de la cotización
    if (items && items.length > 0) {
      const quotationItems = items.map((item: any) => ({
        quotation_id: newQuotation.id,
        service_id: item.service_id || null,
        inventory_id: item.inventory_id || null,
        item_type: item.item_type,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        discount_amount: item.discount_amount || 0,
        tax_percent: item.tax_percent || 16,
        subtotal: item.subtotal || 0,
        tax_amount: item.tax_amount || 0,
        total: item.total || 0
      }))

      const { error: itemsError } = await supabase
        .from('quotation_items')
        .insert(quotationItems)

      if (itemsError) {
        console.error('Error creating quotation items:', itemsError)
        // No fallar la operación, solo loggear el error
      }
    }

    return NextResponse.json(newQuotation, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/quotations:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

