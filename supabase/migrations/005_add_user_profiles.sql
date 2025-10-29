-- =====================================================
-- MIGRACIÓN 005: USER PROFILES
-- =====================================================
-- Agregar tabla user_profiles para vincular auth.users con organizations
-- Compatible con multi-tenancy y sistema de autenticación existente

-- 1. TABLA DE PERFILES DE USUARIO
-- =====================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'mechanic', 'receptionist', 'user')),
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    department TEXT,
    position TEXT,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. HABILITAR RLS EN USER_PROFILES
-- =====================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS RLS PARA USER_PROFILES
-- =====================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile" ON user_profiles 
    FOR SELECT USING (auth.uid() = id);

-- Los usuarios pueden actualizar su propio perfil (excepto organization_id y role)
CREATE POLICY "Users can update own profile" ON user_profiles 
    FOR UPDATE USING (auth.uid() = id);

-- Los administradores pueden ver todos los perfiles de su organización
CREATE POLICY "Admins can view organization profiles" ON user_profiles 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.organization_id = user_profiles.organization_id 
            AND up.role IN ('admin', 'manager')
        )
    );

-- Los administradores pueden insertar perfiles en su organización
CREATE POLICY "Admins can insert organization profiles" ON user_profiles 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.organization_id = user_profiles.organization_id 
            AND up.role IN ('admin', 'manager')
        )
    );

-- Los administradores pueden actualizar perfiles de su organización
CREATE POLICY "Admins can update organization profiles" ON user_profiles 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.organization_id = user_profiles.organization_id 
            AND up.role IN ('admin', 'manager')
        )
    );

-- Los administradores pueden eliminar perfiles de su organización (excepto el suyo propio)
CREATE POLICY "Admins can delete organization profiles" ON user_profiles 
    FOR DELETE USING (
        auth.uid() != id AND
        EXISTS (
            SELECT 1 FROM user_profiles up 
            WHERE up.id = auth.uid() 
            AND up.organization_id = user_profiles.organization_id 
            AND up.role IN ('admin', 'manager')
        )
    );

-- 4. ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization_id ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at);

-- 5. FUNCIÓN PARA ACTUALIZAR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER PARA ACTUALIZAR UPDATED_AT
-- =====================================================
CREATE TRIGGER trigger_update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profiles_updated_at();

-- 7. FUNCIÓN PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Crear perfil automáticamente cuando se crea un usuario en auth.users
    INSERT INTO public.user_profiles (
        id,
        organization_id,
        role,
        full_name,
        email_verified,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(
            (NEW.raw_user_meta_data->>'organization_id')::UUID,
            '00000000-0000-0000-0000-000000000000'::UUID  -- Default org para usuarios sin org
        ),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email_confirmed_at IS NOT NULL,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE
-- =====================================================
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_profile();

-- 9. FUNCIÓN PARA OBTENER ORGANIZACIÓN DEL USUARIO ACTUAL
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_user_organization()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FUNCIÓN PARA OBTENER ROL DEL USUARIO ACTUAL
-- =====================================================
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. FUNCIÓN PARA VERIFICAR SI EL USUARIO ES ADMIN
-- =====================================================
CREATE OR REPLACE FUNCTION is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT role IN ('admin', 'manager')
        FROM user_profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. COMENTARIOS EN LA TABLA
-- =====================================================
COMMENT ON TABLE user_profiles IS 'Perfiles de usuario que vinculan auth.users con organizations para multi-tenancy';
COMMENT ON COLUMN user_profiles.id IS 'ID del usuario en auth.users (clave primaria y foránea)';
COMMENT ON COLUMN user_profiles.organization_id IS 'ID de la organización a la que pertenece el usuario';
COMMENT ON COLUMN user_profiles.role IS 'Rol del usuario en la organización';
COMMENT ON COLUMN user_profiles.full_name IS 'Nombre completo del usuario';
COMMENT ON COLUMN user_profiles.preferences IS 'Preferencias del usuario en formato JSON';
COMMENT ON COLUMN user_profiles.metadata IS 'Metadatos adicionales del usuario en formato JSON';

-- 13. DATOS DE EJEMPLO (OPCIONAL - COMENTAR EN PRODUCCIÓN)
-- =====================================================
-- INSERT INTO user_profiles (id, organization_id, role, full_name, is_active)
-- VALUES 
--     ('00000000-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'admin', 'Administrador Principal', true),
--     ('00000000-0000-0000-0000-000000000002'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'manager', 'Gerente de Taller', true),
--     ('00000000-0000-0000-0000-000000000003'::UUID, '00000000-0000-0000-0000-000000000001'::UUID, 'mechanic', 'Mecánico Senior', true);

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- 1. Esta migración crea una tabla que vincula directamente auth.users con organizations
-- 2. Las políticas RLS aseguran que los usuarios solo accedan a datos de su organización
-- 3. El trigger automático crea perfiles cuando se registran nuevos usuarios
-- 4. Las funciones helper facilitan el acceso a información del usuario actual
-- 5. Los índices optimizan las consultas más comunes
-- 6. Compatible con el sistema system_users existente (pueden coexistir)


















