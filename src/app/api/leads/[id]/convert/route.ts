// src/app/api/leads/[id]/convert/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_CONVERT_STATUSES = ['qualified', 'appointment'] as const

/**
 * POST /api/leads/:id/convert
 * Convertir un lead a cliente (solo status qualified o appointment).
 *
 * Body (opcional):
 * - additional_notes?: string
 * - override_name?: string
 * - override_email?: string
 * - vehicle?: { brand: string; model: string; year: number; plate: string; vin?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    const organizationId = userData.organization_id
    const leadId = params.id

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json(
        { error: 'Lead no encontrado' },
        { status: 404 }
      )
    }

    // Lead ya convertido → 400
    if (lead.status === 'converted') {
      return NextResponse.json(
        {
          error: 'Este lead ya fue convertido a cliente',
          customer_id: lead.customer_id
        },
        { status: 400 }
      )
    }

    // Solo qualified o appointment pueden convertirse
    if (!ALLOWED_CONVERT_STATUSES.includes(lead.status as typeof ALLOWED_CONVERT_STATUSES[number])) {
      return NextResponse.json(
        {
          error: 'Solo se pueden convertir leads en estado "Calificado" o "Cita agendada"',
          current_status: lead.status
        },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const {
      additional_notes,
      override_name,
      override_email,
      vehicle: vehicleInput
    } = body

    // Validar vehículo si se envía
    if (vehicleInput) {
      const { brand, model, year, plate } = vehicleInput
      if (!brand || !model || year == null || !plate) {
        return NextResponse.json(
          { error: 'Vehículo inválido: se requieren marca, modelo, año y placas' },
          { status: 400 }
        )
      }
      const y = Number(year)
      if (Number.isNaN(y) || y < 1950 || y > 2027) {
        return NextResponse.json(
          { error: 'Año del vehículo debe estar entre 1950 y 2027' },
          { status: 400 }
        )
      }
    }

    // Preparar datos del cliente
    const customerName = override_name || lead.name
    const customerEmail = override_email || lead.email
    const customerNotes = additional_notes
      ? `${lead.notes || ''}\n\n[Convertido desde lead]\n${additional_notes}`
      : lead.notes

    // Verificar si ya existe un cliente con este teléfono
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('phone', lead.phone)
      .single()

    let customerId: string

    if (existingCustomer) {
      // Cliente ya existe, solo vincular
      console.log('[Leads API] Cliente ya existe, vinculando:', existingCustomer.id)
      customerId = existingCustomer.id

      await supabase
        .from('customers')
        .update({
          lead_id: leadId,
          from_lead: true,
          converted_from_whatsapp: lead.lead_source === 'whatsapp' || lead.lead_source === 'whatsapp_inbound',
          notes: customerNotes
        })
        .eq('id', customerId)
    } else {
      // Crear nuevo cliente
      console.log('[Leads API] Creando nuevo cliente desde lead')

      const { data: newCustomer, error: createError } = await supabase
        .from('customers')
        .insert({
          organization_id: organizationId,
          name: customerName,
          phone: lead.phone,
          email: customerEmail,
          company: lead.company,
          lead_id: leadId,
          from_lead: true,
          converted_from_whatsapp: lead.lead_source === 'whatsapp' || lead.lead_source === 'whatsapp_inbound',
          notes: customerNotes
        })
        .select('id')
        .single()

      if (createError) {
        console.error('[Leads API] Error creando cliente:', createError)
        return NextResponse.json(
          { error: 'Error creando cliente', details: createError.message },
          { status: 500 }
        )
      }

      customerId = newCustomer.id
      console.log('[Leads API] Cliente creado exitosamente:', customerId)
    }

    // Actualizar lead a convertido
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update({
        status: 'converted',
        customer_id: customerId,
        converted_at: new Date().toISOString()
      })
      .eq('id', leadId)
      .select(`
        *,
        customer:customers!leads_customer_id_fkey(id, name, phone, email)
      `)
      .single()

    if (updateError) {
      console.error('[Leads API] Error actualizando lead:', updateError)
      return NextResponse.json(
        { error: 'Error actualizando lead', details: updateError.message },
        { status: 500 }
      )
    }

    // Crear vehículo opcional
    let createdVehicle: {
      id: string
      brand: string
      model: string
      year: number
      license_plate: string
      vin?: string
    } | null = null

    if (vehicleInput && customerId) {
      const { brand, model, year, plate, vin } = vehicleInput
      const y = Number(year)
      const { data: newVehicle, error: vehicleError } = await supabase
        .from('vehicles')
        .insert({
          customer_id: customerId,
          brand: String(brand).trim(),
          model: String(model).trim(),
          year: y,
          license_plate: String(plate).trim(),
          vin: vin ? String(vin).trim() : null
        })
        .select('id, brand, model, year, license_plate, vin')
        .single()

      if (vehicleError) {
        console.error('[Leads API] Error creando vehículo:', vehicleError)
        return NextResponse.json(
          { error: 'Error creando vehículo', details: vehicleError.message },
          { status: 400 }
        )
      }
      createdVehicle = newVehicle
    }

    // Actualizar conversación de WhatsApp: vincular customer_id y mantener lead_id
    if (lead.whatsapp_conversation_id) {
      await supabase
        .from('whatsapp_conversations')
        .update({
          customer_id: customerId,
          lead_status: 'converted',
          lead_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.whatsapp_conversation_id)
    }

    return NextResponse.json({
      success: true,
      data: {
        lead: updatedLead,
        customer_id: customerId,
        vehicle: createdVehicle ?? undefined
      },
      message: 'Lead convertido a cliente exitosamente'
    }, { status: 200 })

  } catch (error: any) {
    console.error('[Leads API] Error inesperado:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    )
  }
}
