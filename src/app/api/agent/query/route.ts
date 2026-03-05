import { NextRequest, NextResponse } from 'next/server'
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import {
  erpSearch,
  getOrdersCountByStatus,
  getRecentOrders,
  getOrdersByStatus,
  getRecentCustomers,
  searchInventory,
  getFinanceSummary,
  getLowStockItems,
  getInventoryStats,
  getCashBalance,
  getUpcomingAppointments,
  getExpensesSummaryTool,
  getCollectionsSummary,
  getQuotationsSummary,
  getActiveEmployees,
  getLeadsSummary,
  getPurchaseOrdersSummary,
  getSuppliersList,
  getDeliveryNotesSummary,
  getCreditNotesSummary,
  getCashClosuresSummary,
} from '@/lib/agent/erp-tools'
import { checkAIAgentEnabled } from '@/lib/billing/check-limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `Eres el asistente del ERP Eagles para un taller mecánico. Tienes acceso a TODOS los datos reales de la organización.
Responde en español, de forma clara y concisa. Cuando encuentres datos, preséntales en formato legible (listas o tabla). Incluye los enlaces cuando estén disponibles.

HERRAMIENTAS disponibles:

1. erp_search(query): Buscar por nombre de cliente, vehículo, marca, modelo, placa, descripción de orden o número de factura.
2. search_inventory(query): Buscar productos por nombre, SKU o tipo. Devuelve stock y precio.
3. get_recent_orders(limit?): Órdenes de trabajo más recientes.
4. get_orders_by_status(status): Órdenes por estado ("en proceso", "diagnóstico", "listo", "completado", etc.).
5. get_orders_count_by_status(): Conteo de órdenes por estado.
6. get_recent_customers(limit?): Clientes más recientes.
7. get_finance_summary(): Total facturado, cobrado y pendiente de cobro (facturas).
8. get_cash_balance(): Saldo real de cuentas de efectivo (caja chica, banco). Usar para "¿cuánto tengo en caja?", "saldo de efectivo".
9. get_low_stock_items(): Productos con stock bajo o agotado.
10. get_inventory_stats(): Resumen global del inventario.
11. get_upcoming_appointments(days_ahead?, status?): Citas próximas. Usar para "citas de hoy", "citas de esta semana", "próximas citas". days_ahead por defecto 7.
12. get_expenses_summary(from?, to?): Gastos por período y categoría. Usar para "¿cuánto gasté?", "gastos del mes", "gastos por categoría". Fechas en YYYY-MM-DD.
13. get_collections_summary(): Cobros pendientes y vencidos. Usar para "cobros pendientes", "¿cuánto me deben?", "cobros vencidos".
14. get_quotations_summary(): Cotizaciones por estado. Usar para "cotizaciones pendientes", "cotizaciones enviadas", "¿cuántas cotizaciones hay?".
15. get_active_employees(): Lista de empleados/mecánicos activos. Usar para "¿cuántos mecánicos hay?", "lista de empleados", "mecánicos disponibles".
16. get_leads_summary(): Prospectos/leads del CRM por estado. Usar para "leads", "prospectos", "clientes potenciales", "pipeline de ventas", "cuántos leads hay".
17. get_purchase_orders(): Órdenes de compra a proveedores. Usar para "órdenes de compra", "compras pendientes", "pedidos a proveedores".
18. get_suppliers(): Lista de proveedores activos. Usar para "proveedores", "lista de proveedores", "datos de proveedor".
19. get_delivery_notes(): Notas de entrega (remisiones). Usar para "remisiones", "notas de entrega", "entregas pendientes".
20. get_credit_notes(): Notas de crédito emitidas. Usar para "notas de crédito", "devoluciones", "créditos emitidos".
21. get_cash_closures(): Historial de cortes de caja. Usar para "cortes de caja", "último corte", "historial de cierres de caja".

REGLAS:
- Usa la herramienta más específica. Si el usuario pregunta por caja/efectivo usa get_cash_balance, NO get_finance_summary.
- Para gastos usa get_expenses_summary, para cobros get_collections_summary, para citas get_upcoming_appointments.
- Para búsquedas por nombre usa erp_search.
- Nunca inventes datos — solo reporta lo que devuelvan las herramientas.
- Si no hay datos, indícalo claramente.`

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
          name: 'get_recent_customers',
          description: 'Retorna los clientes más recientemente registrados. Usar para: "¿cuál es el último cliente?", "últimos clientes registrados", "clientes nuevos".',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Cuántos clientes retornar. Por defecto 5.' },
            },
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
          name: 'get_recent_orders',
          description: 'Retorna las órdenes de trabajo más recientes con detalles completos (cliente, vehículo, estado, fecha de ingreso, monto). Usar para: "¿cuál es la orden más reciente?", "últimas órdenes", "qué entró hoy".',
          parameters: {
            type: 'object',
            properties: {
              limit: { type: 'number', description: 'Cuántas órdenes retornar. Por defecto 5, máximo 10.' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_orders_by_status',
          description: 'Retorna las órdenes de trabajo de un estado específico. Usar para: "órdenes en proceso", "qué hay en diagnóstico", "órdenes listas para entregar", "esperando repuestos".',
          parameters: {
            type: 'object',
            properties: {
              status: { type: 'string', description: 'Estado en español o inglés: "en proceso", "diagnóstico", "listo", "completado", "recepción", "esperando repuestos", "esperando aprobación", "cancelado".' },
              limit: { type: 'number', description: 'Cuántas órdenes retornar. Por defecto 10.' },
            },
            required: ['status'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_orders_count_by_status',
          description: 'Cantidad total de órdenes de trabajo por estado. Usar solo para resúmenes numéricos generales.',
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
      {
        type: 'function',
        function: {
          name: 'get_cash_balance',
          description: 'Saldo actual de las cuentas de efectivo del taller (caja chica, banco, etc.). Usar para: "¿cuánto tengo en caja?", "saldo de cuentas de efectivo", "dinero en caja", "saldo actual", "efectivo disponible".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_upcoming_appointments',
          description: 'Citas próximas del taller. Usar para: "citas de hoy", "citas de mañana", "citas de esta semana", "próximas citas", "agenda de citas", "citas pendientes", "citas confirmadas".',
          parameters: {
            type: 'object',
            properties: {
              days_ahead: { type: 'number', description: 'Días hacia adelante a buscar. 0 = solo hoy, 1 = hoy y mañana, 7 = esta semana. Por defecto 7.' },
              status: { type: 'string', description: 'Filtrar por estado: "pending", "confirmed", "completed", "cancelled". Omitir para todos.' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_expenses_summary',
          description: 'Resumen de gastos por período y categoría. Usar para: "¿cuánto gasté?", "gastos del mes", "gastos de esta semana", "gastos por categoría", "egresos", "¿cuánto gastamos en refacciones?".',
          parameters: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Fecha inicio en formato YYYY-MM-DD. Si se omite, últimos 30 días.' },
              to: { type: 'string', description: 'Fecha fin en formato YYYY-MM-DD. Si se omite, hoy.' },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_collections_summary',
          description: 'Cobros pendientes y vencidos de clientes. Usar para: "cobros pendientes", "cobros vencidos", "¿cuánto me deben?", "cuentas por cobrar", "clientes que deben".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_quotations_summary',
          description: 'Cotizaciones por estado. Usar para: "cotizaciones pendientes", "cotizaciones enviadas sin respuesta", "¿cuántas cotizaciones hay?", "resumen de cotizaciones".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_active_employees',
          description: 'Lista de empleados/mecánicos activos del taller. Usar para: "¿cuántos mecánicos hay?", "lista de empleados", "mecánicos disponibles", "¿quiénes trabajan aquí?".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_leads_summary',
          description: 'Resumen de leads y prospectos del CRM por estado. Usar para: "leads", "prospectos", "clientes potenciales", "pipeline de ventas", "cuántos leads tengo", "leads ganados o perdidos".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_purchase_orders',
          description: 'Órdenes de compra realizadas a proveedores. Usar para: "órdenes de compra", "compras pendientes", "pedidos a proveedores", "cuánto hay por pagar a proveedores".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_suppliers',
          description: 'Lista de proveedores activos registrados. Usar para: "proveedores", "lista de proveedores", "datos de proveedor", "¿con qué proveedores trabajamos?".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_delivery_notes',
          description: 'Notas de entrega (remisiones) por estado. Usar para: "remisiones", "notas de entrega", "entregas pendientes", "¿qué hay por entregar?".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_credit_notes',
          description: 'Notas de crédito emitidas. Usar para: "notas de crédito", "devoluciones", "créditos emitidos", "¿cuántas notas de crédito hay?".',
          parameters: { type: 'object', properties: {} },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_cash_closures',
          description: 'Historial de cortes de caja. Usar para: "cortes de caja", "último corte de caja", "historial de cierres", "¿cuándo fue el último corte?".',
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

        if (name === 'get_recent_customers') {
          const limit = typeof args.limit === 'number' ? Math.min(args.limit, 10) : 5
          const customers = await getRecentCustomers(organizationId, limit)
          content = customers.length === 0
            ? JSON.stringify({ mensaje: 'No hay clientes registrados.' })
            : JSON.stringify(customers.map((c) => ({
                nombre: c.name,
                telefono: c.phone,
                email: c.email,
                fecha_registro: c.created_at,
                url: c.url,
              })))
          links.push({ label: 'Ver clientes', url: '/clientes' })

        } else if (name === 'erp_search' && typeof args.query === 'string' && args.query.trim()) {
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

        } else if (name === 'get_recent_orders') {
          const limit = typeof args.limit === 'number' ? Math.min(args.limit, 10) : 5
          const orders = await getRecentOrders(organizationId, limit)
          content = orders.length === 0
            ? JSON.stringify({ mensaje: 'No hay órdenes de trabajo registradas.' })
            : JSON.stringify(orders.map((o) => ({
                id: o.id,
                estado: o.status_label,
                fecha_ingreso: o.entry_date,
                fecha_estimada_entrega: o.estimated_completion,
                descripcion: o.description,
                cliente: o.customer_name,
                telefono_cliente: o.customer_phone,
                vehiculo: o.vehicle_info,
                total: o.total_amount,
                url: o.url,
              })))
          orders.forEach((o) => links.push({ label: `${o.vehicle_info || 'Orden'} — ${o.customer_name}`, url: o.url }))

        } else if (name === 'get_orders_by_status') {
          const statusArg = typeof args.status === 'string' ? args.status : ''
          const limit = typeof args.limit === 'number' ? Math.min(args.limit, 10) : 10
          if (!statusArg.trim()) {
            content = JSON.stringify({ error: 'Se requiere el parámetro status.' })
          } else {
            const orders = await getOrdersByStatus(organizationId, statusArg, limit)
            content = orders.length === 0
              ? JSON.stringify({ mensaje: `No hay órdenes con el estado "${statusArg}".` })
              : JSON.stringify(orders.map((o) => ({
                  id: o.id,
                  estado: o.status_label,
                  fecha_ingreso: o.entry_date,
                  descripcion: o.description,
                  cliente: o.customer_name,
                  telefono_cliente: o.customer_phone,
                  vehiculo: o.vehicle_info,
                  total: o.total_amount,
                  url: o.url,
                })))
            orders.forEach((o) => links.push({ label: `${o.vehicle_info || 'Orden'} — ${o.customer_name}`, url: o.url }))
          }

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

        } else if (name === 'get_cash_balance') {
          const cash = await getCashBalance(organizationId)
          content = JSON.stringify({
            saldo_total: cash.total_balance,
            cuentas: cash.accounts.map((a) => ({
              nombre: a.name,
              tipo: a.account_type,
              saldo: a.current_balance,
            })),
          })
          links.push({ label: 'Ver cuentas de efectivo', url: '/ingresos/cuentas-efectivo' })

        } else if (name === 'get_upcoming_appointments') {
          const daysAhead = typeof args.days_ahead === 'number' ? args.days_ahead : 7
          const statusArg = typeof args.status === 'string' ? args.status : undefined
          const appointments = await getUpcomingAppointments(organizationId, daysAhead, statusArg)
          content = appointments.length === 0
            ? JSON.stringify({ mensaje: 'No hay citas próximas en ese período.' })
            : JSON.stringify(appointments.map((a) => ({
                fecha: a.appointment_date,
                estado: a.status,
                servicio: a.service_type,
                cliente: a.customer_name,
                telefono: a.customer_phone,
                vehiculo: a.vehicle_info,
                notas: a.notes,
              })))
          links.push({ label: 'Ver citas', url: '/citas' })

        } else if (name === 'get_expenses_summary') {
          const fromArg = typeof args.from === 'string' ? args.from : undefined
          const toArg = typeof args.to === 'string' ? args.to : undefined
          const exp = await getExpensesSummaryTool(organizationId, fromArg, toArg)
          content = JSON.stringify({
            total_gastos: exp.total,
            cantidad: exp.count,
            por_categoria: exp.by_category,
            recientes: exp.recent,
          })
          links.push({ label: 'Ver gastos', url: '/compras/gastos' })

        } else if (name === 'get_collections_summary') {
          const col = await getCollectionsSummary(organizationId)
          content = JSON.stringify({
            pendientes: col.pending_count,
            total_pendiente: col.pending_total,
            vencidos: col.overdue_count,
            total_vencido: col.overdue_total,
            cobrado_este_mes: col.paid_this_month,
            detalle_pendientes: col.recent_pending,
          })
          links.push({ label: 'Ver cobros', url: '/ingresos/cobros' })

        } else if (name === 'get_quotations_summary') {
          const quot = await getQuotationsSummary(organizationId)
          content = JSON.stringify({
            total_cotizaciones: quot.total,
            por_estado: quot.by_status,
            pendientes_aprobacion: quot.pending_approval,
          })
          links.push({ label: 'Ver cotizaciones', url: '/cotizaciones' })

        } else if (name === 'get_active_employees') {
          const emps = await getActiveEmployees(organizationId)
          content = emps.length === 0
            ? JSON.stringify({ mensaje: 'No hay empleados activos registrados.' })
            : JSON.stringify(emps.map((e) => ({
                nombre: e.name,
                rol: e.role,
                especialidad: e.specialty,
              })))
          links.push({ label: 'Ver empleados', url: '/empleados' })

        } else if (name === 'get_leads_summary') {
          const leads = await getLeadsSummary(organizationId)
          content = JSON.stringify({
            total_leads: leads.total,
            por_estado: leads.by_status,
            valor_estimado_total: leads.estimated_value_total,
            recientes: leads.recent,
          })
          links.push({ label: 'Ver leads', url: '/crm/leads' })

        } else if (name === 'get_purchase_orders') {
          const po = await getPurchaseOrdersSummary(organizationId)
          content = JSON.stringify({
            total_ordenes: po.total,
            por_estado: po.by_status,
            total_pendiente_pagar: po.pending_total,
            recientes: po.recent,
          })
          links.push({ label: 'Ver órdenes de compra', url: '/compras/ordenes' })

        } else if (name === 'get_suppliers') {
          const suppliers = await getSuppliersList(organizationId)
          content = suppliers.length === 0
            ? JSON.stringify({ mensaje: 'No hay proveedores activos registrados.' })
            : JSON.stringify(suppliers.map((s) => ({
                nombre: s.name,
                contacto: s.contact_person,
                telefono: s.phone,
                email: s.email,
                terminos_pago: s.payment_terms,
              })))
          links.push({ label: 'Ver proveedores', url: '/compras/proveedores' })

        } else if (name === 'get_delivery_notes') {
          const dn = await getDeliveryNotesSummary(organizationId)
          content = JSON.stringify({
            total_remisiones: dn.total,
            por_estado: dn.by_status,
            recientes: dn.recent,
          })
          links.push({ label: 'Ver remisiones', url: '/remisiones' })

        } else if (name === 'get_credit_notes') {
          const cn = await getCreditNotesSummary(organizationId)
          content = JSON.stringify({
            total_notas: cn.total,
            monto_total: cn.total_amount,
            por_estado: cn.by_status,
            recientes: cn.recent,
          })
          links.push({ label: 'Ver notas de crédito', url: '/ingresos/notas-credito' })

        } else if (name === 'get_cash_closures') {
          const cc = await getCashClosuresSummary(organizationId)
          content = cc.total_closures === 0
            ? JSON.stringify({ mensaje: 'No hay cortes de caja registrados.' })
            : JSON.stringify({
                total_cortes: cc.total_closures,
                ultimo_corte: cc.last_closure,
                historial: cc.recent,
              })
          links.push({ label: 'Ver cortes de caja', url: '/ingresos/cortes-caja' })

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
