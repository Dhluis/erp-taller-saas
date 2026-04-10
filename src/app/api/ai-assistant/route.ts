import { NextRequest, NextResponse } from 'next/server';
import { NextRequest, NextResponse } from "next/server";
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
        systemPrompt = `Eres el extractor de datos de Eagles ERP. Extrae info para crear cliente, vehículo y orden de trabajo.
JSON:
{
  "action_type": "work-order",
  "customer": { "name": string, "phone": string, "email": string },
  "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string },
  "work_order": { "description": string, "budget": number, "notes": string, "deadline": string },
  "inspection": {
    "fuel_level": "empty" | "quarter" | "half" | "three_quarters" | "full",
    "fluids": { "aceite_motor": boolean, "aceite_transmision": boolean, "liquido_frenos": boolean, "liquido_embrague": boolean, "refrigerante": boolean, "aceite_hidraulico": boolean, "limpia_parabrisas": boolean }
  },
  "inspection_details": { "valuable_items": string, "entry_reason": string, "procedures": string }
}
Reglas:
- fuel_level: "vacio"->empty, "un cuarto"->quarter, "mitad"->half, "tres cuartos"->three_quarters, "lleno"->full.
- fluids: si dice que todos están bien, pon todos en true.
- inspection_details: extrae cosas de valor o el motivo específico si se menciona.`;
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
        systemPrompt = `Eres el extractor de prospectos (leads) para Eagles ERP.
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
        systemPrompt = `Eres el orquestador inteligente de Eagles System ERP. Analiza el texto y extrae TODA la información en el siguiente formato JSON estricto, seleccionando el action_type adecuado.
Acciones posibles: inventory, appointment, work-order, expense, quotation, lead.

Estructuras JSON requeridas según la acción:

- Si es "work-order" (orden de trabajo, reparación, auto en taller):
{
  "action_type": "work-order",
  "customer": { "name": string, "phone": string, "email": string },
  "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string },
  "work_order": { "description": string, "budget": number, "notes": string, "deadline": string },
  "inspection": { "fuel_level": "empty" | "quarter" | "half" | "three_quarters" | "full", "fluids": { "aceite_motor": boolean, "aceite_transmision": boolean, "liquido_frenos": boolean, "liquido_embrague": boolean, "refrigerante": boolean, "aceite_hidraulico": boolean, "limpia_parabrisas": boolean } },
  "inspection_details": { "valuable_items": string, "entry_reason": string, "procedures": string }
}

- Si es "appointment" (cita futura):
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
- Extrae la mayor cantidad de información posible del texto del usuario y ponla en los campos correspondientes.
- fuel_level DEBE ser exacto: "empty", "quarter", "half", "three_quarters" o "full". Si dice "vacio"->empty, "un cuarto"->quarter, "mitad"->half, "tres cuartos"->three_quarters, "lleno"->full.
- fluids: marca como true si el usuario dice que están bien o que los revise.
- extraer email y teléfono si se mencionan.`;
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
            content: "Eres Eagles Copilot. Redacta una alerta de stock bajo.",
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
      const [
        { data: lowStock },
        { data: activeOrders },
        { data: recentCompletions },
      ] = await Promise.all([
        supabaseAdmin
          .from("inventory")
          .select("name, quantity")
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
      ]);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Eres el analista experto de Eagles System ERP. Tu tarea es generar 3 insights estratégicos basados en los datos del taller.
            
Reglas de formato (JSON):
Debes devolver un objeto con una propiedad "insights" que sea un array de 3 objetos con:
- title: Título corto y directo (ej: "Stock Crítico de Aceite").
- description: Explicación breve del hallazgo.
- severity: "HIGH" (urgente) o "MEDIUM" (informativo/importante).
- actionLabel: Texto corto para un botón de acción (ej: "REVISAR STOCK", "VER ÓRDENES"). MÁXIMO 20 caracteres.
- actionLink: La ruta interna del dashboard para resolver el insight.

Rutas válidas para actionLink:
- Si es de inventario/stock: "/inventarios"
- Si es de órdenes de trabajo/carga: "/ordenes"
- Si es general: "/dashboard"

Ejemplo de respuesta:
{
  "insights": [
    {
      "title": "Bajo Stock de Aceite",
      "description": "Tienes 3 productos con menos de 5 unidades.",
      "severity": "HIGH",
      "actionLabel": "GESTIONAR STOCK",
      "actionLink": "/inventarios"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Datos actuales del taller: ${JSON.stringify({ lowStock, activeOrders, recentCompletions })}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
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
    return NextResponse.json(
      { error: err?.message || "Error en el asistente de IA" },
      { status: 500 },
    );
  }
}
