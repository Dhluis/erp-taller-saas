import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { erpSearch, getOrdersCountByStatus, searchInventory, getFinanceSummary } from '@/lib/agent/erp-tools'
import { checkAIAgentEnabled } from '@/lib/billing/check-limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Eres el asistente del ERP Eagles para un taller mecánico. Tienes acceso a TODOS los datos de la organización del usuario: clientes, órdenes de trabajo (OT), vehículos, inventario (productos y stock) y finanzas (facturas, cobrado, pendiente).
Responde en español, de forma clara y breve. Cuando encuentres resultados, incluye los enlaces que te pasemos en "links" para que el usuario pueda abrirlos.

Herramientas y cuándo usarlas:
- erp_search(query): buscar por nombre de cliente, vehículo, modelo, placa, descripción de orden, producto o número de factura. Devuelve clientes, órdenes, vehículos, inventario y facturas.
- search_inventory(query): para preguntas de STOCK o inventario: "cuánto tengo en aceite", "stock de filtros", "cuántas unidades de X". Usa términos como nombre del producto, categoría o tipo (aceite, filtro, etc.).
- get_orders_count_by_status(): cuántas órdenes hay por estado (reception, diagnosis, in_progress, etc.).
- get_finance_summary(): resumen de finanzas: total facturado, total cobrado, pendiente de cobro, facturas por estado (pending, paid, partial).

Responde siempre con un texto amigable. Si hay enlaces, indica que puede hacer clic para ver el detalle.`

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }
  return new OpenAI({ apiKey: apiKey.trim() })
}

export async function POST(request: NextRequest) {
  try {
    // ----- MULTITENANCY: organization_id SOLO desde la sesión, NUNCA del body -----
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

    // ----- PREMIUM: solo planes Premium (o trial activo) pueden usar el agente -----
    const { allowed, error: limitError } = await checkAIAgentEnabled(organizationId)
    if (!allowed && limitError) {
      return NextResponse.json(
        {
          error: limitError.message,
          limit_reached: true,
          upgrade_url: limitError.upgrade_url || '/settings/billing',
          feature: limitError.feature || 'ai_enabled',
          plan_required: 'premium',
        },
        { status: 403 }
      )
    }
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
          description: 'Buscar en todo el ERP: clientes, órdenes de trabajo, vehículos, productos de inventario y facturas. Usar para nombres, modelos, placas, descripciones, número de factura.',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Términos de búsqueda: nombre de cliente, modelo de auto, placa, producto, número de factura, etc.' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'search_inventory',
          description: 'Buscar en el INVENTARIO: stock actual de productos. Usar para preguntas como "cuánto tengo en aceite", "stock de X", "cuántas unidades de filtros", "inventario de Y".',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Nombre del producto, categoría o tipo: aceite, filtro, frenos, etc.' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_orders_count_by_status',
          description: 'Cantidad de órdenes de trabajo por estado (reception, diagnosis, in_progress, completed, etc.).',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_finance_summary',
          description: 'Resumen de finanzas: total facturado, total cobrado, pendiente de cobro, cantidad de facturas por estado (pending, paid, partial, cancelled).',
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
            inventario: searchResult.inventory.map((i) => ({
              nombre: i.name,
              sku: i.sku,
              stock_actual: i.current_stock,
              stock_minimo: i.min_stock,
              categoria: i.category,
              url: i.url,
            })),
            facturas: searchResult.invoices.map((f) => ({
              numero: f.invoice_number,
              estado: f.status,
              total: f.total_amount,
              cobrado: f.paid_amount,
              pendiente: f.balance,
              cliente: f.customer_name,
              url: f.url,
            })),
          })
          searchResult.orders.forEach((o) => links.push({ label: `Orden ${o.id.slice(0, 8)}... (${o.customer_name})`, url: o.url }))
          searchResult.customers.forEach((c) => links.push({ label: c.name, url: c.url }))
          searchResult.invoices.forEach((f) => links.push({ label: `Factura ${f.invoice_number}`, url: f.url }))
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: summary,
          })
        } else if (name === 'search_inventory' && args.query) {
          const inventory = await searchInventory(organizationId, args.query)
          const summary = JSON.stringify(
            inventory.map((i) => ({
              producto: i.name,
              sku: i.sku,
              stock_actual: i.current_stock,
              stock_minimo: i.min_stock,
              categoria: i.category,
              url: i.url,
            }))
          )
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: summary,
          })
          if (inventory.length > 0) {
            links.push({ label: 'Ver inventario', url: '/inventarios/movimientos' })
          }
        } else if (name === 'get_orders_count_by_status') {
          const counts = await getOrdersCountByStatus(organizationId)
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(counts),
          })
        } else if (name === 'get_finance_summary') {
          const finance = await getFinanceSummary(organizationId)
          toolResults.push({
            role: 'tool' as const,
            tool_call_id: tc.id,
            content: JSON.stringify(finance),
          })
          links.push({ label: 'Facturación', url: '/ingresos/facturacion' })
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
