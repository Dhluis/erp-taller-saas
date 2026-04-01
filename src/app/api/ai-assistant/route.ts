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

    if (!profile || !(profile as any).organization_id) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 403 });
    }

    const organizationId = (profile as any).organization_id;

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
      const { workOrderId, origin = 'https://eaglessystem.io' } = payload;
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
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Redacta un mensaje para el cliente ${(order as any).customer?.name} sobre su ${(order as any).vehicle?.brand} ${(order as any).vehicle?.model} (${(order as any).vehicle?.plate}).
Estado actual: ${(order as any).status}.
Descripción del trabajo: ${(order as any).description}.
Total: ${(order as any).total_amount ? '$' + (order as any).total_amount : 'A definir'}.
Fecha de ingreso: ${(order as any).entry_date}.
Enlace de seguimiento en vivo: ${trackingUrl}` 
          }
        ],
        temperature: 0.7,
      });

      return NextResponse.json({ success: true, draft: response.choices[0].message.content });
    }

    if (action === 'draft-lead-message') {
      const { leadId } = payload;
      if (!leadId) return NextResponse.json({ error: 'Falta leadId' }, { status: 400 });

      // Obtener detalles del lead
      const { data: rawLead, error: leadError } = await supabaseAdmin
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('organization_id', organizationId)
        .single();
        
      const lead = rawLead as any;

      if (leadError || !lead) {
        return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
      }

      const statusMap: Record<string, string> = {
        'new': 'Nuevo',
        'contacted': 'Contactado (Esperando respuesta)',
        'quoted': 'Cotizado (Esperando aprobación)',
        'lost': 'No interesado / Perdido',
        'won': 'Convertido / Ganado'
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
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Redacta un mensaje para el cliente/prospecto: ${lead.name}
Teléfono registrado: ${lead.phone}
Empresa: ${lead.company || 'N/A'}
Estado en el embudo de ventas: ${statusMap[lead.status] || lead.status}
Notas internas sobre el prospecto: ${lead.notes || 'No hay notas adicionales'}
Valor presupuestado/estimado: ${lead.estimated_value ? '$' + lead.estimated_value : 'No definido'}` 
          }
        ],
        temperature: 0.7,
      });

      return NextResponse.json({ success: true, message: response.choices[0].message.content });
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
    "quantity": number, 
    "min_quantity": number, 
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
    "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string },
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
  "work_order": { "description": string, "budget": number, "notes": string, "deadline": string },
  "inspection": {
    "fuel_level": "empty" | "1/4" | "half" | "3/4" | "full",
    "fluids": {
      "aceite_motor": boolean,
      "aceite_transmision": boolean,
      "liquido_frenos": boolean,
      "liquido_embrague": boolean,
      "refrigerante": boolean,
      "aceite_hidraulico": boolean,
      "limpia_parabrisas": boolean
    }
  }
}

Reglas de Inspección:
- fuel_level: Mapea "vacio" -> "empty", "un cuarto" -> "1/4", "mitad" -> "half", "tres cuartos" -> "3/4", "lleno" -> "full". Por defecto usar null si no se menciona.
- fluids: Si el usuario dice "revisar [fluido]" o "[fluido] bien" o "[fluido] ok", marca como true. Si dice "todos los fluidos están bien", pon todos en true.`;
      } else if (context === 'expense') {
        systemPrompt = `Eres el extractor de datos de gastos de Eagles System ERP. Tu tarea es analizar un texto dictado por el gerente del taller y extraer información para registrar un gasto.
Devuelve SIEMPRE un JSON válido con la siguiente estructura:
{
  "action_type": "expense",
  "expense": { 
    "amount": number, 
    "description": string, 
    "category": string, 
    "payment_method": string,
    "cash_account_hint": string
  }
}

Reglas:
- category: Clasifica razonablemente (ej. "Alimentos", "Refacciones", "Operativos", "Papelería").
- payment_method: ("cash", "bank_transfer", "credit_card", "debit_card", "other").
- cash_account_hint: Si menciona "caja chica", "efectivo en caja", etc., anótalo aquí para intentar deducirlo luego.
- amount: Extraer el monto numérico exacto sin símbolos monetarios.`;
      } else {
        // Orchestrator mode (auto detect)
        systemPrompt = `Eres el orquestador inteligente de Eagles System ERP. Tu tarea es analizar el texto del usuario y determinar con precisión qué desea hacer.

### REGLAS DE INTENCIÓN:
1. **inventory** (INVENTARIO): Si el usuario menciona "inventario", "agregar pieza", "repuesto", "stock", "producto", "sku", "precio de compra", "galones", "piezas", "cantidad".
   - Estructura: { "action_type": "inventory", "product": { "name": string, "quantity": number, "unit_price": number, "sku": string, "category_name": string } }

2. **appointment** (CITA): Si el usuario menciona "cita", "agendar", "reservar", "programar", "venir el día...", "mañana a las...", "calendario".
   - Estructura: { "action_type": "appointment", "appointment": { "customer": { "name": string, "phone": string }, "details": { "service_type": string, "date": "YYYY-MM-DD", "time": "HH:mm", "notes": string } } }

3. **work-order** (ORDEN DE TRABAJO): Si el usuario menciona un problema mecánico, ruido, falla, "reparar", "componer", "trajo su carro", "abrir orden", "presupuesto de reparación".
   - Estructura: { 
       "action_type": "work-order", 
       "customer": { "name": string, "phone": string, "email": string }, 
       "vehicle": { "brand": string, "model": string, "year": number, "plate": string, "color": string }, 
       "work_order": { "description": string, "budget": number },
       "inspection": {
         "fuel_level": "empty" | "1/4" | "half" | "3/4" | "full",
         "fluids": { "aceite_motor": boolean, "aceite_transmision": boolean, "liquido_frenos": boolean, "liquido_embrague": boolean, "refrigerante": boolean, "aceite_hidraulico": boolean, "limpia_parabrisas": boolean }
       }
     }

4. **expense** (GASTO): Si el usuario menciona "compré", "gasté", "pagué", "ticket", "caja chica", "pizza", "comida", "almuerzo", "papelería".
   - Estructura: { "action_type": "expense", "expense": { "amount": number, "description": string, "category": string, "payment_method": string, "cash_account_hint": string } }

### CRÍTICO:
- Devuelve SIEMPRE un JSON válido.
- **Nivel de combustible**: Mapea "vacio" -> "empty", "un cuarto" -> "1/4", "mitad" -> "half", "tres cuartos" -> "3/4", "lleno" -> "full".
- **Fluidos**: Si dice "todos los fluidos bien", marca las 7 claves de `fluids` como true.
- Si no hay una intención clara, usa "work-order" como respaldo, pero evalúa estrictamente sus palabras.
- En citas, si no mencionan fecha, asume la fecha de hoy.
- Para el correo electrónico, búscalo con patrones de "x@y.com".`;
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

    if (action === 'inventory-copilot') {
      const { items } = payload;
      if (!items || !Array.isArray(items)) {
        return NextResponse.json({ error: 'Faltan los items del inventario' }, { status: 400 });
      }

      if (items.length === 0) {
        return NextResponse.json({ success: true, report: '¡Todo excelente! Tu inventario está saludable y no detectamos productos por debajo del mínimo requerido.' });
      }

      const SYSTEM_PROMPT = `Eres Eagles Copilot, el asistente inteligente de compras e inventarios para un Taller Mecánico Premium.
      Tu tarea es recibir una lista de productos que están bajos en stock y redactar una alerta ejecutiva corta pero urgente para el dueño/gerente del taller.
      
      REGLAS:
      1. Sé directo, amigable pero muestra la urgencia si hay muchos productos en cero.
      2. Agrupa o resalta los productos más importantes basándote en la información.
      3. Sugiere hacer un pedido a sus proveedores pronto para no detener las reparaciones.
      4. El tono debe ser moderno, eficiente y empático.
      5. Devuelve SOLO el texto formateado (puedes usar Markdown usando negritas, listas o emojis para formato). Nada de introducciones previas ni JSON, solo el mensaje que leerá el usuario final.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { 
            role: 'user', 
            content: `Aquí están los productos en riesgo de escasez (stock actual <= stock mínimo):\n\n${JSON.stringify(items, null, 2)}` 
          }
        ],
        temperature: 0.7,
      });

      return NextResponse.json({ success: true, report: response.choices[0].message.content });
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
          .select('name, quantity, min_quantity, sku')
          .lt('quantity', 5) // Simplificado: stock bajo
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

### RUTAS VÁLIDAS (USA SOLO ESTAS):
- /inventarios (Para temas de piezas, stock, productos)
- /ordenes (Para temas de reparaciones, estados de vehículos)
- /citas (Para agendar mantenimiento o revisiones)
- /clientes (Para gestión de contactos)
- /ingresos (Para temas de cobros, dinero, pagos)

Reglas:
1. Sé profesional y directo.
2. Identifica patrones (ej: "Muchos Toyota con frenos", "Falta stock de aceite").
3. Asigna una importancia (HIGH, MEDIUM).
4. El "actionLink" DEBE ser una de las RUTAS VÁLIDAS mencionadas arriba. PROHIBIDO inventar rutas como /ordenes o /inventario.
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
