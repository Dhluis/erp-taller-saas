-- ============================================
-- 🔌 WHATSAPP INTEGRATION - DATABASE SCHEMA
-- ============================================
-- 
-- AJUSTADO PARA TU ESTRUCTURA:
-- - system_users (con auth_user_id y organization_id)
-- - organizations (sin campos de usuarios)
-- 
-- IMPORTANTE: Ejecutar en Supabase SQL Editor
--
-- Fecha: 2025-01-03
-- ============================================

-- ============================================
-- 1️⃣ WHATSAPP CONFIG (Configuración por organización)
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Proveedor de WhatsApp
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('twilio', 'evolution', 'meta-cloud')),
  
  -- Número de WhatsApp del taller
  phone_number VARCHAR(20) NOT NULL,
  
  -- Credenciales (encriptadas en la app, aquí solo reference)
  business_account_id VARCHAR(255),
  webhook_url TEXT,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  verified_at TIMESTAMPTZ,
  
  -- Configuración adicional (JSON)
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(organization_id, phone_number)
);

-- Índices para performance
CREATE INDEX idx_whatsapp_config_org ON whatsapp_config(organization_id);
CREATE INDEX idx_whatsapp_config_phone ON whatsapp_config(phone_number);
CREATE INDEX idx_whatsapp_config_active ON whatsapp_config(is_active);

-- RLS Policies (AJUSTADO para system_users)
ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org whatsapp config"
  ON whatsapp_config FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org whatsapp config"
  ON whatsapp_config FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org whatsapp config"
  ON whatsapp_config FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 2️⃣ WHATSAPP CONVERSATIONS (Conversaciones)
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Cliente
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),
  
  -- Estado de la conversación
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  
  -- Contexto
  last_message_at TIMESTAMPTZ DEFAULT now(),
  messages_count INTEGER DEFAULT 0,
  
  -- Bot vs Humano
  is_bot_active BOOLEAN DEFAULT true,
  assigned_to_user_id UUID REFERENCES system_users(id) ON DELETE SET NULL,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  
  -- Relaciones opcionales
  related_order_id UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  related_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_whatsapp_conversations_org ON whatsapp_conversations(organization_id);
CREATE INDEX idx_whatsapp_conversations_customer ON whatsapp_conversations(customer_id);
CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(customer_phone);
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(status);
CREATE INDEX idx_whatsapp_conversations_last_message ON whatsapp_conversations(last_message_at DESC);

-- RLS Policies
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org conversations"
  ON whatsapp_conversations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org conversations"
  ON whatsapp_conversations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org conversations"
  ON whatsapp_conversations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 3️⃣ WHATSAPP MESSAGES (Mensajes individuales)
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES whatsapp_conversations(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Números
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20) NOT NULL,
  
  -- Dirección
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  
  -- Contenido
  body TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'location')),
  media_url TEXT,
  
  -- Estado (para mensajes salientes)
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed')),
  
  -- IDs externos
  provider_message_id VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_org ON whatsapp_messages(organization_id);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX idx_whatsapp_messages_provider_id ON whatsapp_messages(provider_message_id);

-- RLS Policies
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org messages"
  ON whatsapp_messages FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org messages"
  ON whatsapp_messages FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 4️⃣ AI AGENT CONFIG (Configuración del bot IA)
-- ============================================

CREATE TABLE IF NOT EXISTS ai_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Estado
  enabled BOOLEAN DEFAULT true,
  
  -- Proveedor de IA
  provider VARCHAR(50) NOT NULL DEFAULT 'anthropic' CHECK (provider IN ('openai', 'anthropic')),
  model VARCHAR(100) NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  
  -- Configuración del prompt
  system_prompt TEXT NOT NULL,
  personality VARCHAR(255) DEFAULT 'professional and helpful',
  language VARCHAR(10) DEFAULT 'es-MX',
  
  -- Parámetros del modelo
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  max_tokens INTEGER DEFAULT 1024 CHECK (max_tokens > 0),
  
  -- Capacidades
  auto_schedule_appointments BOOLEAN DEFAULT true,
  auto_create_orders BOOLEAN DEFAULT false,
  require_human_approval BOOLEAN DEFAULT false,
  
  -- Horarios
  business_hours_only BOOLEAN DEFAULT true,
  business_hours JSONB DEFAULT '{}'::jsonb,
  
  -- Contexto del negocio
  services JSONB DEFAULT '[]'::jsonb,
  mechanics JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  policies JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Solo una config por organización
  UNIQUE(organization_id)
);

-- Índices
CREATE INDEX idx_ai_agent_config_org ON ai_agent_config(organization_id);
CREATE INDEX idx_ai_agent_config_enabled ON ai_agent_config(enabled);

-- RLS Policies
ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org ai config"
  ON ai_agent_config FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org ai config"
  ON ai_agent_config FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their org ai config"
  ON ai_agent_config FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 5️⃣ METADATA TABLES (Tracking adicional)
-- ============================================

-- Metadata de órdenes creadas por WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_order_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  source VARCHAR(50) DEFAULT 'whatsapp_bot',
  customer_phone VARCHAR(20) NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  service_name VARCHAR(255),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(order_id)
);

CREATE INDEX idx_whatsapp_order_metadata_order ON whatsapp_order_metadata(order_id);
CREATE INDEX idx_whatsapp_order_metadata_org ON whatsapp_order_metadata(organization_id);

ALTER TABLE whatsapp_order_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org order metadata"
  ON whatsapp_order_metadata FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org order metadata"
  ON whatsapp_order_metadata FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Metadata de citas creadas por WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_appointment_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  source VARCHAR(50) DEFAULT 'whatsapp_bot',
  customer_phone VARCHAR(20) NOT NULL,
  scheduled_via VARCHAR(50) DEFAULT 'bot_conversation',
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(appointment_id)
);

CREATE INDEX idx_whatsapp_appointment_metadata_appt ON whatsapp_appointment_metadata(appointment_id);
CREATE INDEX idx_whatsapp_appointment_metadata_org ON whatsapp_appointment_metadata(organization_id);

ALTER TABLE whatsapp_appointment_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org appointment metadata"
  ON whatsapp_appointment_metadata FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org appointment metadata"
  ON whatsapp_appointment_metadata FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- Metadata de clientes de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_customer_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  source VARCHAR(50) DEFAULT 'whatsapp_bot',
  first_contact_phone VARCHAR(20) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(customer_id)
);

CREATE INDEX idx_whatsapp_customer_metadata_customer ON whatsapp_customer_metadata(customer_id);
CREATE INDEX idx_whatsapp_customer_metadata_org ON whatsapp_customer_metadata(organization_id);

ALTER TABLE whatsapp_customer_metadata ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org customer metadata"
  ON whatsapp_customer_metadata FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their org customer metadata"
  ON whatsapp_customer_metadata FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM system_users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- ============================================
-- 6️⃣ FUNCTIONS & TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_whatsapp_config_updated_at
  BEFORE UPDATE ON whatsapp_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_conversations_updated_at
  BEFORE UPDATE ON whatsapp_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_agent_config_updated_at
  BEFORE UPDATE ON ai_agent_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar contador de mensajes en conversación
CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE whatsapp_conversations
  SET 
    messages_count = messages_count + 1,
    last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para contador de mensajes
CREATE TRIGGER update_conversation_stats
  AFTER INSERT ON whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_message_count();

-- ============================================
-- 7️⃣ GRANTS (Permisos)
-- ============================================

-- Service role (para backend)
GRANT ALL ON whatsapp_config TO service_role;
GRANT ALL ON whatsapp_conversations TO service_role;
GRANT ALL ON whatsapp_messages TO service_role;
GRANT ALL ON ai_agent_config TO service_role;
GRANT ALL ON whatsapp_order_metadata TO service_role;
GRANT ALL ON whatsapp_appointment_metadata TO service_role;
GRANT ALL ON whatsapp_customer_metadata TO service_role;

-- Authenticated users (para frontend)
GRANT SELECT, INSERT, UPDATE ON whatsapp_config TO authenticated;
GRANT SELECT, INSERT, UPDATE ON whatsapp_conversations TO authenticated;
GRANT SELECT, INSERT ON whatsapp_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_agent_config TO authenticated;
GRANT SELECT, INSERT ON whatsapp_order_metadata TO authenticated;
GRANT SELECT, INSERT ON whatsapp_appointment_metadata TO authenticated;
GRANT SELECT, INSERT ON whatsapp_customer_metadata TO authenticated;

-- ============================================
-- ✅ SCHEMA CREADO EXITOSAMENTE
-- ============================================

-- Comentarios para documentación
COMMENT ON TABLE whatsapp_config IS 'Configuración de WhatsApp Business API por organización';
COMMENT ON TABLE whatsapp_conversations IS 'Historial de conversaciones de WhatsApp';
COMMENT ON TABLE whatsapp_messages IS 'Mensajes individuales de WhatsApp';
COMMENT ON TABLE ai_agent_config IS 'Configuración del bot de IA por organización';
COMMENT ON TABLE whatsapp_order_metadata IS 'Metadata de órdenes creadas vía WhatsApp';
COMMENT ON TABLE whatsapp_appointment_metadata IS 'Metadata de citas creadas vía WhatsApp';
COMMENT ON TABLE whatsapp_customer_metadata IS 'Metadata de clientes que contactaron por WhatsApp';



