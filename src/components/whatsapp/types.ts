export interface WhatsAppConversation {
  id: string;
  organization_id: string;
  customer_id: string | null;
  customer_phone: string;
  customer_name: string | null;
  status: string | null;
  last_message: string | null;
  last_message_at: string | null;
  messages_count: number | null;
  is_bot_active: boolean | null;
  assigned_to_user_id: string | null;
  profile_picture_url: string | null;
  is_lead: boolean | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface WhatsAppMessage {
  id: string;
  conversation_id: string;
  organization_id: string;
  from_number: string | null;
  to_number: string | null;
  direction: 'inbound' | 'outbound';
  body: string;
  message_type: string | null;
  media_url: string | null;
  media_type: string | null;
  status: string | null;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name?: string;
  full_name?: string;
  email?: string;
}
