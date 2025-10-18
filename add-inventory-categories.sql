-- Agregar tabla inventory_categories
CREATE TABLE IF NOT EXISTS public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by UUID,
    updated_by UUID
);

-- Insertar categorías de inventario de ejemplo
INSERT INTO public.inventory_categories (organization_id, name, description, is_active) VALUES
('00000000-0000-0000-0000-000000000000', 'Lubricantes', 'Aceites y lubricantes para motor', true),
('00000000-0000-0000-0000-000000000000', 'Filtros', 'Filtros de aire, aceite y combustible', true),
('00000000-0000-0000-0000-000000000000', 'Frenos', 'Sistema de frenos y componentes', true),
('00000000-0000-0000-0000-000000000000', 'Encendido', 'Sistema de encendido y bujías', true);





