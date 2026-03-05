// src/integrations/whatsapp/services/ai-agent.ts

/**
 * 🤖 AI Agent Service
 * 
 * Soporta múltiples providers:
 * - OpenAI (GPT-4, GPT-3.5)
 * - Anthropic (Claude) - Opcional, requiere @anthropic-ai/sdk
 */

import OpenAI from 'openai';
// Anthropic se importa dinámicamente solo cuando se necesita
// NOTA: @anthropic-ai/sdk es opcional. Si no está instalado, el provider Anthropic no funcionará
import {
  loadAIContext,
  getAIConfig,
  getConversationHistory,
  buildSystemPrompt,
  isWithinBusinessHours
} from './context-loader';
import { executeFunction } from './function-executor';
import type { AIFunctionCall } from '../types';

// NOTA: Next.js debería cargar automáticamente las variables de .env.local
// Este fallback solo se ejecuta si Next.js no las carga correctamente
// Si ves este mensaje frecuentemente, investiga por qué Next.js no carga las variables
if (typeof window === 'undefined' && !process.env.OPENAI_API_KEY) {
  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      let loaded = false;
      envContent.split(/\r?\n/).forEach((line: string) => {
        const trimmedLine = line.trim();
        if (trimmedLine && !trimmedLine.startsWith('#') && trimmedLine.includes('=')) {
          const [key, ...valueParts] = trimmedLine.split('=');
          const value = valueParts.join('=').trim();
          if (key && value && !process.env[key]) {
            process.env[key] = value;
            if (key === 'OPENAI_API_KEY') {
              loaded = true;
            }
          }
        }
      });
      if (loaded) {
        console.warn('[AIAgent] ⚠️ Fallback: Variables cargadas manualmente desde .env.local');
        console.warn('[AIAgent] ⚠️ Next.js debería cargar esto automáticamente. Verifica la configuración.');
      }
    }
  } catch (error) {
    console.error('[AIAgent] ❌ Error cargando .env.local manualmente:', error);
  }
}

// Cliente OpenAI - inicializado lazy (solo cuando se necesita)
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    
    // Debug: Log para ver qué está pasando (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('[AIAgent] 🔍 Verificando OPENAI_API_KEY...');
      console.log('[AIAgent] API Key presente:', !!apiKey);
      console.log('[AIAgent] API Key length:', apiKey?.length || 0);
      console.log('[AIAgent] API Key starts with sk-:', apiKey?.startsWith('sk-') || false);
      
      // Verificar todas las variables de entorno relacionadas con OpenAI
      const allEnvKeys = Object.keys(process.env).filter(key => 
        key.includes('OPENAI') || key.includes('ANTHROPIC')
      );
      console.log('[AIAgent] Variables de entorno relacionadas:', allEnvKeys);
    }
    
    if (!apiKey || apiKey === '' || apiKey.trim() === '') {
      const errorMsg = 'OPENAI_API_KEY no está configurada. Verifica tu archivo .env.local y reinicia el servidor (npm run dev)';
      console.error('[AIAgent] ❌', errorMsg);
      throw new Error(errorMsg);
    }
    
    // Limpiar espacios en blanco por si acaso
    const cleanApiKey = apiKey.trim();
    
    openaiClient = new OpenAI({
      apiKey: cleanApiKey
    });
    
    console.log('[AIAgent] ✅ Cliente OpenAI inicializado correctamente');
  }
  return openaiClient;
}

// Anthropic se inicializa dinámicamente solo cuando se necesita
let anthropicClient: any = null;
let anthropicAvailable: boolean | null = null;

async function getAnthropicClient() {
  // Verificar si Anthropic está disponible (solo una vez)
  if (anthropicAvailable === null) {
    try {
      // Intentar importar dinámicamente usando una función para evitar que Next.js lo resuelva en build
      const loadAnthropic = async () => {
        try {
          // Usar import dinámico con string literal para evitar que Next.js lo resuelva en build
          // @ts-ignore - Importación dinámica opcional
          const moduleName = '@anthropic-ai/sdk';
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return await import(moduleName);
        } catch (err: any) {
          // Si el módulo no está disponible, retornar null
          if (err?.code === 'MODULE_NOT_FOUND' || err?.message?.includes('Cannot find module')) {
            return null;
          }
          throw err;
        }
      };
      
      const anthropicModule = await loadAnthropic();
      
      if (!anthropicModule) {
        anthropicAvailable = false;
        throw new Error('Anthropic SDK no está disponible');
      }
      
      const Anthropic = anthropicModule.default || anthropicModule.Anthropic;
      
      if (!Anthropic) {
        anthropicAvailable = false;
        throw new Error('Anthropic SDK no está disponible');
      }
      
      anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || ''
      });
      anthropicAvailable = true;
    } catch (error: any) {
      anthropicAvailable = false;
      // No lanzar error aquí, solo marcar como no disponible
      console.warn('[AI Agent] Anthropic SDK no está disponible:', error.message);
    }
  }
  
  if (!anthropicAvailable || !anthropicClient) {
      throw new Error('Anthropic SDK no está instalado. Ejecuta: npm install @anthropic-ai/sdk');
    }
  
  return anthropicClient;
}

interface ProcessMessageParams {
  conversationId: string;
  organizationId: string;
  customerMessage: string;
  customerPhone: string;
  skipBusinessHoursCheck?: boolean; // Para pruebas, saltar verificación de horarios
  useServiceClient?: boolean; // Para pruebas, usar service client (bypass RLS)
}

interface ProcessMessageResult {
  success: boolean;
  response?: string;
  functionsCalled?: string[];
  error?: string;
}

/**
 * Procesa un mensaje del cliente y genera respuesta
 */
export async function processMessage(
  params: ProcessMessageParams
): Promise<ProcessMessageResult> {
  try {
    console.log('[AIAgent] 🚀 Procesando mensaje para conversación:', params.conversationId);
    console.log('[AIAgent] 📍 Organization ID:', params.organizationId);
    console.log('[AIAgent] 📱 Customer Phone:', params.customerPhone);
    console.log('[AIAgent] 💬 Mensaje:', params.customerMessage.substring(0, 100));

    // 1. Cargar configuración del AI
    // Usar service client si se solicita (para pruebas que acaban de guardar la config)
    console.log('[AIAgent] 🔍 Cargando configuración AI...');
    const aiConfig = await getAIConfig(params.organizationId, params.useServiceClient || false);
    
    // ✅ VALIDAR QUE LA CONFIGURACIÓN EXISTA PRIMERO
    if (!aiConfig) {
      console.error('[AIAgent] ❌ AI Agent no está configurado para esta organización');
      return {
        success: false,
        error: 'AI Agent no está configurado para esta organización. Por favor, completa la configuración del agente antes de probarlo.'
      };
    }

    // 🔍 LOG DETALLADO DE CONFIGURACIÓN
    console.log('[AIAgent] 📋 ====== CONFIGURACIÓN AI CARGADA ======');
    console.log('[AIAgent] ✅ Enabled:', aiConfig.enabled);
    console.log('[AIAgent] 🤖 Provider:', aiConfig.provider);
    console.log('[AIAgent] 🧠 Model:', aiConfig.model);
    console.log('[AIAgent] 🎭 Personality:', aiConfig.personality);
    console.log('[AIAgent] 🌍 Language:', aiConfig.language);
    console.log('[AIAgent] 🌡️ Temperature:', aiConfig.temperature);
    console.log('[AIAgent] 📏 Max Tokens:', aiConfig.max_tokens);
    console.log('[AIAgent] 📅 Auto Schedule:', aiConfig.auto_schedule_appointments);
    console.log('[AIAgent] 📝 Auto Create Orders:', aiConfig.auto_create_orders);
    console.log('[AIAgent] 👤 Require Human Approval:', aiConfig.require_human_approval);
    console.log('[AIAgent] ⏰ Business Hours Only:', aiConfig.business_hours_only);
    console.log('[AIAgent] 📜 System Prompt Length:', aiConfig.system_prompt?.length || 0);
    console.log('[AIAgent] 📜 System Prompt Preview:', aiConfig.system_prompt?.substring(0, 150));
    console.log('[AIAgent] ========================================');
    
    if (!aiConfig.enabled) {
      console.log('[AIAgent] Bot deshabilitado para esta organización');
      return {
        success: false,
        error: 'Bot no está habilitado'
      };
    }
    
    // ✅ AHORA SÍ podemos acceder a aiConfig.provider de forma segura
    // Validar API keys antes de procesar
    if (aiConfig.provider === 'openai' && !process.env.OPENAI_API_KEY) {
      console.error('[AIAgent] ❌ OPENAI_API_KEY no está configurada');
      return {
        success: false,
        error: 'OPENAI_API_KEY no está configurada. Por favor, agrega tu API key en el archivo .env.local. Obtén tu key en: https://platform.openai.com/api-keys'
      };
    }
    
    if (aiConfig.provider === 'anthropic') {
      // Verificar si Anthropic está disponible
      if (anthropicAvailable === false) {
        throw new Error('Anthropic SDK no está instalado. Ejecuta: npm install @anthropic-ai/sdk');
      }
      
      if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[AIAgent] ❌ ANTHROPIC_API_KEY no está configurada');
      return {
        success: false,
        error: 'ANTHROPIC_API_KEY no está configurada. Por favor, agrega tu API key en el archivo .env.local. Obtén tu key en: https://console.anthropic.com/settings/keys'
      };
      }
    }

    // 2. Cargar contexto del taller
    // Usar service client si se solicita (para pruebas que acaban de guardar la config)
    const context = await loadAIContext(params.organizationId, params.conversationId, params.useServiceClient || false);

    if (!context) {
      console.error('[AIAgent] No se pudo cargar contexto');
      return {
        success: false,
        error: 'No se pudo cargar contexto del taller'
      };
    }

    // 3. Verificar horarios si está configurado (solo si no se omite la verificación)
    if (aiConfig.business_hours_only && !params.skipBusinessHoursCheck) {
      const isOpen = isWithinBusinessHours(context.business_hours);
      if (!isOpen) {
        console.log('[AIAgent] Fuera de horario, retornando mensaje automático');
        return {
          success: true,
          response: `Gracias por contactarnos. Actualmente estamos fuera de horario.\n\n` +
                   `📅 Nuestro horario es:\n${formatBusinessHours(context.business_hours)}\n\n` +
                   `Te responderemos en cuanto abramos. 😊`
        };
      }
    } else if (params.skipBusinessHoursCheck) {
      console.log('[AIAgent] ⚠️ Verificación de horarios omitida (modo prueba)');
    }

    // 4. Cargar historial de conversación
    const history = await getConversationHistory(params.conversationId, 10);
    console.log('[AIAgent] 📚 Historial cargado:', history.length, 'mensajes');

    // 5. Construir system prompt
    console.log('[AIAgent] 🔨 Construyendo system prompt...');
    const systemPrompt = buildSystemPrompt(aiConfig, context);
    
    // 🔍 LOG DEL SYSTEM PROMPT COMPLETO (CRÍTICO PARA DEBUG)
    console.log('[AIAgent] ====== SYSTEM PROMPT CONSTRUIDO ======');
    console.log(systemPrompt);
    console.log('[AIAgent] ============================================');
    console.log('[AIAgent] 📏 System Prompt Length:', systemPrompt.length, 'caracteres');

    // 6. Procesar según el provider
    console.log('[AIAgent] 🚀 Llamando a provider:', aiConfig.provider);
    if (aiConfig.provider === 'openai') {
      return await processWithOpenAI({
        aiConfig,
        systemPrompt,
        history,
        customerMessage: params.customerMessage,
        organizationId: params.organizationId,
        conversationId: params.conversationId,
        customerPhone: params.customerPhone
      });
    } else if (aiConfig.provider === 'anthropic') {
      return await processWithAnthropic({
        aiConfig,
        systemPrompt,
        history,
        customerMessage: params.customerMessage,
        organizationId: params.organizationId,
        conversationId: params.conversationId,
        customerPhone: params.customerPhone
      });
    } else {
      return {
        success: false,
        error: `Provider no soportado: ${aiConfig.provider}`
      };
    }

  } catch (error) {
    console.error('[AIAgent] Error procesando mensaje:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en AI Agent'
    };
  }
}

/**
 * Procesa mensaje con OpenAI (GPT)
 */
async function processWithOpenAI(params: {
  aiConfig: any;
  systemPrompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  customerMessage: string;
  organizationId: string;
  conversationId: string;
  customerPhone: string;
}): Promise<ProcessMessageResult> {
  
  // Validar API key
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '') {
    console.error('[AIAgent] ❌ OPENAI_API_KEY no está configurada');
    return {
      success: false,
      error: 'OPENAI_API_KEY no está configurada. Por favor, crea el archivo .env.local en la raíz del proyecto y agrega: OPENAI_API_KEY=sk-tu-api-key-aqui'
    };
  }
  
  // Definir funciones para OpenAI
  // Solo agregar funciones de agendamiento si auto_schedule_appointments está habilitado
  const functions: OpenAI.Chat.ChatCompletionCreateParams.Function[] = [];
  
  if (params.aiConfig.auto_schedule_appointments) {
    functions.push(
    {
      name: 'create_appointment_request',
      description: 'Crea una solicitud de cita cuando el cliente quiere agendar. Usa esta función cuando tengas suficiente información: servicio, vehículo, fecha y hora. NO uses esta función si falta información importante - mejor pregunta al cliente de forma natural.',
      parameters: {
        type: 'object',
        properties: {
          service_type: {
            type: 'string',
            description: 'Tipo de servicio que el cliente necesita (ej: "Cambio de aceite", "Alineación", "Frenos")'
          },
          vehicle_description: {
            type: 'string',
            description: 'Descripción del vehículo (marca, modelo, año, o lo que el cliente haya mencionado)'
          },
          preferred_date: {
            type: 'string',
            description: 'Fecha preferida en formato YYYY-MM-DD'
          },
          preferred_time: {
            type: 'string',
            description: 'Hora preferida en formato HH:MM (24h, ej: "14:30")'
          },
          customer_name: {
            type: 'string',
            description: 'Nombre del cliente (opcional, si el cliente lo mencionó)'
          },
          estimated_price: {
            type: 'number',
            description: 'Precio estimado del servicio si está disponible en la configuración (opcional)'
          },
          notes: {
            type: 'string',
            description: 'Notas adicionales que el cliente haya mencionado (opcional)'
          }
        },
        required: ['service_type', 'vehicle_description', 'preferred_date', 'preferred_time']
      }
    },
    {
      name: 'check_availability',
      description: 'Consulta la disponibilidad de horarios para una fecha específica. Usa esta función cuando el cliente pregunta sobre horarios disponibles o si necesitas verificar antes de crear una solicitud de cita.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Fecha a verificar en formato YYYY-MM-DD'
          }
        },
        required: ['date']
      }
    },
      {
        name: 'get_services_info',
        description: 'Obtiene información sobre los servicios disponibles (precios, duraciones, descripciones). Usa esta función cuando el cliente pregunte por servicios o precios.',
        parameters: {
          type: 'object',
          properties: {
            service_name: {
              type: 'string',
              description: 'Nombre del servicio específico a consultar (opcional). Si no se proporciona, retorna todos los servicios.'
            }
          },
          required: []
        }
      }
    );
  }
  
  // Funciones que siempre están disponibles
  functions.push(
    {
      name: 'get_service_price',
      description: 'Consulta el precio de un servicio específico',
      parameters: {
        type: 'object',
        properties: {
          service_name: {
            type: 'string',
            description: 'Nombre del servicio a consultar'
          }
        },
        required: ['service_name']
      }
    },
    {
      name: 'create_quote',
      description: 'Crea una cotización con uno o más servicios',
      parameters: {
        type: 'object',
        properties: {
          customer_name: {
            type: 'string',
            description: 'Nombre del cliente'
          },
          services: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de nombres de servicios a cotizar'
          },
          vehicle_brand: {
            type: 'string',
            description: 'Marca del vehículo'
          },
          vehicle_model: {
            type: 'string',
            description: 'Modelo del vehículo'
          }
        },
        required: ['customer_name', 'services']
      }
    },
    {
      name: 'get_cash_balance',
      description: 'Consulta el saldo actual de las cuentas de efectivo del taller. Usa esta función cuando el dueño pregunte por el dinero disponible en caja, saldo de cuentas, cuánto efectivo hay, dinero en caja, etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'get_business_summary',
      description: 'Obtiene un resumen general del negocio: órdenes de trabajo pendientes, ingresos del día y saldo de caja. Úsalo cuando el dueño pregunte por el estado general del taller, cuántas órdenes hay activas, qué tal va el día, resumen del negocio, etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  );

  // Construir mensajes
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: params.systemPrompt
    },
    ...params.history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    {
      role: 'user',
      content: params.customerMessage
    }
  ];

  const functionsCalled: string[] = [];

  // Loop para manejar function calling
  let continueLoop = true;
  let finalResponse = '';

  while (continueLoop) {
    console.log('[AIAgent/OpenAI] Llamando a OpenAI API...');

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: params.aiConfig.model,
      messages: messages,
      ...(functions.length > 0 ? { functions: functions, function_call: 'auto' } : {}),
      temperature: params.aiConfig.temperature,
      max_tokens: params.aiConfig.max_tokens
    } as any);

    const choice = response.choices[0];

    if (choice.message.function_call) {
      // OpenAI quiere ejecutar una función
      const functionName = choice.message.function_call.name;
      const functionArgs = JSON.parse(choice.message.function_call.arguments);

      console.log('[AIAgent] 🔧 Function call:', functionName);
      console.log('[AIAgent] 📋 Args:', JSON.stringify(functionArgs, null, 2));
      functionsCalled.push(functionName);

      // Agregar customer_phone si no está
      if (!functionArgs.customer_phone) {
        functionArgs.customer_phone = params.customerPhone;
      }

      const functionCall: AIFunctionCall = {
        name: functionName as any,
        arguments: functionArgs
      };

      const result = await executeFunction(
        functionCall,
        params.organizationId,
        params.conversationId,
        params.customerPhone
      );

      // Agregar la llamada a función y su resultado a los mensajes
      messages.push(choice.message);
      messages.push({
        role: 'function',
        name: functionName,
        content: JSON.stringify(result)
      } as any);

    } else {
      // No hay más funciones, tenemos la respuesta final
      finalResponse = choice.message.content || '';
      continueLoop = false;
    }
  }

  return {
    success: true,
    response: finalResponse,
    functionsCalled: functionsCalled.length > 0 ? functionsCalled : undefined
  };
}

/**
 * Procesa mensaje con Anthropic (Claude)
 */
async function processWithAnthropic(params: {
  aiConfig: any;
  systemPrompt: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  customerMessage: string;
  organizationId: string;
  conversationId: string;
  customerPhone: string;
}): Promise<ProcessMessageResult> {
  
  // Definir tools para Claude
  const tools: any[] = [
    {
      name: 'create_appointment_request',
      description: 'Crea una solicitud de cita cuando el cliente quiere agendar. Usa esta función cuando tengas suficiente información: servicio, vehículo, fecha y hora.',
      input_schema: {
        type: 'object',
        properties: {
          service_type: { type: 'string', description: 'Tipo de servicio que el cliente necesita' },
          vehicle_description: { type: 'string', description: 'Descripción del vehículo (marca, modelo, año)' },
          preferred_date: { type: 'string', description: 'Fecha preferida en formato YYYY-MM-DD' },
          preferred_time: { type: 'string', description: 'Hora preferida en formato HH:MM (24h)' },
          customer_name: { type: 'string', description: 'Nombre del cliente (opcional)' },
          estimated_price: { type: 'number', description: 'Precio estimado del servicio si está disponible (opcional)' },
          notes: { type: 'string', description: 'Notas adicionales (opcional)' }
        },
        required: ['service_type', 'vehicle_description', 'preferred_date', 'preferred_time']
      }
    },
    {
      name: 'check_availability',
      description: 'Consulta la disponibilidad de horarios para una fecha específica. Usa esta función cuando el cliente pregunta sobre horarios disponibles.',
      input_schema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Fecha a verificar en formato YYYY-MM-DD' }
        },
        required: ['date']
      }
    },
    {
      name: 'get_service_price',
      description: 'Consulta precio de servicio',
      input_schema: {
        type: 'object',
        properties: {
          service_name: { type: 'string', description: 'Nombre del servicio' }
        },
        required: ['service_name']
      }
    },
    {
      name: 'create_quote',
      description: 'Crea cotización',
      input_schema: {
        type: 'object',
        properties: {
          customer_name: { type: 'string' },
          services: { type: 'array', items: { type: 'string' } },
          vehicle_brand: { type: 'string' },
          vehicle_model: { type: 'string' }
        },
        required: ['customer_name', 'services']
      }
    },
    {
      name: 'get_cash_balance',
      description: 'Consulta el saldo actual de las cuentas de efectivo del taller. Usa cuando el dueño pregunte por el dinero en caja, saldo, cuánto efectivo hay, etc.',
      input_schema: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    {
      name: 'get_business_summary',
      description: 'Resumen general del negocio: órdenes activas, ingresos del día y saldo de caja. Úsalo cuando el dueño pregunte por el estado general del taller o qué tal va el día.',
      input_schema: {
        type: 'object',
        properties: {},
        required: []
      }
    }
  ];

  const messages: any[] = [
    ...params.history.map(msg => ({
      role: msg.role,
      content: msg.content
    })),
    {
      role: 'user',
      content: params.customerMessage
    }
  ];

  const functionsCalled: string[] = [];
  const anthropic = await getAnthropicClient();
  let response = await anthropic.messages.create({
    model: params.aiConfig.model,
    max_tokens: params.aiConfig.max_tokens,
    temperature: params.aiConfig.temperature,
    system: params.systemPrompt,
    messages: messages as any,
    tools
  });

  while (response.stop_reason === 'tool_use') {
    const toolUses = response.content.filter(
      (block): block is any => block.type === 'tool_use'
    );

    const toolResults: any[] = [];

    for (const toolUse of toolUses) {
      console.log('[AIAgent/Claude] Ejecutando función:', toolUse.name);
      functionsCalled.push(toolUse.name);

      const functionCall: AIFunctionCall = {
        name: toolUse.name as any,
        arguments: toolUse.input as any
      };

      if (!functionCall.arguments.customer_phone) {
        functionCall.arguments.customer_phone = params.customerPhone;
      }

      const result = await executeFunction(
        functionCall,
        params.organizationId,
        params.conversationId,
        params.customerPhone
      );

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: JSON.stringify(result)
      });
    }

    messages.push({ role: 'assistant', content: response.content } as any);
    messages.push({ role: 'user', content: toolResults } as any);

    response = await anthropic.messages.create({
      model: params.aiConfig.model,
      max_tokens: params.aiConfig.max_tokens,
      temperature: params.aiConfig.temperature,
      system: params.systemPrompt,
      messages: messages as any,
      tools
    });
  }

  const textBlocks = response.content.filter(
    (block): block is any => block.type === 'text'
  );

  const finalText = textBlocks.map(block => block.text).join('\n');

  return {
    success: true,
    response: finalText,
    functionsCalled: functionsCalled.length > 0 ? functionsCalled : undefined
  };
}

function formatBusinessHours(
  businessHours: Record<string, { start: string; end: string } | null>
): string {
  const days: Record<string, string> = {
    monday: 'Lunes',
    tuesday: 'Martes',
    wednesday: 'Miércoles',
    thursday: 'Jueves',
    friday: 'Viernes',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  return Object.entries(businessHours)
    .map(([day, hours]) => {
      const dayName = days[day] || day;
      if (!hours) return `${dayName}: Cerrado`;
      return `${dayName}: ${hours.start} - ${hours.end}`;
    })
    .join('\n');
}


