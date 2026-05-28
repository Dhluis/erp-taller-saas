import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import { checkAIAgentEnabled } from '@/lib/billing/check-limits'
import OpenAI from 'openai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'work-order-documents'
const MAX_FILE_SIZE = 20 * 1024 * 1024

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) throw new Error('OPENAI_API_KEY no configurada')
  return new OpenAI({ apiKey: apiKey.trim() })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const supabaseAdmin = getSupabaseServiceClient()
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Servicio no disponible' }, { status: 503 })
    }

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single() as { data: { organization_id: string } | null; error: any }

    if (!userProfile?.organization_id) {
      return NextResponse.json({ error: 'Sin organización' }, { status: 403 })
    }

    const { allowed, error: limitError } = await checkAIAgentEnabled(userProfile.organization_id)
    if (!allowed) {
      return NextResponse.json(
        { error: limitError?.message ?? 'Requiere plan Premium', plan_required: 'premium' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Se requiere un archivo' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 20MB)' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Upload to storage for record keeping
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `receipts/${userProfile.organization_id}/${timestamp}_${safeName}`

    await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })
      .catch(() => {}) // non-fatal if storage fails

    if (file.type === 'application/pdf') {
      return NextResponse.json({
        success: true,
        vendor: null, date: null, total: null,
        description: null, suggested_category: 'otro',
        ai_error: 'PDF guardado. La extracción automática solo está disponible para imágenes.',
      })
    }

    const openai = getOpenAIClient()
    const base64Image = buffer.toString('base64')

    let vendor: string | null = null
    let date: string | null = null
    let total: number | null = null
    let description: string | null = null
    let suggested_category = 'otro'
    let aiError: string | null = null

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content:
              'Eres un asistente para talleres mecánicos en México. Extrae información de tickets y facturas. ' +
              'Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Analiza este ticket o factura y extrae: ' +
                  '1) vendor: nombre del establecimiento/proveedor, ' +
                  '2) date: fecha en formato YYYY-MM-DD, ' +
                  '3) total: monto total como número (sin símbolo de moneda), ' +
                  '4) description: descripción breve de qué se compró/pagó, ' +
                  '5) suggested_category: una de estas categorías según el tipo de gasto: ' +
                  'renta, servicios, nomina, herramientas, limpieza, comida, transporte, publicidad, mantenimiento, otro. ' +
                  'Formato: { "vendor": string|null, "date": string|null, "total": number|null, "description": string|null, "suggested_category": string }',
              },
              {
                type: 'image_url',
                image_url: { url: `data:${file.type};base64,${base64Image}`, detail: 'high' },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0,
      })

      const content = completion.choices[0]?.message?.content?.trim() ?? ''
      const clean = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(clean)

      vendor = parsed.vendor ?? null
      date = parsed.date ?? null
      total = typeof parsed.total === 'number' ? parsed.total : null
      description = parsed.description ?? null
      suggested_category = parsed.suggested_category ?? 'otro'
    } catch (err: any) {
      console.error('[receipts/scan] OpenAI error:', err?.message)
      aiError = 'No se pudo extraer información automáticamente.'
    }

    return NextResponse.json({
      success: true,
      vendor,
      date,
      total,
      description,
      suggested_category,
      ...(aiError ? { ai_error: aiError } : {}),
    })
  } catch (err: any) {
    console.error('[receipts/scan] Exception:', err)
    return NextResponse.json({ error: err?.message || 'Error al procesar' }, { status: 500 })
  }
}
