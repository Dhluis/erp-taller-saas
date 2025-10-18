import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/quotations/[id] - Obtener cotización por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const quotationId = params.id

    const { data: quotation, error } = await supabase
      .from('quotations')
      .select(`
        *,
        customers (
          name,
          email,
          phone,
          address
        ),
        vehicles (
          brand,
          model,
          year,
          license_plate,
          vin,
          color
        ),
        quotation_items (
          *
        )
      `)
      .eq('id', quotationId)
      .single()

    if (error || !quotation) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json(quotation)
  } catch (error) {
    console.error('Error in GET /api/quotations/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/quotations/[id] - Actualizar cotización
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const quotationId = params.id
    const body = await request.json()

    // Verificar que la cotización existe
    const { data: existingQuotation, error: quotationError } = await supabase
      .from('quotations')
      .select('id')
      .eq('id', quotationId)
      .single()

    if (quotationError || !existingQuotation) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar la cotización
    const { data: updatedQuotation, error: updateError } = await supabase
      .from('quotations')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', quotationId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating quotation:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar cotización' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedQuotation)
  } catch (error) {
    console.error('Error in PATCH /api/quotations/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/quotations/[id] - Eliminar cotización
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const quotationId = params.id

    // Verificar que la cotización existe
    const { data: existingQuotation, error: quotationError } = await supabase
      .from('quotations')
      .select('id, status')
      .eq('id', quotationId)
      .single()

    if (quotationError || !existingQuotation) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // No permitir eliminar cotizaciones convertidas
    if (existingQuotation.status === 'converted') {
      return NextResponse.json(
        { error: 'No se puede eliminar una cotización convertida' },
        { status: 400 }
      )
    }

    // Eliminar items de la cotización primero
    const { error: itemsError } = await supabase
      .from('quotation_items')
      .delete()
      .eq('quotation_id', quotationId)

    if (itemsError) {
      console.error('Error deleting quotation items:', itemsError)
      // Continuar con la eliminación de la cotización
    }

    // Eliminar la cotización
    const { error: deleteError } = await supabase
      .from('quotations')
      .delete()
      .eq('id', quotationId)

    if (deleteError) {
      console.error('Error deleting quotation:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar cotización' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/quotations/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

