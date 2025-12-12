-- =====================================================
-- MIGRACIÓN 014: Tablas de WhatsApp (Conversaciones y Mensajes)
-- =====================================================
-- Fecha: 2025-01-XX
-- Descripción: Crea tablas para gestionar conversaciones y mensajes de WhatsApp
-- Compatible con multi-tenancy y sistema de autenticación existente

-- =====================================================
-- 1. TABLA: whatsapp_conversations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'archived')),
    is_bot_active BOOLEAN DEFAULT true,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    department VARCHAR(50),
    labels TEXT[] DEFAULT '{}',
    messages_count INTEGER DEFAULT 0,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para whatsapp_conversations
COMMENT ON TABLE public.whatsapp_conversations IS 'Conversaciones de WhatsApp con clientes';
COMMENT ON COLUMN public.whatsapp_conversations.status IS 'Estado de la conversación: active, resolved, archived';
COMMENT ON COLUMN public.whatsapp_conversations.is_bot_active IS 'Indica si el bot de IA está activo para esta conversación';
COMMENT ON COLUMN public.whatsapp_conversations.labels IS 'Etiquetas para categorizar la conversación';
COMMENT ON COLUMN public.whatsapp_conversations.metadata IS 'Metadatos adicionales de la conversación';

-- =====================================================
-- 2. TABLA: whatsapp_messages
-- =====================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    waha_id VARCHAR(100),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'video', 'audio', 'document', 'location', 'contact', 'sticker')),
    content TEXT,
    media_url TEXT,
    media_mime_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'pending')),
    from_phone VARCHAR(20),
    to_phone VARCHAR(20),
    is_from_bot BOOLEAN DEFAULT false,
    is_internal_note BOOLEAN DEFAULT false,
    reply_to_id UUID REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para whatsapp_messages
COMMENT ON TABLE public.whatsapp_messages IS 'Mensajes de WhatsApp (entrantes y salientes)';
COMMENT ON COLUMN public.whatsapp_messages.waha_id IS 'ID del mensaje en WAHA (WhatsApp HTTP API)';
COMMENT ON COLUMN public.whatsapp_messages.direction IS 'Dirección del mensaje: inbound (entrante) o outbound (saliente)';
COMMENT ON COLUMN public.whatsapp_messages.is_from_bot IS 'Indica si el mensaje fue generado por el bot de IA';
COMMENT ON COLUMN public.whatsapp_messages.is_internal_note IS 'Indica si es una nota interna (no visible para el cliente)';
COMMENT ON COLUMN public.whatsapp_messages.reply_to_id IS 'ID del mensaje al que responde (si aplica)';

-- =====================================================
-- 3. ÍNDICES PARA whatsapp_conversations
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_organization_id 
ON public.whatsapp_conversations(organization_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_customer_phone 
ON public.whatsapp_conversations(customer_phone);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_status 
ON public.whatsapp_conversations(status);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_last_message_at 
ON public.whatsapp_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_assigned_to 
ON public.whatsapp_conversations(assigned_to) 
WHERE assigned_to IS NOT NULL;

-- Índice único parcial: solo una conversación activa por organización y teléfono
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_conversations_unique_active 
ON public.whatsapp_conversations(organization_id, customer_phone) 
WHERE status = 'active';

-- =====================================================
-- 4. ÍNDICES PARA whatsapp_messages
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_conversation_id 
ON public.whatsapp_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_organization_id 
ON public.whatsapp_messages(organization_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_waha_id 
ON public.whatsapp_messages(waha_id) 
WHERE waha_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp 
ON public.whatsapp_messages(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_reply_to_id 
ON public.whatsapp_messages(reply_to_id) 
WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction 
ON public.whatsapp_messages(direction);

-- =====================================================
-- 5. AGREGAR CAMPOS A ai_agent_config (si no existen)
-- =====================================================
DO $$ 
BEGIN
    -- Agregar columna whatsapp_phone (puede que ya exista de migración 012)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_phone'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_phone VARCHAR(20);
        
        COMMENT ON COLUMN public.ai_agent_config.whatsapp_phone IS 'Número de teléfono de WhatsApp Business vinculado';
    END IF;

    -- Agregar columna whatsapp_connected (puede que ya exista de migración 012)
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

    -- Agregar columna whatsapp_session_name (nuevo)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ai_agent_config' 
        AND column_name = 'whatsapp_session_name'
    ) THEN
        ALTER TABLE public.ai_agent_config 
        ADD COLUMN whatsapp_session_name VARCHAR(100);
        
        COMMENT ON COLUMN public.ai_agent_config.whatsapp_session_name IS 'Nombre de la sesión de WAHA para esta organización';
    END IF;
END $$;

-- =====================================================
-- 6. HABILITAR RLS EN AMBAS TABLAS
-- =====================================================
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. POLÍTICAS RLS PARA whatsapp_conversations
-- =====================================================

-- Usuarios pueden ver conversaciones de su organización
CREATE POLICY "Users can view organization conversations" 
ON public.whatsapp_conversations 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = whatsapp_conversations.organization_id
    )
);

-- Usuarios pueden crear conversaciones en su organización
CREATE POLICY "Users can insert organization conversations" 
ON public.whatsapp_conversations 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = whatsapp_conversations.organization_id
    )
);

-- Usuarios pueden actualizar conversaciones de su organización
CREATE POLICY "Users can update organization conversations" 
ON public.whatsapp_conversations 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = whatsapp_conversations.organization_id
    )
);

-- Usuarios pueden eliminar conversaciones de su organización
CREATE POLICY "Users can delete organization conversations" 
ON public.whatsapp_conversations 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = whatsapp_conversations.organization_id
    )
);

-- =====================================================
-- 8. POLÍTICAS RLS PARA whatsapp_messages
-- =====================================================

-- Usuarios pueden ver mensajes de su organización
CREATE POLICY "Users can view organization messages" 
ON public.whatsapp_messages 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = whatsapp_messages.organization_id
    )
);

-- Usuarios pueden crear mensajes en su organización
CREATE POLICY "Users can insert organization messages" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = whatsapp_messages.organization_id
    )
);

-- Usuarios pueden actualizar mensajes de su organización
CREATE POLICY "Users can update organization messages" 
ON public.whatsapp_messages 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = whatsapp_messages.organization_id
    )
);

-- Usuarios pueden eliminar mensajes de su organización
CREATE POLICY "Users can delete organization messages" 
ON public.whatsapp_messages 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.organization_id = whatsapp_messages.organization_id
    )
);

-- =====================================================
-- 9. POLÍTICAS PARA SERVICE_ROLE (acceso completo)
-- =====================================================

-- Service role puede hacer todo en whatsapp_conversations
CREATE POLICY "Service role full access to conversations" 
ON public.whatsapp_conversations 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Service role puede hacer todo en whatsapp_messages
CREATE POLICY "Service role full access to messages" 
ON public.whatsapp_messages 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 10. FUNCIONES DE TRIGGER PARA UPDATED_AT
-- =====================================================

-- Función para actualizar updated_at en whatsapp_conversations
CREATE OR REPLACE FUNCTION update_whatsapp_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para whatsapp_conversations
DROP TRIGGER IF EXISTS trigger_update_whatsapp_conversations_updated_at ON public.whatsapp_conversations;
CREATE TRIGGER trigger_update_whatsapp_conversations_updated_at
    BEFORE UPDATE ON public.whatsapp_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_conversations_updated_at();

-- =====================================================
-- 11. FUNCIÓN PARA ACTUALIZAR CONTADOR DE MENSAJES
-- =====================================================

-- Función para actualizar messages_count en conversación
CREATE OR REPLACE FUNCTION update_conversation_messages_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.conversation_id IS NOT NULL THEN
        UPDATE public.whatsapp_conversations
        SET 
            messages_count = (
                SELECT COUNT(*) 
                FROM public.whatsapp_messages 
                WHERE conversation_id = NEW.conversation_id
            ),
            last_message = NEW.content,
            last_message_at = NEW.timestamp
        WHERE id = NEW.conversation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar contador al insertar mensaje
DROP TRIGGER IF EXISTS trigger_update_conversation_messages_count ON public.whatsapp_messages;
CREATE TRIGGER trigger_update_conversation_messages_count
    AFTER INSERT ON public.whatsapp_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_messages_count();













