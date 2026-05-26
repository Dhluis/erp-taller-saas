import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { checkAIAgentEnabled } from '@/lib/billing/check-limits'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'work-order-documents'
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) throw new Error('OPENAI_API_KEY no está configurada')
  return new OpenAI({ apiKey: apiKey.trim() })
}

export interface OrderItemForComparison {
  id: string
  product_name: string
  quantity: number
  quantity_received: number
  unit_cost: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params

  try {
    // 1. Auth
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 })
    }

    // 2. Obtener organización
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single() as { data: { organization_id: string } | null; error: any }

    if (profileError || !userProfile?.organization_id) {
      return NextResponse.json(
        { error: 'No se pudo obtener la organización del usuario' },
        { status: 403 }
      )
    }

    const organizationId = userProfile.organization_id

    // 3. Premium gate
    const { allowed, error: limitError } = await checkAIAgentEnabled(organizationId)
    if (!allowed) {
      return NextResponse.json(
        {
          error: limitError?.message ?? 'Esta función requiere el plan Premium',
          upgrade_url: '/settings/billing',
          plan_required: 'premium',
        },
        { status: 403 }
      )
    }

    // 4. Verificar que la OC pertenece a la organización y obtener sus items
    const { data: order, error: orderError } = await (supabaseAdmin as any)
      .from('purchase_orders')
      .select(`
        id, order_number, status, organization_id,
        items:purchase_order_items (
          id, quantity, quantity_received, unit_cost,
          product:inventory ( id, name )
        )
      `)
      .eq('id', orderId)
      .eq('organization_id', organizationId)
      .single() as { data: any; error: any }

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada o no autorizada' }, { status: 404 })
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'La orden está cancelada' }, { status: 400 })
    }

    // 5. Parsear multipart
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Se requiere un archivo en el campo "file"' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 6. Subir a Storage
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `purchase-orders/${orderId}/${timestamp}_receipt_${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('[po-analyze-receipt] Upload error:', uploadError)
      return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 })
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath)
    const documentUrl = urlData.publicUrl

    // 7. Guardar URL del recibo en la OC
    await (supabaseAdmin as any)
      .from('purchase_orders')
      .update({ receipt_document_url: documentUrl, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('organization_id', organizationId)

    // 8. Preparar items de la OC para el contexto del prompt
    const orderItemsForComparison: OrderItemForComparison[] = (order.items ?? []).map((item: any) => ({
      id: item.id,
      product_name: item.product?.name ?? item.description ?? 'Sin nombre',
      quantity: item.quantity ?? 0,
      quantity_received: item.quantity_received ?? 0,
      unit_cost: item.unit_cost ?? 0,
    }))

    // 9. Si es PDF, omitir IA
    if (file.type === 'application/pdf') {
      return NextResponse.json({
        success: true,
        parts: [],
        order_items: orderItemsForComparison,
        document_url: documentUrl,
        supplier: null,
        date: null,
        ai_error: 'PDF guardado. La extracción automática solo está disponible para imágenes.',
      })
    }

    // 10. OpenAI vision con contexto de la OC
    const orderItemsContext = orderItemsForComparison
      .map(i => `- ${i.product_name}: ${i.quantity} unidades a $${i.unit_cost} c/u`)
      .join('\n')

    let parts: Array<{ description: string; quantity: number; unit_price: number; total: number }> = []
    let supplier: string | null = null
    let date: string | null = null
    let aiError: string | null = null

    try {
      const openai = getOpenAIClient()
      const base64Image = buffer.toString('base64')

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente especializado en verificar facturas y notas de refacciones automotrices en México. ' +
              'Extrae la lista de partes con cantidades y precios. ' +
              'Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  `Analiza esta factura/nota del proveedor. ` +
                  `La orden de compra incluye los siguientes productos:\n${orderItemsContext}\n\n` +
                  `Extrae TODAS las partes de la factura con descripción, cantidad, precio unitario y total. ` +
                  `También extrae el nombre del proveedor y la fecha si los hay. ` +
                  `Formato: { "supplier": string | null, "date": string | null, "parts": [{ "description": string, "quantity": number, "unit_price": number, "total": number }] }`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${file.type};base64,${base64Image}`,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0,
      })

      const content = completion.choices[0]?.message?.content?.trim() ?? ''
      const cleanContent = content
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      const parsed = JSON.parse(cleanContent)
      parts = Array.isArray(parsed.parts) ? parsed.parts : []
      supplier = parsed.supplier ?? null
      date = parsed.date ?? null
    } catch (err: any) {
      console.error('[po-analyze-receipt] OpenAI error:', err?.message)
      aiError = 'No se pudo extraer información automáticamente. El documento fue guardado.'
    }

    return NextResponse.json({
      success: true,
      parts,
      order_items: orderItemsForComparison,
      document_url: documentUrl,
      supplier,
      date,
      ...(aiError ? { ai_error: aiError } : {}),
    })
  } catch (err: any) {
    console.error('[po-analyze-receipt] Exception:', err)
    return NextResponse.json(
      { error: err?.message || 'Error al procesar el documento' },
      { status: 500 }
    )
  }
}
