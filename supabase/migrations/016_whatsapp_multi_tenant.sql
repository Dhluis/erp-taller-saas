-- =====================================================
-- MIGRACIÓN 016: WhatsApp Multi-Tenant con WAHA Plus
-- =====================================================
-- Fecha: 2025-01-XX
-- Descripción: Agrega soporte para sesiones multi-tenant de WhatsApp
-- Compatible con WAHA Plus que permite múltiples sesiones

-- 1. AGREGAR COLUMNAS A ai_agent_config
-- =====================================================
DO $$ 
BEGIN
    -- Agregar columna whatsapp_session_name si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_session_name'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_session_name VARCHAR(100);
        
        COMMENT ON COLUMN public.ai_agent_config.whatsapp_session_name IS 'Nombre único de sesión de WAHA para esta organización (formato: eagles_<orgId>)';
    END IF;

    -- Agregar columna whatsapp_connected si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_connected'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_connected BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN public.ai_agent_config.whatsapp_connected IS 'Indica si el número de WhatsApp está conectado y activo';
    END IF;
END $$;

-- 2. CREAR TABLA DE MENSAJES (si no existe)
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE SET NULL,
  from_number VARCHAR(50),
  to_number VARCHAR(50),
  message TEXT,
  direction VARCHAR(20) CHECK (direction IN ('incoming', 'outgoing', 'inbound', 'outbound')),
  waha_message_id VARCHAR(100),
  provider VARCHAR(50) DEFAULT 'waha',
  provider_message_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'sent',
  media_url TEXT,
  message_type VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREAR ÍNDICES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_org ON whatsapp_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_to ON whatsapp_messages(to_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_session ON ai_agent_config(whatsapp_session_name);

-- 4. HABILITAR RLS
-- =====================================================
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS RLS PARA whatsapp_messages
-- =====================================================
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view their org messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "System can insert messages" ON whatsapp_messages;
DROP POLICY IF EXISTS "Users can view messages from their organization" ON whatsapp_messages;

-- Política para SELECT: Usuarios pueden ver mensajes de su organización
CREATE POLICY "Users can view messages from their organization" ON whatsapp_messages
  FOR SELECT USING (
    organization_id IN (
      SELECT w.organization_id 
      FROM workshops w
      INNER JOIN users u ON u.workshop_id = w.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- Política para INSERT: Sistema puede insertar mensajes (webhooks)
CREATE POLICY "System can insert messages" ON whatsapp_messages
  FOR INSERT WITH CHECK (true);

-- Política para UPDATE: Usuarios pueden actualizar mensajes de su organización
CREATE POLICY "Users can update messages from their organization" ON whatsapp_messages
  FOR UPDATE USING (
    organization_id IN (
      SELECT w.organization_id 
      FROM workshops w
      INNER JOIN users u ON u.workshop_id = w.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- 6. FUNCIÓN PARA ACTUALIZAR updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_whatsapp_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. TRIGGER PARA ACTUALIZAR updated_at
-- =====================================================
DROP TRIGGER IF EXISTS trigger_update_whatsapp_messages_updated_at ON whatsapp_messages;
CREATE TRIGGER trigger_update_whatsapp_messages_updated_at
    BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_messages_updated_at();

-- 8. COMENTARIOS
-- =====================================================
COMMENT ON TABLE whatsapp_messages IS 'Historial de mensajes de WhatsApp (multi-tenant)';
COMMENT ON COLUMN whatsapp_messages.organization_id IS 'ID de la organización propietaria del mensaje';
COMMENT ON COLUMN whatsapp_messages.conversation_id IS 'ID de la conversación a la que pertenece el mensaje';
COMMENT ON COLUMN whatsapp_messages.direction IS 'Dirección: incoming/inbound (entrante) o outgoing/outbound (saliente)';
COMMENT ON COLUMN whatsapp_messages.provider IS 'Proveedor de WhatsApp (waha, etc.)';
COMMENT ON COLUMN whatsapp_messages.status IS 'Estado del mensaje: sent, delivered, read, failed, etc.';

