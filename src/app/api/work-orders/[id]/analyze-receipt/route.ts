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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workOrderId } = await params

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

    // 4. Verificar que la OT pertenece a la organización
    const { data: order, error: orderError } = await supabaseAdmin
      .from('work_orders')
      .select('id, documents, organization_id')
      .eq('id', workOrderId)
      .eq('organization_id', organizationId)
      .single() as { data: { id: string; documents: any[] | null; organization_id: string } | null; error: any }

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Orden no encontrada o no autorizada' },
        { status: 404 }
      )
    }

    // 5. Parsear multipart
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Se requiere un archivo en el campo "file"' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Archivo demasiado grande. Máximo ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 6. Subir archivo a Storage
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${workOrderId}/${timestamp}_receipt_${safeName}`

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[analyze-receipt] Error subiendo archivo:', uploadError)
      return NextResponse.json(
        { error: `Error al subir archivo: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // 7. URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(storagePath)

    const documentUrl = urlData.publicUrl

    // 8. Guardar en JSONB documents de la OT
    const newDoc = {
      id: crypto.randomUUID(),
      name: file.name,
      url: documentUrl,
      type: file.type,
      category: 'receipt' as const,
      size: file.size,
      uploaded_by: user.id,
      uploaded_at: new Date().toISOString(),
    }

    const currentDocuments = (order.documents as any[]) || []
    await (supabaseAdmin as any)
      .from('work_orders')
      .update({
        documents: [...currentDocuments, newDoc],
        updated_at: new Date().toISOString(),
      })
      .eq('id', workOrderId)
      .eq('organization_id', organizationId)

    // 9. PDFs: guardar pero no analizar con visión
    if (file.type === 'application/pdf') {
      return NextResponse.json({
        success: true,
        parts: [],
        document_url: documentUrl,
        supplier: null,
        date: null,
        ai_error: 'PDF guardado. La extracción automática solo está disponible para imágenes.',
      })
    }

    // 10. Convertir a base64 para OpenAI vision
    const base64Image = buffer.toString('base64')

    // 11. Llamar OpenAI GPT-4o vision
    let parts: Array<{ description: string; quantity: number; unit_price: number; total: number }> = []
    let supplier: string | null = null
    let date: string | null = null
    let aiError: string | null = null

    try {
      const openai = getOpenAIClient()

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente especializado en analizar tickets, notas y facturas de refacciones automotrices en México. ' +
              'Extrae la lista de partes/refacciones con sus cantidades y precios. ' +
              'Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Analiza este ticket o nota de refacciones y extrae: ' +
                  'lista de partes con descripción, cantidad, precio unitario y total por parte. ' +
                  'Si hay nombre del proveedor o fecha, inclúyelos también. ' +
                  'Formato de respuesta: { "supplier": string | null, "date": string | null, "parts": [{ "description": string, "quantity": number, "unit_price": number, "total": number }] }. ' +
                  'Si no puedes leer el ticket con claridad, devuelve parts como array vacío.',
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
      // Quitar fences de markdown si las hay
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
      console.error('[analyze-receipt] Error en OpenAI vision:', err?.message)
      aiError = 'No se pudo extraer información automáticamente. El ticket fue guardado.'
    }

    return NextResponse.json({
      success: true,
      parts,
      document_url: documentUrl,
      supplier,
      date,
      ...(aiError ? { ai_error: aiError } : {}),
    })
  } catch (err: any) {
    console.error('[analyze-receipt] Exception:', err)
    return NextResponse.json(
      { error: err?.message || 'Error al procesar el ticket' },
      { status: 500 }
    )
  }
}
