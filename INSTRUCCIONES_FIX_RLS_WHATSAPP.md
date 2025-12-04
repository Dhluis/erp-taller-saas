# 🔧 INSTRUCCIONES: Corregir Políticas RLS de WhatsApp

## 🎯 Problema
Las políticas RLS están usando `user_profiles` pero el sistema usa `users`, por lo que no puedes ver las conversaciones.

## ✅ Solución: Ejecutar Migración SQL

### Paso 1: Abrir Supabase SQL Editor
1. Ve a [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Inicia sesión
3. Selecciona tu proyecto
4. En el menú lateral, haz clic en **"SQL Editor"**
5. Haz clic en **"New query"**

### Paso 2: Copiar y Pegar el SQL
Copia **TODO** el contenido del archivo `supabase/migrations/017_fix_whatsapp_rls_policies.sql` y pégalo en el editor.

**O copia directamente este SQL:**

```sql
-- =====================================================
-- MIGRACIÓN 017: Corregir Políticas RLS de WhatsApp
-- =====================================================

-- 1. ELIMINAR POLÍTICAS ANTIGUAS
DROP POLICY IF EXISTS "Users can view organization conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can insert organization conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can update organization conversations" ON public.whatsapp_conversations;
DROP POLICY IF EXISTS "Users can delete organization conversations" ON public.whatsapp_conversations;

DROP POLICY IF EXISTS "Users can view organization messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can insert organization messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can update organization messages" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can delete organization messages" ON public.whatsapp_messages;

DROP POLICY IF EXISTS "Users can view messages from their organization" ON public.whatsapp_messages;
DROP POLICY IF EXISTS "Users can update messages from their organization" ON public.whatsapp_messages;

-- 2. CREAR POLÍTICAS CORRECTAS PARA whatsapp_conversations
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

-- 3. CREAR POLÍTICAS CORRECTAS PARA whatsapp_messages
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

CREATE POLICY "Users can insert organization messages" 
ON public.whatsapp_messages 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.auth_user_id = auth.uid()
        AND u.organization_id = whatsapp_messages.organization_id
    )
    OR
    (auth.jwt() ->> 'role' = 'service_role')
);

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

-- 4. POLÍTICAS DE SERVICE_ROLE
DROP POLICY IF EXISTS "Service role full access to conversations" ON public.whatsapp_conversations;
CREATE POLICY "Service role full access to conversations" 
ON public.whatsapp_conversations 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role full access to messages" ON public.whatsapp_messages;
CREATE POLICY "Service role full access to messages" 
ON public.whatsapp_messages 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
```

### Paso 3: Ejecutar
1. Haz clic en el botón **"Run"** (o presiona `Ctrl+Enter`)
2. Espera a que termine la ejecución
3. Deberías ver mensajes de éxito

### Paso 4: Verificar
Ejecuta esta consulta para verificar que las políticas se crearon correctamente:

```sql
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('whatsapp_conversations', 'whatsapp_messages')
ORDER BY tablename, policyname;
```

Deberías ver 8 políticas en total (4 para cada tabla).

## ✅ Después de Ejecutar

1. **Recarga la página** de conversaciones de WhatsApp
2. **Verifica** que las conversaciones se carguen correctamente
3. **Revisa la consola** del navegador si hay algún error

## 🆘 Si Hay Problemas

Si ves errores al ejecutar:
- **"policy already exists"**: Es normal, significa que ya existe (el DROP POLICY IF EXISTS lo elimina primero)
- **"relation does not exist"**: Verifica que las tablas `whatsapp_conversations` y `whatsapp_messages` existan
- **"permission denied"**: Asegúrate de estar usando una cuenta con permisos de administrador en Supabase

