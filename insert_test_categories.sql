-- INSERTAR CATEGORÍAS DE PRUEBA PARA INVENTARIO
-- Ejecutar este script en el SQL Editor de Supabase

-- Insertar categorías de inventario de prueba
INSERT INTO public.inventory_categories (
    id,
    organization_id,
    name,
    description,
    status
) VALUES
    ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'Filtros', 'Filtros de aire, aceite, combustible', 'active'),
    ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'Aceites', 'Aceites de motor, transmisión, diferencial', 'active'),
    ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'Frenos', 'Pastillas, discos, líquido de frenos', 'active'),
    ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'Baterías', 'Baterías automotrices', 'active'),
    ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'Llantas', 'Llantas y neumáticos', 'active')
ON CONFLICT (id) DO NOTHING;

-- Verificar que se insertaron correctamente
SELECT 'inventory_categories' as table_name, COUNT(*) as record_count FROM public.inventory_categories;

-- Mostrar categorías creadas
SELECT id, name, description, status 
FROM public.inventory_categories 
WHERE organization_id = '00000000-0000-0000-0000-000000000000'
ORDER BY name;
