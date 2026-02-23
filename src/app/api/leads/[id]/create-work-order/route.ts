// src/app/api/leads/[id]/create-work-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createWorkOrder } from '@/lib/database/queries/work-orders'

/**
 * POST /api/leads/:id/create-work-order
 *
 * Convierte un lead a cliente Y crea una Orden de Trabajo en un solo paso.
 * El lead se convierte en cliente REAL solo cuando hay una OT (auto llegó al taller).
 *
 * Body:
 *   vehicle: { brand, model, year, plate, vin? }  ← requerido
 *   description: string                            ← requerido (mín 10 chars)
 *   estimated_completion?: string                  ← ISO datetime, opcional
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: userData, error: userError } = await db
      .from('users')
      .select('organization_id, workshop_id, id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const organizationId = userData.organization_id
    const workshopId = userData.workshop_id ?? null
    const { id: leadId } = await params

    // 1. Cargar lead
    const { data: lead, error: leadError } = await db
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    }

    if (lead.status === 'converted') {
      return NextResponse.json(
        { error: 'Este lead ya fue convertido a cliente', customer_id: lead.customer_id },
        { status: 400 }
      )
    }

    if (lead.status === 'lost') {
      return NextResponse.json(
        { error: 'No se puede crear una OT para un lead perdido' },
        { status: 400 }
      )
    }

    // 2. Validar body
    const body = await request.json().catch(() => ({}))
    const { vehicle: vehicleInput, description, estimated_completion } = body

    if (!vehicleInput) {
      return NextResponse.json({ error: 'Se requieren los datos del vehículo' }, { status: 400 })
    }

    const { brand, model, year, plate, vin } = vehicleInput
    if (!brand || !model || year == null || !plate) {
      return NextResponse.json(
        { error: 'Vehículo inválido: se requieren marca, modelo, año y placas' },
        { status: 400 }
      )
    }

    const yearNum = Number(year)
    if (Number.isNaN(yearNum) || yearNum < 1950 || yearNum > 2030) {
      return NextResponse.json(
        { error: 'Año del vehículo debe estar entre 1950 y 2030' },
        { status: 400 }
      )
    }

    if (!description || String(description).trim().length < 10) {
      return NextResponse.json(
        { error: 'La descripción del trabajo debe tener al menos 10 caracteres' },
        { status: 400 }
      )
    }

    // 3. Buscar o crear cliente por teléfono
    const { data: existingCustomer } = await db
      .from('customers')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('phone', lead.phone)
      .single()

    let customerId: string

    if (existingCustomer) {
      customerId = existingCustomer.id
      await db
        .from('customers')
        .update({
          lead_id: leadId,
          from_lead: true,
          converted_from_whatsapp: lead.lead_source === 'whatsapp' || lead.lead_source === 'whatsapp_inbound',
        })
        .eq('id', customerId)
    } else {
      const { data: newCustomer, error: createCustomerError } = await db
        .from('customers')
        .insert({
          organization_id: organizationId,
          name: lead.name,
          phone: lead.phone,
          email: lead.email || null,
          company: lead.company || null,
          lead_id: leadId,
          from_lead: true,
          converted_from_whatsapp: lead.lead_source === 'whatsapp' || lead.lead_source === 'whatsapp_inbound',
          notes: lead.notes || null,
        })
        .select('id')
        .single()

      if (createCustomerError || !newCustomer) {
        return NextResponse.json(
          { error: 'Error creando cliente', details: createCustomerError?.message },
          { status: 500 }
        )
      }
      customerId = newCustomer.id
    }

    // 4. Crear vehículo
    const { data: newVehicle, error: vehicleError } = await db
      .from('vehicles')
      .insert({
        customer_id: customerId,
        organization_id: organizationId,
        brand,
        model,
        year: yearNum,
        license_plate: plate,
        ...(vin ? { vin } : {}),
      })
      .select('id')
      .single()

    if (vehicleError || !newVehicle) {
      return NextResponse.json(
        { error: 'Error creando vehículo', details: vehicleError?.message },
        { status: 500 }
      )
    }

    const vehicleId = newVehicle.id

    // 5. Crear Orden de Trabajo usando la función compartida
    const workOrder = await createWorkOrder(
      {
        organization_id: organizationId,
        workshop_id: workshopId,
        customer_id: customerId,
        vehicle_id: vehicleId,
        description: String(description).trim(),
        status: 'pending',
        ...(estimated_completion ? { estimated_completion } : {}),
      },
      db
    )

    if (!workOrder) {
      return NextResponse.json({ error: 'Error creando orden de trabajo' }, { status: 500 })
    }

    // 6. Actualizar lead → converted
    await db
      .from('leads')
      .update({
        status: 'converted',
        customer_id: customerId,
        converted_at: new Date().toISOString(),
      })
      .eq('id', leadId)

    // 7. Actualizar conversación WhatsApp si existe
    if (lead.whatsapp_conversation_id) {
      await db
        .from('whatsapp_conversations')
        .update({
          customer_id: customerId,
          lead_status: 'converted',
          lead_updated_at: new Date().toISOString(),
        })
        .eq('id', lead.whatsapp_conversation_id)
    }

    const orderNumber = (workOrder as any).order_number as string
    return NextResponse.json({
      success: true,
      data: {
        work_order_id: workOrder.id,
        order_number: orderNumber,
        customer_id: customerId,
        vehicle_id: vehicleId,
      },
      message: `OT ${orderNumber} creada — lead convertido a cliente`,
    }, { status: 201 })

  } catch (error: any) {
    console.error('[POST /api/leads/[id]/create-work-order] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error inesperado' },
      { status: 500 }
    )
  }
}
