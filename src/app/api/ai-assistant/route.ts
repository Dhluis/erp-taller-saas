import { NextRequest, NextResponse } from 'next/server';
import {
  createClientFromRequest,
  getSupabaseServiceClient,
} from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/organization-server";
import OpenAI from "openai";
import { checkAIAgentEnabled } from "@/lib/billing/check-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error("OPENAI_API_KEY no está configurada");
  }
  return new OpenAI({ apiKey: apiKey.trim() });
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ Obtener organización mediante método robusto universal
    const organizationId = await getOrganizationId(request);

    // ✅ Definir supabaseAdmin para queries bypass RLS
    const supabaseAdmin = getSupabaseServiceClient();

    // Verificar si el agente de IA está habilitado para el plan
    const { allowed, error: limitError } =
      await checkAIAgentEnabled(organizationId);
    if (!allowed && limitError) {
      return NextResponse.json(
        {
          error: limitError.message,
          limit_reached: true,
          upgrade_url: limitError.upgrade_url || "/settings/billing",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: "Falta la acción" }, { status: 400 });
    }

    const openai = getOpenAIClient();

    if (action === "draft-message") {
      const { workOrderId, origin = "https://eaglessystem.io" } = payload;
      if (!workOrderId)
        return NextResponse.json(
          { error: "Falta workOrderId" },
          { status: 400 },
        );

      const { data: order, error: orderError } = await supabaseAdmin
        .from("work_orders")
        .select(
          `
          id,
          status,
          description,
          total_amount,
          entry_date,
          customer:customers(name, phone),
          vehicle:vehicles(brand, model, plate:license_plate, year)
        `,
        )
        .eq("id", workOrderId)
        .eq("organization_id", organizationId)
        .single();

      if (orderError || !order) {
        return NextResponse.json(
          { error: "Orden no encontrada" },
          { status: 404 },
        );
      }

      const trackingUrl = `${origin}/tracking/${workOrderId}`;

      const SYSTEM_PROMPT = `Eres el asistente de Eagles System ERP. Tu tarea es redactar un mensaje de WhatsApp empático y profesional para un cliente sobre el estado de su orden de trabajo.
Usa la información proporcionada para crear un mensaje personalizado.
Reglas:
1. Sé amable y directo.
2. Incluye detalles del vehículo (Marca, Modelo, Placa).
3. Menciona el estado actual de forma clara.
4. Si hay un saldo o monto total, menciónalo profesionalmente.
5. El tono debe ser de taller de alta calidad (Premium).
6. DEBES incluir obligatoriamente el "Enlace de seguimiento en vivo" al final del mensaje.
7. Responde SOLO con el texto del mensaje, sin introducciones ni comentarios adicionales.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Redacta un mensaje para el cliente ${(order as any).customer?.name} sobre su ${(order as any).vehicle?.brand} ${(order as any).vehicle?.model} (${(order as any).vehicle?.plate}).
Estado actual: ${(order as any).status}.
Descripción del trabajo: ${(order as any).description}.
Total: ${(order as any).total_amount ? "$" + (order as any).total_amount : "A definir"}.
Fecha de ingreso: ${(order as any).entry_date}.
Enlace de seguimiento en vivo: ${trackingUrl}`,
          },
        ],
        temperature: 0.7,
      });

      return NextResponse.json({
        success: true,
        draft: response.choices[0].message.content,
      });
    }

    if (action === "draft-lead-message") {
      const { leadId } = payload;
      if (!leadId)
        return NextResponse.json({ error: "Falta leadId" }, { status: 400 });

      const { data: rawLead, error: leadError } = await (supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .eq("organization_id", organizationId)
        .single() as any);

      const lead = rawLead as any;

      if (leadError || !lead) {
        return NextResponse.json(
          { error: "Lead no encontrado" },
          { status: 404 },
        );
      }

      const statusMap: Record<string, string> = {
        new: "Nuevo",
        contacted: "Contactado (Esperando respuesta)",
        quoted: "Cotizado (Esperando aprobación)",
        lost: "No interesado / Perdido",
        won: "Convertido / Ganado",
      };

      const systemPrompt = `Eres un asesor de servicio automotriz de alto nivel trabajando en un Taller Mecánico. Tu tarea es redactar un mensaje de WhatsApp rompehielos o de seguimiento empático, persuasivo y profesional para un cliente potencial (lead).
Usa la información proporcionada para crear un mensaje personalizado que promueva que el cliente lleve su auto al taller, agende una cita o apruebe el presupuesto.
Reglas:
1. CRÍTICO: Hablas en nombre del Taller Mecánico. JAMÁS digas que eres de "Eagles System ERP" (eso es solo nuestro software interno).
2. El servicio que ofreces es para mantener o reparar el AUTO/VEHÍCULO del cliente, NO para mantener "su taller".
3. Sé amable, directo y muestra disposición para ayudar. NO suenes como robot.
4. Considera el estado actual del prospecto para enfocar el mensaje (ej: si es "Nuevo", saluda y ofrécele ayuda con su auto; si es "Cotizado", pregúntale si tiene dudas del presupuesto).
5. Usa notas internas como contexto SI son relevantes para el cliente, ignóralas si son instrucciones internas.
6. El tono debe ser premium y de alta confianza.
7. Firmeza sin presionar: cierra siempre el mensaje con una pregunta abierta o invitación a la acción (ej. "¿Deseas que agendemos la revisión para esta semana?").
8. Responde SOLO con el texto del mensaje, listo para copiarse y enviarse en WhatsApp.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Redacta un mensaje para el cliente/prospecto: ${lead.name}
Teléfono registrado: ${lead.phone}
Empresa: ${lead.company || "N/A"}
Estado en el embudo de ventas: ${statusMap[lead.status] || lead.status}
Notas internas sobre el prospecto: ${lead.notes || "No hay notas adicionales"}
Valor presupuestado/estimado: ${lead.estimated_value ? "$" + lead.estimated_value : "No definido"}`,
          },
        ],
        temperature: 0.7,
      });

      return NextResponse.json({
        success: true,
        message: response.choices[0].message.content,
      });
    }

    if (action === "magic-create") {
      const { text, context = "auto" } = payload || {};
      if (!text)
        return NextResponse.json({ error: "Falta el texto" }, { status: 400 });

      let systemPrompt = "";

      if (context === "inventory") {
        systemPrompt = `Eres el extractor de datos de inventario de Eagles System ERP. Tu tarea es extraer información para crear un producto/pieza.
Devuelve SIEMPRE un JSON válido:
{
  "action_type": "inventory",
  "product": { "name": string, "sku": string, "category_name": string, "unit_price": number, "quantity": number, "min_quantity": number, "description": string }
}`;
      } else if (context === "appointment") {
        systemPrompt = `Eres el extractor de datos de citas. Extrae info para agendar una cita.
JSON:
{
  "action_type": "appointment",
  "appointment": { 
    "customer": { "name": string, "phone": string, "email": string },
    "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string },
    "details": { "service_type": string, "date": string, "time": string, "notes": string, "duration_minutes": number }
  }
}`;
      } else if (context === "work-order") {
        systemPrompt = `Eres el extractor de datos de Eagles System ERP. Extrae info para crear cliente, vehículo y orden de trabajo.
JSON:
{
  "action_type": "work-order",
  "customer": { "name": string, "phone": string, "email": string, "address": string },
  "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string, "vin": string, "mileage": number },
  "work_order": { "description": string, "budget": number, "notes": string, "deadline": string, "assigned_to_name": string },
  "inspection": {
    "fuel_level": "empty" | "quarter" | "half" | "three_quarters" | "full",
    "fluids": { "aceite_motor": boolean, "aceite_transmision": boolean, "liquido_frenos": boolean, "liquido_embrague": boolean, "refrigerante": boolean, "aceite_hidraulico": boolean, "limpia_parabrisas": boolean },
    "dashboard_indicators": { "check_engine": boolean, "battery": boolean, "oil": boolean, "brake": boolean, "abs": boolean, "temperature": boolean, "airbag": boolean, "tpms": boolean, "lights": boolean, "transmission": boolean },
    "vehicle_condition": {
      "luces": boolean, "cristales": boolean, "espejos": boolean, "plumas": boolean, "tapones_ruedas": boolean, "carroceria_sin_golpes": boolean,
      "tablero": boolean, "radio": boolean, "espejo_retrovisor": boolean, "cinturones": boolean, "tapetes": boolean, "manijas": boolean,
      "gato": boolean, "llanta_refaccion": boolean, "herramientas": boolean, "varilla_aceite": boolean, "cables_corriente": boolean
    }
  },
  "inspection_details": {
    "valuable_items": string,
    "entry_reason": string,
    "procedures": string,
    "will_diagnose": boolean,
    "is_warranty": boolean,
    "authorize_test_drive": boolean
  }
}
Reglas:
- fuel_level: "vacio"->empty, "un cuarto"->quarter, "mitad"->half, "tres cuartos"->three_quarters, "lleno"->full.
- fluids: si dice que todos están bien, pon todos en true.
- dashboard_indicators: solo incluye los testigos mencionados como encendidos/prendidos. "testigo del ABS"->abs:true, "check engine"/"testigo del motor"->check_engine:true, "testigo de batería"->battery:true, "testigo de temperatura"->temperature:true, "testigo de frenos"->brake:true, "testigo de aceite"->oil:true, "bolsas de aire"->airbag:true, "presión de llantas"->tpms:true, "testigo de luces"->lights:true, "testigo de transmisión"->transmission:true.
- vehicle_condition: pon true en los ítems que se mencionen como presentes o en buen estado. Exterior: "luces completas"->luces, "cristales"->cristales, "espejos"->espejos, "plumas"->plumas, "tapones"->tapones_ruedas, "sin golpes"/"carrocería"->carroceria_sin_golpes. Interior: "tablero completo"->tablero, "radio"->radio, "espejo retrovisor"->espejo_retrovisor, "cinturones"->cinturones, "tapetes"->tapetes, "manijas"->manijas. Accesorios: "gato"->gato, "llanta de refacción"->llanta_refaccion, "estuche de herramientas"/"herramientas"->herramientas, "varilla de aceite"->varilla_aceite, "cables de corriente"->cables_corriente.
- inspection_details.valuable_items: extrae objetos de valor mencionados (estuches, electrónicos, documentos, etc.).
- inspection_details.entry_reason: motivo de ingreso o síntoma reportado por el cliente.
- inspection_details.will_diagnose: true si menciona "diagnóstico", "hay que diagnosticar", "requiere diagnóstico".
- inspection_details.is_warranty: true si menciona "garantía", "viene en garantía", "es garantía".
- inspection_details.authorize_test_drive: true si menciona "prueba de ruta", "autoriza prueba", "puede salir a probar".
- work_order.assigned_to_name: nombre del mecánico o empleado asignado si se menciona ("asígnalo a Juan", "para Carlos el mecánico").`;
      } else if (context === "quotation") {
        systemPrompt = `Eres el extractor de datos para cotizaciones en Eagles System ERP.
JSON:
{
  "action_type": "quotation",
  "customer": { "name": string, "phone": string, "email": string },
  "vehicle": { "brand": string, "model": string, "year": number, "plate": string },
  "quotation": {
    "items": [ { "type": "service" | "product", "description": string, "quantity": number, "price": number } ],
    "notes": string,
    "valid_until": string
  }
}`;
      } else if (context === "lead") {
        systemPrompt = `Eres el extractor de prospectos (leads) para Eagles System ERP.
JSON:
{
  "action_type": "lead",
  "lead": { "name": string, "phone": string, "email": string, "company": string, "notes": string, "estimated_value": number }
}`;
      } else if (context === "expense") {
        systemPrompt = `Eres el extractor de datos de gastos.
JSON:
{
  "action_type": "expense",
  "expense": { "amount": number, "description": string, "category": string, "payment_method": string }
}`;
      } else {
        systemPrompt = `Eres el orquestador inteligente de Eagles System ERP para talleres mecánicos. Analiza el texto y extrae TODA la información en formato JSON, seleccionando el action_type adecuado.
Acciones posibles: inventory, appointment, work-order, expense, quotation, lead.

GLOSARIO REDIRECCIÓN:
- "Vete a OT", "Muéstrame las OT", "Órdenes": action_type = "work-order".
- "Agendar cita", "Ver agenda", "Citas": action_type = "appointment".

Estructuras JSON requeridas según la acción:

- Si es "work-order" (orden de trabajo, OT, OTs, reparación, auto en taller):
{
  "action_type": "work-order",
  "customer": { "name": string, "phone": string, "email": string, "address": string },
  "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string, "vin": string, "mileage": number },
  "work_order": { "description": string, "budget": number, "notes": string, "deadline": string, "assigned_to_name": string },
  "inspection": { "fuel_level": "empty" | "quarter" | "half" | "three_quarters" | "full", "fluids": { "aceite_motor": boolean, "aceite_transmision": boolean, "liquido_frenos": boolean, "liquido_embrague": boolean, "refrigerante": boolean, "aceite_hidraulico": boolean, "limpia_parabrisas": boolean }, "dashboard_indicators": { "check_engine": boolean, "battery": boolean, "oil": boolean, "brake": boolean, "abs": boolean, "temperature": boolean, "airbag": boolean, "tpms": boolean, "lights": boolean, "transmission": boolean }, "vehicle_condition": { "luces": boolean, "cristales": boolean, "espejos": boolean, "plumas": boolean, "tapones_ruedas": boolean, "carroceria_sin_golpes": boolean, "tablero": boolean, "radio": boolean, "espejo_retrovisor": boolean, "cinturones": boolean, "tapetes": boolean, "manijas": boolean, "gato": boolean, "llanta_refaccion": boolean, "herramientas": boolean, "varilla_aceite": boolean, "cables_corriente": boolean } },
  "inspection_details": { "valuable_items": string, "entry_reason": string, "procedures": string, "will_diagnose": boolean, "is_warranty": boolean, "authorize_test_drive": boolean }
}

- Si es "appointment" (cita futura, agenda, reserva):
{
  "action_type": "appointment",
  "appointment": { 
    "customer": { "name": string, "phone": string, "email": string },
    "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string },
    "details": { "service_type": string, "date": string, "time": string, "notes": string, "duration_minutes": number }
  }
}

- Si es "inventory" (producto o refacción):
{
  "action_type": "inventory",
  "product": { "name": string, "sku": string, "category_name": string, "unit_price": number, "quantity": number, "min_quantity": number, "description": string }
}

- Si es "quotation" (cotización, presupuesto):
{
  "action_type": "quotation",
  "customer": { "name": string, "phone": string, "email": string },
  "vehicle": { "brand": string, "model": string, "year": number, "plate": string },
  "quotation": { "items": [ { "type": "service" | "product", "description": string, "quantity": number, "price": number } ], "notes": string, "valid_until": string }
}

- Si es "lead" (prospecto de ventas):
{
  "action_type": "lead",
  "lead": { "name": string, "phone": string, "email": string, "company": string, "notes": string, "estimated_value": number }
}

- Si es "expense" (gasto del taller):
{
  "action_type": "expense",
  "expense": { "amount": number, "description": string, "category": string, "payment_method": string }
}

CRÍTICO: 
- OT/OTs SIEMPRE es work-order.
- Extrae la mayor cantidad de información posible del texto del usuario.
- fuel_level: "vacio"->empty, "un cuarto"->quarter, "mitad"->half, "tres cuartos"->three_quarters, "lleno"->full.
- fluids: marca como true si el usuario dice que están bien o que los revise.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });

      const extractedData = JSON.parse(
        response.choices[0].message.content || "{}",
      );
      return NextResponse.json({ success: true, data: extractedData });
    }

    if (action === "inventory-copilot") {
      const { items } = payload || {};
      if (!items || !Array.isArray(items))
        return NextResponse.json(
          { error: "Faltan los items" },
          { status: 400 },
        );

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Eres Eagles System Copilot. Redacta una alerta de stock bajo.",
          },
          { role: "user", content: JSON.stringify(items) },
        ],
        temperature: 0.7,
      });

      return NextResponse.json({
        success: true,
        report: response.choices[0].message.content,
      });
    }

    if (action === "get-insights") {
      if (!supabaseAdmin) {
        return NextResponse.json({ error: "Configuración de servidor incompleta" }, { status: 500 });
      }
      const [
        { data: lowStock },
        { data: activeOrders },
        { data: recentCompletions },
        { data: openAdvances },
        { data: noMarginItems },
        { data: draftPurchaseOrders },
      ] = await Promise.all([
        supabaseAdmin
          .from("inventory")
          .select("name, quantity, minimum_stock, purchase_price, unit_price")
          .lt("quantity", 5)
          .eq("organization_id", organizationId)
          .limit(10),
        supabaseAdmin
          .from("work_orders")
          .select("status, description")
          .eq("organization_id", organizationId)
          .not("status", "eq", "completed")
          .limit(20),
        supabaseAdmin
          .from("work_orders")
          .select("description")
          .eq("status", "completed")
          .eq("organization_id", organizationId)
          .order("updated_at", { ascending: false })
          .limit(5),
        // Anticipos abiertos con saldo pendiente
        supabaseAdmin
          .from("cash_advances")
          .select("id, amount, purpose, created_at, employee:users!cash_advances_employee_id_fkey(name), expenses(amount)")
          .eq("organization_id", organizationId)
          .eq("status", "open")
          .limit(10),
        // Refacciones sin precio de compra (no se puede calcular anticipo)
        supabaseAdmin
          .from("inventory")
          .select("name, unit_price")
          .eq("organization_id", organizationId)
          .is("purchase_price", null)
          .gt("unit_price", 0)
          .limit(5),
        // Órdenes de compra pendientes de aprobación
        supabaseAdmin
          .from("purchase_orders")
          .select("id, order_number, total, status, created_at")
          .eq("organization_id", organizationId)
          .eq("status", "draft")
          .limit(5),
      ]);

      // Calcular saldos pendientes de anticipos
      const advancesWithBalance = (openAdvances || []).map((adv: any) => {
        const spent = (adv.expenses || []).reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
        return {
          purpose: adv.purpose,
          amount: Number(adv.amount),
          balance: Number(adv.amount) - spent,
          employee: adv.employee?.name ?? "Sin asignar",
          days_open: Math.floor((Date.now() - new Date(adv.created_at).getTime()) / 86400000),
        };
      });
      const totalPendingBalance = advancesWithBalance.reduce((s, a) => s + a.balance, 0);

      const contextData = {
        lowStock,
        activeOrders,
        recentCompletions,
        openAdvances: advancesWithBalance,
        totalPendingAdvanceBalance: totalPendingBalance,
        itemsWithoutPurchasePrice: noMarginItems,
        pendingApprovalPurchaseOrders: draftPurchaseOrders,
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres el analista experto de Eagles System ERP para un taller mecánico. Tu tarea es generar 3 insights estratégicos basados en los datos actuales del taller.

CONTEXTO DEL NEGOCIO:
- El taller maneja efectivo con empleados que salen a comprar refacciones (anticipos). Es crítico que los anticipos se liquiden.
- Las refacciones tienen costo de compra (purchase_price) y precio de venta (unit_price). Sin costo configurado no se pueden calcular anticipos automáticos.
- Las órdenes de compra en estado "draft" necesitan aprobación del dueño para evitar fraudes.

Reglas de formato (JSON):
Devuelve un objeto con "insights": array de exactamente 3 objetos con:
- title: Título corto y directo (máx 40 caracteres).
- description: Explicación concreta del hallazgo con números cuando estén disponibles.
- severity: "HIGH" (urgente, requiere acción hoy) o "MEDIUM" (importante, esta semana).
- actionLabel: Texto del botón de acción (MÁXIMO 20 caracteres, en mayúsculas).
- actionLink: Ruta interna para resolver el insight.

Rutas válidas:
- Inventario/stock bajo: "/inventarios"
- Anticipos pendientes: "/compras/anticipos"
- Órdenes pendientes de aprobación: "/compras/ordenes"
- Órdenes de trabajo activas: "/ordenes"
- Dashboard general: "/dashboard"

Prioriza insights en este orden:
1. Anticipos abiertos con saldo > $0 (riesgo de pérdida de efectivo)
2. Órdenes de compra pendientes de aprobación (posible fraude)
3. Stock bajo en refacciones críticas
4. Refacciones sin costo de compra configurado (opacidad de márgenes)
5. Carga de trabajo de órdenes activas`,
          },
          {
            role: "user",
            content: `Datos actuales del taller: ${JSON.stringify(contextData)}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const insightsData = JSON.parse(
        response.choices[0].message.content || '{"insights": []}',
      );
      return NextResponse.json({ success: true, ...insightsData });
    }

    return NextResponse.json(
      { error: "Acción no reconocida" },
      { status: 400 },
    );
  } catch (err: any) {
    console.error("[AI Assistant]", err);
    const status = err?.status ?? err?.response?.status ?? 500;
    let userMessage = "Error en el asistente de IA. Intenta de nuevo.";
    if (status === 429) {
      userMessage = "El servicio de IA está temporalmente no disponible. Por favor intenta en unos minutos.";
    } else if (status === 401 || status === 403) {
      userMessage = "Error de configuración del servicio de IA.";
    }
    return NextResponse.json(
      { error: userMessage },
      { status: 500 },
    );
  }
}



