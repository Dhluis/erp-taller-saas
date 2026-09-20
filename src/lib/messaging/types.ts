/**
 * Tipos unificados para sistema de mensajería multi-canal
 */

export type MessageSource = 'twilio' | 'meta';

export type MessagingTier = 'basic' | 'premium';

export interface NormalizedMessage {
  from: string; // Número de teléfono sin formato (solo dígitos)
  text: string;
  messageId: string;
  timestamp: string;
  organizationId: string;
  source: MessageSource;
  mediaUrl?: string; // URL de imagen/video/documento si existe
  mediaType?: 'image' | 'video' | 'audio' | 'document';
}

export interface MessagingConfig {
  organization_id: string;
  tier: MessagingTier;
  whatsapp_api_provider: 'twilio' | 'meta' | null;
  whatsapp_api_number: string | null;
  whatsapp_api_twilio_sid: string | null;
  whatsapp_api_status: 'active' | 'inactive' | 'pending';
  whatsapp_enabled: boolean;
  whatsapp_verified: boolean;
  /** ID de número de WhatsApp Business (Meta Cloud API). Null si la org no usa Meta. */
  meta_phone_number_id: string | null;
  /** Override opcional de token por organización. Si es null, se usa META_WHATSAPP_ACCESS_TOKEN global. */
  meta_access_token: string | null;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Código distinguible para casos que la UI debe manejar de forma especial (ej. ventana de 24h de Meta). */
  errorCode?: 'OUTSIDE_24H_WINDOW';
}
