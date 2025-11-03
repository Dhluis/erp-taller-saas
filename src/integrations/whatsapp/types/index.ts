// src/integrations/whatsapp/types/index.ts

/**
 * Tipos para la integración de WhatsApp + AI Bot
 * Estos tipos NO modifican ni dependen del código existente
 */

// ============================================
// 🔌 WHATSAPP MESSAGE TYPES
// ============================================

export type WhatsAppProvider = 'twilio' | 'evolution' | 'meta-cloud';

export interface WhatsAppMessage {
  id: string;
  organization_id: string;
  from: string; // Número del cliente (ej: +5214491234567)
  to: string; // Número del taller
  body: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  media_url?: string;
  provider: WhatsAppProvider;
  provider_message_id?: string;
  metadata?: Record<string, any>;
}

export interface WhatsAppConversation {
  id: string;
  organization_id: string;
  customer_phone: string;
  customer_name?: string;
  started_at: Date;
  last_message_at: Date;
  status: 'active' | 'closed' | 'archived';
  messages_count: number;
  is_bot_active: boolean;
  assigned_to_human?: string; // Usuario ID si fue escalado a humano
  metadata?: {
    customer_id?: string; // ID en tabla customers
    orden_id?: string; // Si hay orden asociada
    cita_id?: string; // Si hay cita asociada
  };
}

// ============================================
// 🤖 AI AGENT TYPES
// ============================================

export interface AIAgentConfig {
  organization_id: string;
  enabled: boolean;
  provider: 'openai' | 'anthropic';
  model: string; // 'gpt-4', 'claude-3-5-sonnet', etc.
  system_prompt: string;
  personality: string;
  language: string;
  temperature: number;
  max_tokens: number;
  auto_schedule_appointments: boolean;
  auto_create_orders: boolean;
  require_human_approval: boolean;
  business_hours_only: boolean;
  business_hours?: {
    [day: string]: { start: string; end: string } | null;
  };
}

export interface AIContext {
  organization_id: string;
  organization_name: string;
  services: ServiceInfo[];
  mechanics: MechanicInfo[];
  business_hours: Record<string, { start: string; end: string } | null>;
  policies: {
    payment_methods: string[];
    cancellation_policy: string;
    warranty_policy: string;
  };
  faqs: FAQ[];
  contact_info: {
    phone: string;
    email: string;
    address: string;
    website?: string;
  };
}

export interface ServiceInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  category?: string;
}

export interface MechanicInfo {
  id: string;
  name: string;
  specialties: string[];
  available: boolean;
}

export interface FAQ {
  question: string;
  answer: string;
  category?: string;
}

// ============================================
// 🔧 FUNCTION CALLING TYPES
// ============================================

export type AIFunctionName = 
  | 'schedule_appointment'
  | 'check_availability'
  | 'get_service_price'
  | 'create_quote'
  | 'get_order_status'
  | 'escalate_to_human';

export interface AIFunctionCall {
  name: AIFunctionName;
  arguments: Record<string, any>;
}

export interface ScheduleAppointmentArgs {
  customer_name: string;
  customer_phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  service_name: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  notes?: string;
}

export interface CheckAvailabilityArgs {
  date: string; // YYYY-MM-DD
  service_name?: string;
}

export interface GetServicePriceArgs {
  service_name: string;
  vehicle_brand?: string;
  vehicle_model?: string;
}

export interface CreateQuoteArgs {
  customer_name: string;
  customer_phone: string;
  services: string[];
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: string;
}

// ============================================
// 📋 ADAPTER TYPES (Para conectar con código existente)
// ============================================

/**
 * Resultado de crear una orden desde el bot
 * Mapea al tipo existente pero aislado aquí
 */
export interface BotCreatedOrder {
  id: string;
  order_number: string;
  organization_id: string;
  customer_id: string;
  vehicle_id?: string;
  appointment_id?: string;
  status: string;
  total_amount: number;
  created_at: Date;
}

/**
 * Resultado de crear una cita desde el bot
 */
export interface BotCreatedAppointment {
  id: string;
  organization_id: string;
  customer_id: string;
  vehicle_id?: string;
  date: string;
  time: string;
  service: string;
  status: string;
  created_at: Date;
}

/**
 * Resultado de buscar/crear cliente desde el bot
 */
export interface BotCustomer {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email?: string;
  created_at: Date;
  source: 'whatsapp_bot' | 'manual' | 'other';
}

/**
 * Resultado de buscar/crear vehículo desde el bot
 */
export interface BotVehicle {
  id: string;
  customer_id: string;
  brand: string;
  model: string;
  year: string;
  license_plate?: string;
  vin?: string;
  created_at: Date;
}

// ============================================
// 🔔 NOTIFICATION TYPES
// ============================================

export interface NotificationPayload {
  organization_id: string;
  type: 'new_appointment' | 'new_order' | 'new_message' | 'bot_escalation';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  data: Record<string, any>;
  channels: NotificationChannel[];
  target_users?: string[]; // User IDs específicos, o undefined = todos admins
}

export type NotificationChannel = 
  | 'dashboard' // WebSocket a dashboard
  | 'email' // Email al taller
  | 'whatsapp' // WhatsApp al dueño
  | 'push'; // Push notification

export interface DashboardNotification {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  read: boolean;
  url?: string;
  data?: Record<string, any>;
  created_at: Date;
}

// ============================================
// 📊 WEBHOOK TYPES
// ============================================

export interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
}

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message: {
      conversation?: string;
      imageMessage?: any;
      documentMessage?: any;
    };
    messageTimestamp: string;
    pushName?: string;
  };
}

// ============================================
// 💾 DATABASE TYPES (Para nuevas tablas)
// ============================================

export interface WhatsAppConfigRow {
  id: string;
  organization_id: string;
  provider: WhatsAppProvider;
  phone_number: string;
  business_account_id?: string;
  api_credentials: Record<string, string>; // Encriptado en DB
  webhook_url: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface WhatsAppMessageRow {
  id: string;
  conversation_id: string;
  organization_id: string;
  from_number: string;
  to_number: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status: string;
  message_type: string;
  media_url?: string;
  provider_message_id?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface AIAgentConfigRow {
  id: string;
  organization_id: string;
  enabled: boolean;
  provider: 'openai' | 'anthropic';
  model: string;
  system_prompt: string;
  personality: string;
  language: string;
  temperature: number;
  max_tokens: number;
  auto_schedule_appointments: boolean;
  auto_create_orders: boolean;
  require_human_approval: boolean;
  business_hours_only: boolean;
  business_hours?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// ============================================
// 🔐 SECURITY TYPES
// ============================================

export interface WebhookValidation {
  is_valid: boolean;
  organization_id?: string;
  error?: string;
}

export interface RateLimitInfo {
  organization_id: string;
  requests_count: number;
  window_start: Date;
  limit_exceeded: boolean;
}

// ============================================
// 📈 ANALYTICS TYPES
// ============================================

export interface BotAnalytics {
  organization_id: string;
  period: 'day' | 'week' | 'month';
  total_conversations: number;
  total_messages: number;
  appointments_scheduled: number;
  orders_created: number;
  escalations_to_human: number;
  average_response_time_seconds: number;
  customer_satisfaction?: number; // 1-5 rating
}

// ============================================
// 🎯 RESPONSE TYPES
// ============================================

export interface WebhookResponse {
  success: boolean;
  message_id?: string;
  error?: string;
}

export interface AIAgentResponse {
  text: string;
  function_calls?: AIFunctionCall[];
  should_escalate?: boolean;
  confidence?: number;
}

export interface AdapterResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

