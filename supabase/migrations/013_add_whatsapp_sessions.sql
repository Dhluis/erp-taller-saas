-- =====================================================
-- MIGRACIÓN: Tabla para sesiones de WhatsApp por usuario
-- =====================================================
-- Fecha: 2025-01-XX
-- Descripción: Permite que cada usuario vincule su propio WhatsApp

-- Crear tabla para sesiones de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL, -- Nombre de la sesión en WAHA
    phone_number TEXT,
    waha_session_status TEXT DEFAULT 'pending', -- pending, connected, disconnected
    waha_session_id TEXT,
    qr_code TEXT, -- Último QR generado (base64)
    qr_expires_at TIMESTAMP WITH TIME ZONE,
    connected_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Un usuario solo puede tener una sesión activa por organización
    UNIQUE(user_id, organization_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_user_id 
ON public.whatsapp_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_organization_id 
ON public.whatsapp_sessions(organization_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_name 
ON public.whatsapp_sessions(session_name);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status 
ON public.whatsapp_sessions(waha_session_status);

-- Habilitar RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Los usuarios pueden ver sus propias sesiones
CREATE POLICY "Users can view own whatsapp sessions" 
ON public.whatsapp_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Los usuarios pueden crear sus propias sesiones
CREATE POLICY "Users can insert own whatsapp sessions" 
ON public.whatsapp_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias sesiones
CREATE POLICY "Users can update own whatsapp sessions" 
ON public.whatsapp_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar sus propias sesiones
CREATE POLICY "Users can delete own whatsapp sessions" 
ON public.whatsapp_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Los administradores pueden ver todas las sesiones de su organización
CREATE POLICY "Admins can view organization whatsapp sessions" 
ON public.whatsapp_sessions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.organization_id = whatsapp_sessions.organization_id
        AND user_profiles.role IN ('admin', 'manager')
    )
);

-- Comentarios
COMMENT ON TABLE public.whatsapp_sessions IS 'Sesiones de WhatsApp vinculadas por usuario y organización';
COMMENT ON COLUMN public.whatsapp_sessions.session_name IS 'Nombre único de la sesión en WAHA';
COMMENT ON COLUMN public.whatsapp_sessions.waha_session_status IS 'Estado de la sesión: pending, connected, disconnected';
COMMENT ON COLUMN public.whatsapp_sessions.phone_number IS 'Número de teléfono vinculado a esta sesión';
















