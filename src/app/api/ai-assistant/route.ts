import { NextRequest, NextResponse } from 'next/server';
import { createClientFromRequest, getSupabaseServiceClient } from '@/lib/supabase/server';
import OpenAI from 'openai';
import { checkAIAgentEnabled } from '@/lib/billing/check-limits';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    throw new Error('OPENAI_API_KEY no está configurada');
  }
  return new OpenAI({ apiKey: apiKey.trim() });
};

export async function POST(request: NextRequest) {
  try {
    const supabase = createClientFromRequest(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseServiceClient();
    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('organization_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const organizationId = profile.organization_id;

    // Verificar si el agente de IA está habilitado para el plan
    const { allowed, error: limitError } = await checkAIAgentEnabled(organizationId);
    if (!allowed && limitError) {
      return NextResponse.json(
        {
          error: limitError.message,
          limit_reached: true,
          upgrade_url: limitError.upgrade_url || '/settings/billing',
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, payload } = body;

    if (!action) {
      return NextResponse.json({ error: 'Falta la acción' }, { status: 400 });
    }

    const openai = getOpenAIClient();

    if (action === 'draft-message') {
      const { workOrderId } = payload;
      if (!workOrderId) return NextResponse.json({ error: 'Falta workOrderId' }, { status: 400 });

      // Obtener detalles de la orden
      const { data: order, error: orderError } = await supabaseAdmin
        .from('work_orders')
        .select(`
          id,
          status,
          description,
          total_amount,
          entry_date,
          customer:customers(name, phone),
          vehicle:vehicles(brand, model, plate:license_plate, year)
        `)
        .eq('id', workOrderId)
        .eq('organization_id', organizationId)
        .single();

      if (orderError || !order) {
        return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
      }

      const SYSTEM_PROMPT = `Eres el asistente de Eagles System ERP. Tu tarea es redactar un mensaje de WhatsApp empático y profesional para un cliente sobre el estado de su orden de trabajo.
Usa la información proporcionada para crear un mensaje personalizado.
Reglas:
1. Sé amable y directo.
2. Incluye detalles del vehículo (Marca, Modelo, Placa).
3. Menciona el estado actual de forma clara.
4. Si hay un saldo o monto total, menciónalo profesionalmente.
5. El tono debe ser de taller de alta calidad (Premium).
6. Responde SOLO con el texto del mensaje, sin introducciones ni comentarios adicionales.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Redacta un mensaje para el cliente ${order.customer?.name} sobre su ${order.vehicle?.brand} ${order.vehicle?.model} (${order.vehicle?.plate}).
Estado actual: ${order.status}.
Descripción del trabajo: ${order.description}.
Total: ${order.total_amount ? '$' + order.total_amount : 'A definir'}.
Fecha de ingreso: ${order.entry_date}.` 
          }
        ],
        temperature: 0.7,
      });

      return NextResponse.json({ success: true, draft: response.choices[0].message.content });
    }

    if (action === 'magic-create') {
      const { text, context = 'auto' } = payload;
      if (!text) return NextResponse.json({ error: 'Falta el texto' }, { status: 400 });

      let systemPrompt = '';
      
      if (context === 'inventory') {
        systemPrompt = `Eres el extractor de datos de inventario de Eagles System ERP. Tu tarea es analizar un texto y extraer información para crear un producto/pieza.
Devuelve SIEMPRE un JSON válido con la siguiente estructura:
{
  "action_type": "inventory",
  "product": { 
    "name": string, 
    "sku": string, 
    "category_name": string, 
    "unit_price": number, 
    "stock": number, 
    "minimum_stock": number, 
    "description": string 
  }
}`;
      } else if (context === 'appointment') {
        systemPrompt = `Eres el extractor de datos de citas de Eagles System ERP. Tu tarea es analizar un texto y extraer información para agendar una cita.
Devuelve SIEMPRE un JSON válido con la siguiente estructura:
{
  "action_type": "appointment",
  "appointment": { 
    "customer": { "name": string, "phone": string, "email": string },
    "vehicle": { "brand": string, "model": string, "year": number, "plate": string },
    "details": { "service_type": string, "date": string (ISO YYYY-MM-DD), "time": string (HH:mm), "notes": string, "duration_minutes": number }
  }
}`;
      } else if (context === 'work-order') {
        systemPrompt = `Eres el extractor de datos de Eagles System ERP. Tu tarea es analizar un texto y extraer información para crear un cliente, un vehículo y una orden de trabajo.
Devuelve SIEMPRE un JSON válido con la siguiente estructura:
{
  "action_type": "work-order",
  "customer": { "name": string, "phone": string, "email": string },
  "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string },
  "work_order": { "description": string, "budget": number, "notes": string, "deadline": string }
}`;
      } else {
        // Orchestrator mode (auto detect)
        systemPrompt = `Eres el orquestador inteligente de Eagles System ERP. Tu tarea es analizar el texto del usuario y determinar con precisión qué desea hacer.

### REGLAS DE INTENCIÓN:
1. **inventory** (INVENTARIO): Si el usuario menciona "inventario", "agregar pieza", "repuesto", "stock", "producto", "sku", "precio de compra", "galones", "piezas", "cantidad".
   - Estructura: { "action_type": "inventory", "product": { "name": string, "stock": number, "unit_price": number, "sku": string, "category_name": string } }

2. **appointment** (CITA): Si el usuario menciona "cita", "agendar", "reservar", "programar", "venir el día...", "mañana a las...", "calendario".
   - Estructura: { "action_type": "appointment", "appointment": { "customer": { "name": string, "phone": string }, "details": { "service_type": string, "date": "YYYY-MM-DD", "time": "HH:mm", "notes": string } } }

3. **work-order** (ORDEN DE TRABAJO): Si el usuario menciona un problema mecánico, ruido, falla, "reparar", "componer", "trajo su carro", "abrir orden", "presupuesto de reparación".
   - Estructura: { "action_type": "work-order", "customer": { "name": string, "phone": string }, "vehicle": { "brand": string, "model": string, "plate": string }, "work_order": { "description": string, "budget": number } }

### CRÍTICO:
- Devuelve SIEMPRE un JSON válido.
- Si no hay una intención clara de inventario o cita, usa "work-order" como respaldo, pero sé estricto con las palabras clave de los otros.
- En citas, si no mencionan fecha, asume la fecha de hoy.`;
      }

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      const extractedData = JSON.parse(response.choices[0].message.content || '{}');

      return NextResponse.json({ success: true, data: extractedData });
    }

    if (action === 'get-insights') {
      // Obtener datos críticos para insights
      const [
        { data: lowStock },
        { data: activeOrders },
        { data: recentCompletions }
      ] = await Promise.all([
        supabaseAdmin
          .from('inventory')
          .select('name, stock, min_stock, sku')
          .lt('stock', 5) // Simplificado: stock bajo
          .eq('organization_id', organizationId)
          .limit(10),
        supabaseAdmin
          .from('work_orders')
          .select('status, description, vehicle_id, vehicles(brand, model)')
          .eq('organization_id', organizationId)
          .not('status', 'eq', 'completed')
          .limit(20),
        supabaseAdmin
          .from('work_orders')
          .select('description, entry_date, updated_at')
          .eq('status', 'completed')
          .eq('organization_id', organizationId)
          .order('updated_at', { ascending: false })
          .limit(5)
      ]);

      const SYSTEM_PROMPT = `Eres el analista de negocios de Eagles System ERP. Tu tarea es generar 3 "insights" (recomendaciones accionables) basados en los datos del taller.
Los datos incluyen inventario bajo, órdenes activas y trabajos recientes.
Reglas:
1. Sé profesional y directo.
2. Identifica patrones (ej: "Muchos Toyota con frenos", "Falta stock de aceite").
3. Asigna una importancia (HIGH, MEDIUM).
4. Proporciona una acción sugerida y un link interno (ej: "/inventario", "/ordenes").
5. Responde SIEMPRE en un JSON con este formato:
{
  "insights": [
    {
      "title": string,
      "description": string,
      "severity": "HIGH" | "MEDIUM",
      "actionLabel": string,
      "actionLink": string
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Datos del taller:
            Inventario bajo: ${JSON.stringify(lowStock)}
            Órdenes activas: ${JSON.stringify(activeOrders)}
            Recientes terminados: ${JSON.stringify(recentCompletions)}` 
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
      });

      const insightsData = JSON.parse(response.choices[0].message.content || '{"insights": []}');
      return NextResponse.json({ success: true, ...insightsData });
    }

    return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 });
  } catch (err: any) {
    console.error('[AI Assistant]', err);
    return NextResponse.json({ error: err?.message || 'Error en el asistente de IA' }, { status: 500 });
  }
}
