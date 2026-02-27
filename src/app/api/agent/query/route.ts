import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { erpSearch, getOrdersCountByStatus } from '@/lib/agent/erp-tools'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Eres el asistente del ERP Eagles para un taller mecánico. Solo puedes ver datos de la organización del usuario actual.
Responde en español, de forma clara y breve. Cuando encuentres órdenes, clientes o vehículos, incluye en tu respuesta los enlaces que te pasemos en "links" para que el usuario pueda abrirlos.
Para preguntas sobre fechas de ingreso, órdenes de un cliente, teléfono de un cliente, o estado de órdenes, usa la herramienta erp_search con términos de búsqueda relevantes (nombre de cliente, modelo de vehículo, etc.) y luego resume los resultados.
Para "cuántas órdenes hay en X estado", usa get_orders_count_by_status.
Responde siempre con un texto amigable y al final di que puede hacer clic en los enlaces si aparecen.`

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }
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
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile?.organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 })
    }

    const organizationId = profile.organization_id
    const body = await request.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!message) {
      return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 })
    }

    const openai = getOpenAIClient()

    const tools: OpenAI.Chat.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'erp_search',
          description: 'Buscar en el ERP: clientes, órdenes de trabajo y vehículos por nombre, modelo, placa, etc.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Términos de búsqueda: nombre de cliente, modelo de auto, placa, etc.' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_orders_count_by_status',
          description: 'Obtener la cantidad de órdenes de trabajo por estado (reception, diagnosis, in_progress, etc.)',
          parameters: { type: 'object', properties: {} },
        },
      },
    ]

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      tools,
      tool_choice: 'auto',
    })

    let finalContent = ''
    const links: Array<{ label: string; url: string }> = []
    let currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ]

    const choice = response.choices[0]
    if (!choice?.message) {
      return NextResponse.json(
        { error: 'No se pudo generar respuesta', response: '' },
        { status: 500 }
      )
    }

    currentMessages.push(choice.message)

    let iterations = 0
    const maxIterations = 5
    let lastMessage = choice.message

    while (lastMessage.tool_calls && lastMessage.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++
      const toolResults: OpenAI.Chat.ChatCompletionMessageParam[] = []

      for (const tc of lastMessage.tool_calls) {
        const name = tc.function?.name
        const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {}

        if (name === 'erp_search' && args.query) {
          const searchResult = await erpSearch(organizationId, args.query)
          const summary = JSON.stringify({
            clientes: searchResult.customers.map((c) => ({
              nombre: c.name,
              telefono: c.phone,
              email: c.email,
              url: c.url,
            })),
            ordenes: searchResult.orders.map((o) => ({
              id: o.id,
              estado: o.status,
              fecha_ingreso: o.entry_date,
              cliente: o.customer_name,
              vehiculo: o.vehicle_info,
              url: o.url,
            })),
            vehiculos: searchResult.vehicles.map((v) => ({
              marca: v.brand,
              modelo: v.model,
              año: v.year,
              placa: v.license_plate,
              cliente: v.customer_name,
              url: v.url,
            })),
          })
          searchResult.orders.forEach((o) => links.push({ label: `Orden ${o.id.slice(0, 8)}... (${o.customer_name})`, url: o.url }))
          searchResult.customers.forEach((c) => links.push({ label: c.name, url: c.url }))
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: summary,
          })
        } else if (name === 'get_orders_count_by_status') {
          const counts = await getOrdersCountByStatus(organizationId)
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(counts),
          })
        }
      }

      currentMessages.push(...toolResults)
      const nextResponse = await openai.chat.completions.create({
        model: process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini',
        messages: currentMessages,
        tools,
        tool_choice: 'auto',
      })
      const nextChoice = nextResponse.choices[0]?.message
      if (!nextChoice) break
      lastMessage = nextChoice
      currentMessages.push(nextChoice)
      if (nextChoice.content) finalContent = nextChoice.content
    }

    if (!finalContent && lastMessage.content) {
      finalContent = typeof lastMessage.content === 'string' ? lastMessage.content : lastMessage.content.join('')
    }
    if (!finalContent) {
      finalContent = 'No encontré información para tu pregunta. Prueba con otros términos (nombre del cliente, modelo del vehículo, etc.).'
    }

    return NextResponse.json({
      success: true,
      response: finalContent,
      links: links.length > 0 ? links : undefined,
    })
  } catch (err: any) {
    console.error('[Agent Query]', err)
    return NextResponse.json(
      { error: err?.message || 'Error al procesar la consulta' },
      { status: 500 }
    )
  }
}
