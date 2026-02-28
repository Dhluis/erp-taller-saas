import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import {
  erpSearch,
  getOrdersCountByStatus,
  searchInventory,
  getFinanceSummary,
  getLowStockItems,
  getInventoryStats,
} from '@/lib/agent/erp-tools'
import { checkAIAgentEnabled } from '@/lib/billing/check-limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Eres el asistente del ERP Eagles para un taller mecánico. Tienes acceso a TODOS los datos reales de la organización: clientes, órdenes de trabajo (OT), vehículos, inventario/productos y finanzas (facturas).
Responde en español, de forma clara y concisa. Cuando encuentres datos, preséntales en formato legible (listas, tablas si hay varios registros). Incluye los enlaces cuando estén disponibles.

HERRAMIENTAS disponibles y cuándo usarlas:

1. erp_search(query): Buscar por nombre de cliente, vehículo, marca, modelo, placa, descripción de orden o número de factura. Devuelve clientes, órdenes, vehículos, productos y facturas que coincidan.

2. search_inventory(query): Buscar productos específicos en el inventario por nombre, SKU o tipo. Devuelve stock actual, stock mínimo y precio unitario. Usar para: "¿cuánto tengo de aceite?", "stock de filtros", "precio del producto X", "¿hay frenos?".

3. get_orders_count_by_status(): Cantidad de órdenes por estado. Usar para: "¿cuántas órdenes tengo?", "resumen de órdenes", "órdenes en proceso", "estadísticas de trabajo".

4. get_finance_summary(): Resumen financiero completo: total facturado, total cobrado, pendiente de cobro, desglose por estado. Usar para: "resumen de finanzas", "cuánto he facturado", "¿cuánto me deben?", "ingresos del taller".

5. get_low_stock_items(): Lista de productos con stock igual o menor al mínimo. Usar para: "¿qué productos necesito reponer?", "inventario bajo", "productos agotados o por agotarse", "alertas de stock".

6. get_inventory_stats(): Estadísticas generales del inventario: total de productos, valor total en stock, cantidad con bajo stock y agotados. Usar para: "resumen del inventario", "valor total del inventario", "cuántos productos tengo".

REGLAS:
- Llama a la herramienta más específica para la pregunta.
- Para preguntas de precio usa search_inventory.
- Para "¿qué necesito comprar?" usa get_low_stock_items.
- Para resumen general de inventario usa get_inventory_stats.
- Si no encuentras datos con una herramienta, indícalo claramente.
- Nunca inventes datos — solo reporta lo que devuelvan las herramientas.`

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

    const profileData = profile as { organization_id: string } | null
    if (profileError || !profileData?.organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 })
    }

    const organizationId = profileData.organization_id

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
          description: 'Buscar en todo el ERP: clientes, órdenes de trabajo, vehículos, productos y facturas. Usar para buscar por nombre, modelo, placa, descripción o número de factura.',
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
          description: 'Buscar productos en el inventario por nombre, SKU o tipo. Devuelve stock actual, stock mínimo y precio unitario. Usar para preguntas como "¿cuánto tengo de aceite?", "precio de filtro", "stock de frenos".',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Nombre del producto, SKU, categoría o tipo: aceite, filtro, frenos, llanta, etc.' },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_orders_count_by_status',
          description: 'Cantidad de órdenes de trabajo por estado (Recepción, Diagnóstico, En proceso, Completado, etc.). Usar para resúmenes de órdenes.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_finance_summary',
          description: 'Resumen financiero completo: total facturado, total cobrado, pendiente de cobro y desglose por estado. Consulta tanto facturas normales como ventas de OTs.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_low_stock_items',
          description: 'Lista de productos con stock igual o menor al mínimo configurado (agotados o por agotarse). Usar para saber qué reponer o alertas de inventario.',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_inventory_stats',
          description: 'Estadísticas globales del inventario: total de productos, valor total del stock, cuántos tienen bajo stock y cuántos están agotados.',
          parameters: { type: 'object', properties: {} },
        },
      },
    ]

    const initialMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ]

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_AGENT_MODEL || 'gpt-4o-mini',
      messages: initialMessages,
      tools,
      tool_choice: 'auto',
    })

    let finalContent = ''
    const links: Array<{ label: string; url: string }> = []
    const currentMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [...initialMessages]

    const choice = response.choices[0]
    if (!choice?.message) {
      return NextResponse.json({ error: 'No se pudo generar respuesta', response: '' }, { status: 500 })
    }

    currentMessages.push(choice.message)
    let iterations = 0
    const maxIterations = 5
    let lastMessage = choice.message

    while (lastMessage.tool_calls && lastMessage.tool_calls.length > 0 && iterations < maxIterations) {
      iterations++
      const toolResults: OpenAI.Chat.ChatCompletionMessageParam[] = []

      for (const tc of lastMessage.tool_calls) {
        const tcAny = tc as any
        const callId = tcAny.id
        const name = tcAny.function?.name
        let args: Record<string, unknown> = {}
        try {
          args = tcAny.function?.arguments ? JSON.parse(tcAny.function.arguments) : {}
        } catch {
          args = {}
        }

        let content: string

        if (name === 'erp_search' && typeof args.query === 'string' && args.query.trim()) {
          const sr = await erpSearch(organizationId, String(args.query).trim())
          content = JSON.stringify({
            clientes: sr.customers.map((c) => ({ nombre: c.name, telefono: c.phone, email: c.email, url: c.url })),
            ordenes: sr.orders.map((o) => ({
              id: o.id,
              estado: o.status,
              fecha_ingreso: o.entry_date,
              cliente: o.customer_name,
              vehiculo: o.vehicle_info,
              total: o.total_amount,
              url: o.url,
            })),
            vehiculos: sr.vehicles.map((v) => ({ marca: v.brand, modelo: v.model, año: v.year, placa: v.license_plate, cliente: v.customer_name })),
            inventario: sr.inventory.map((i) => ({ nombre: i.name, sku: i.sku, stock_actual: i.current_stock, stock_minimo: i.min_stock, precio_unitario: i.unit_price, categoria: i.category, url: i.url })),
            facturas: sr.invoices.map((f) => ({ numero: f.invoice_number, estado: f.status, total: f.total_amount, cobrado: f.paid_amount, pendiente: f.balance, cliente: f.customer_name, url: f.url })),
          })
          sr.orders.forEach((o) => links.push({ label: `Orden ${o.id.slice(0, 8)}... (${o.customer_name})`, url: o.url }))
          sr.customers.forEach((c) => links.push({ label: c.name, url: c.url }))
          sr.invoices.forEach((f) => links.push({ label: `Factura ${f.invoice_number}`, url: f.url }))

        } else if (name === 'search_inventory' && typeof args.query === 'string' && args.query.trim()) {
          const items = await searchInventory(organizationId, String(args.query).trim())
          content = JSON.stringify(
            items.map((i) => ({
              producto: i.name,
              sku: i.sku,
              stock_actual: i.current_stock,
              stock_minimo: i.min_stock,
              precio_unitario: i.unit_price,
              categoria: i.category,
            }))
          )
          if (items.length > 0) links.push({ label: 'Ver inventario', url: '/inventarios/productos' })

        } else if (name === 'get_orders_count_by_status') {
          const counts = await getOrdersCountByStatus(organizationId)
          content = JSON.stringify(counts)

        } else if (name === 'get_finance_summary') {
          const finance = await getFinanceSummary(organizationId)
          content = JSON.stringify({
            total_facturas: finance.total_invoices,
            total_facturado: finance.total_amount,
            total_cobrado: finance.total_paid,
            pendiente_cobro: finance.total_balance,
            por_estado: finance.by_status,
          })
          links.push({ label: 'Ver facturación', url: '/ingresos/facturacion' })

        } else if (name === 'get_low_stock_items') {
          const items = await getLowStockItems(organizationId)
          content = items.length === 0
            ? JSON.stringify({ mensaje: 'Todos los productos tienen stock suficiente.' })
            : JSON.stringify(items.map((i) => ({
                producto: i.name,
                sku: i.sku,
                stock_actual: i.current_stock,
                stock_minimo: i.min_stock,
                precio_unitario: i.unit_price,
                categoria: i.category,
              })))
          if (items.length > 0) links.push({ label: 'Ver inventario', url: '/inventarios/productos' })

        } else if (name === 'get_inventory_stats') {
          const stats = await getInventoryStats(organizationId)
          content = JSON.stringify({
            total_productos: stats.total_products,
            valor_total_stock: stats.total_stock_value,
            productos_bajo_stock: stats.low_stock_count,
            productos_agotados: stats.out_of_stock_count,
          })
          links.push({ label: 'Ver inventario', url: '/inventarios/productos' })

        } else {
          content = JSON.stringify({
            error: !name
              ? 'Herramienta sin nombre'
              : typeof args.query !== 'string' || !args.query?.trim()
              ? 'Falta el parámetro "query" o está vacío'
              : 'Herramienta no reconocida',
            tool: name || 'unknown',
          })
        }

        toolResults.push({ role: 'tool', tool_call_id: callId, content })
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
      finalContent = typeof lastMessage.content === 'string' ? lastMessage.content : (lastMessage.content as any[]).map((p: any) => p?.text ?? '').join('')
    }
    if (!finalContent) {
      finalContent = 'No encontré información para tu pregunta. Prueba con otros términos (nombre del cliente, modelo del vehículo, nombre del producto, etc.).'
    }

    return NextResponse.json({
      success: true,
      response: finalContent,
      links: links.length > 0 ? links : undefined,
    })
  } catch (err: any) {
    console.error('[Agent Query]', err)
    return NextResponse.json({ error: err?.message || 'Error al procesar la consulta' }, { status: 500 })
  }
}
