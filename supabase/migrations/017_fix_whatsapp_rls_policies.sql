-- =====================================================
-- MIGRACIÓN 017: Corregir Políticas RLS de WhatsApp
-- =====================================================
-- Fecha: 2025-01-XX
-- Descripción: Corrige las políticas RLS para usar la tabla 'users' 
-- en lugar de 'user_profiles' que es la estructura real del sistema
-- =====================================================

-- =====================================================
-- 1. ELIMINAR POLÍTICAS ANTIGUAS (si existen)
-- =====================================================

-- Políticas de whatsapp_conversations
DROP POLICY IF EXISTS "Users can view organization conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can insert organization conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can update organization conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can delete organization conversations" ON public.whatsapp_conversations;

-- Políticas de whatsapp_messages
DROP POLICY IF EXISTS "Users can view organization messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert organization messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can update organization messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete organization messages" ON public.whatsapp_messages;

-- Políticas de la migración 016 (si existen)
DROP POLICY IF EXISTS "Users can view messages from their organization" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can update messages from their organization" ON public.whatsapp_messages;

-- =====================================================
-- 2. CREAR POLÍTICAS CORRECTAS PARA whatsapp_conversations
-- =====================================================

-- SELECT: Usuarios pueden ver conversaciones de su organización
CREATE POLICY "Users can view organization conversations" 
ON public.whatsapp_conversations 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_conversations.organization_id
    )
);

-- INSERT: Usuarios pueden crear conversaciones en su organización
CREATE POLICY "Users can insert organization conversations" 
ON public.whatsapp_conversations 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_conversations.organization_id
    )
);

-- UPDATE: Usuarios pueden actualizar conversaciones de su organización
CREATE POLICY "Users can update organization conversations" 
ON public.whatsapp_conversations 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_conversations.organization_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_conversations.organization_id
    )
);

-- DELETE: Usuarios pueden eliminar conversaciones de su organización
CREATE POLICY "Users can delete organization conversations" 
ON public.whatsapp_conversations 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_conversations.organization_id
    )
);

-- =====================================================
-- 3. CREAR POLÍTICAS CORRECTAS PARA whatsapp_messages
-- =====================================================

-- SELECT: Usuarios pueden ver mensajes de su organización
CREATE POLICY "Users can view organization messages" 
ON public.whatsapp_messages 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_messages.organization_id
    )
);

-- INSERT: Usuarios y sistema pueden crear mensajes
-- Permitir a usuarios crear mensajes en su organización
-- Y también permitir al sistema (service_role) crear mensajes desde webhooks
CREATE POLICY "Users can insert organization messages" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (
    -- Usuario autenticado de la organización
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_messages.organization_id
    )
    OR
    -- Service role (para webhooks)
    (auth.jwt() ->> 'role' = 'service_role')
);

-- UPDATE: Usuarios pueden actualizar mensajes de su organización
CREATE POLICY "Users can update organization messages" 
ON public.whatsapp_messages 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_messages.organization_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_messages.organization_id
    )
);

-- DELETE: Usuarios pueden eliminar mensajes de su organización
CREATE POLICY "Users can delete organization messages" 
ON public.whatsapp_messages 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_messages.organization_id
    )
);

-- =====================================================
-- 4. VERIFICAR QUE LAS POLÍTICAS DE SERVICE_ROLE EXISTAN
-- =====================================================

-- Service role puede hacer todo en whatsapp_conversations
DROP POLICY IF EXISTS "Service role full access to conversations" ON public.whatsapp_conversations;
CREATE POLICY "Service role full access to conversations" 
ON public.whatsapp_conversations 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Service role puede hacer todo en whatsapp_messages
DROP POLICY IF EXISTS "Service role full access to messages" ON public.whatsapp_messages;
CREATE POLICY "Service role full access to messages" 
ON public.whatsapp_messages 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- 5. COMENTARIOS
-- =====================================================
COMMENT ON POLICY "Users can view organization conversations" ON public.whatsapp_conversations IS 
'Permite a usuarios autenticados ver conversaciones de su organización usando la tabla users';

COMMENT ON POLICY "Users can view organization messages" ON public.whatsapp_messages IS 
'Permite a usuarios autenticados ver mensajes de su organización usando la tabla users';

