/**
 * Tipos unificados para sistema de mensajería multi-canal
 */

export type MessageSource = 'twilio';

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
  whatsapp_api_provider: 'twilio' | null;
  whatsapp_api_number: string | null;
  whatsapp_api_twilio_sid: string | null;
  whatsapp_api_status: 'active' | 'inactive' | 'pending';
  whatsapp_enabled: boolean;
  whatsapp_verified: boolean;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
