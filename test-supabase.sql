-- =========================
-- PRUEBAS COMPLETAS PARA ERP TALLER SAAS
-- =========================

-- 1. CONFIGURAR JWT DE PRUEBA
-- Simula un usuario autenticado con organization_id
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"test-user","organization_id":"00000000-0000-0000-0000-000000000000"}',
  true
);

-- Verificar que el JWT está configurado
select current_setting('request.jwt.claims', true) as jwt_claims;

-- 2. CREAR ORGANIZACIÓN DE PRUEBA
insert into public.organizations (id, name)
values ('00000000-0000-0000-0000-000000000000','Taller Demo')
on conflict (id) do nothing;

-- 3. PROBAR TRIGGERS - INSERTAR DATOS SIN organization_id
-- Los triggers deben completar automáticamente el organization_id desde el JWT

-- Cliente
insert into public.customers (name, email, phone)
values ('Juan Pérez', 'juan@example.com', '555-1234')
returning id, name, organization_id;

-- Vehículo
insert into public.vehicles (customer_id, brand, model, year, license_plate)
select id, 'Toyota', 'Corolla', 2020, 'ABC-123'
from public.customers
where name = 'Juan Pérez'
limit 1
returning id, brand, model, organization_id;

-- Servicios
insert into public.services (code, name, description, category, base_price, estimated_hours)
values 
  ('SRV-001', 'Cambio de aceite', 'Cambio de aceite sintético', 'Mantenimiento', 800, 1.0),
  ('SRV-002', 'Alineación', 'Alineación y balanceo', 'Mantenimiento', 650, 1.5),
  ('SRV-003', 'Frenos', 'Revisión y ajuste de frenos', 'Seguridad', 1200, 2.0)
returning id, name, base_price, organization_id;

-- Inventario
insert into public.inventory (code, name, price, quantity)
values 
  ('PRD-001', 'Filtro de aceite', 250, 50),
  ('PRD-002', 'Pastillas de freno', 450, 25),
  ('PRD-003', 'Aceite sintético 5W-30', 180, 30)
returning id, name, price, quantity, organization_id;

-- Orden de trabajo
insert into public.work_orders (customer_id, vehicle_id, status, description, estimated_cost, notes)
select c.id, v.id, 'reception', 'Mantenimiento preventivo completo', 2000, 'Cliente solicita revisión general'
from public.customers c
join public.vehicles v on v.customer_id = c.id
where c.name = 'Juan Pérez'
limit 1
returning id, status, description, organization_id;

-- Items de la orden (servicios y productos)
insert into public.order_items (
  order_id, item_type, description, quantity, unit_price,
  discount_percent, discount_amount, tax_percent, subtotal, tax_amount, total, status
)
select
  wo.id, 'service', 'Cambio de aceite', 1, 800,
  0, 0, 16, 800, 128, 928, 'pending'
from public.work_orders wo
order by created_at desc
limit 1
returning *;

insert into public.order_items (
  order_id, item_type, description, quantity, unit_price,
  discount_percent, discount_amount, tax_percent, subtotal, tax_amount, total, status
)
select
  wo.id, 'product', 'Filtro de aceite', 1, 250,
  0, 0, 16, 250, 40, 290, 'pending'
from public.work_orders wo
order by created_at desc
limit 1
returning *;

-- 4. VERIFICAR QUE LOS DATOS SE CREARON CORRECTAMENTE
select 'CUSTOMERS' as tabla, count(*) as registros from public.customers
union all
select 'VEHICLES', count(*) from public.vehicles
union all
select 'SERVICES', count(*) from public.services
union all
select 'INVENTORY', count(*) from public.inventory
union all
select 'WORK_ORDERS', count(*) from public.work_orders
union all
select 'ORDER_ITEMS', count(*) from public.order_items;

-- 5. PROBAR RLS - CAMBIAR A OTRA ORGANIZACIÓN
-- Debe mostrar 0 registros (RLS funcionando)
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"test-user2","organization_id":"11111111-1111-1111-1111-111111111111"}',
  true
);

select 'RLS TEST - Otra organización' as test;
select count(*) as work_orders_count from public.work_orders; -- Debe ser 0
select count(*) as customers_count from public.customers; -- Debe ser 0

-- 6. VOLVER A LA ORGANIZACIÓN ORIGINAL
select set_config(
  'request.jwt.claims',
  '{"role":"authenticated","sub":"test-user","organization_id":"00000000-0000-0000-0000-000000000000"}',
  true
);

select 'RLS TEST - Organización original' as test;
select count(*) as work_orders_count from public.work_orders; -- Debe ser > 0
select count(*) as customers_count from public.customers; -- Debe ser > 0

-- 7. PROBAR QUERIES DEL DASHBOARD
-- Métricas de órdenes
select 
  'Métricas del mes' as metric,
  count(*) as orders_month
from public.work_orders 
where entry_date >= date_trunc('month', current_date);

-- Órdenes por estado
select 
  status,
  count(*) as cantidad
from public.work_orders 
group by status
order by status;

-- Ingresos del mes (sumando order_items)
select 
  'Ingresos del mes' as metric,
  coalesce(sum(oi.total), 0) as revenue
from public.work_orders wo
join public.order_items oi on oi.order_id = wo.id
where wo.status in ('completed', 'delivery')
  and wo.entry_date >= date_trunc('month', current_date);

-- 8. ACTUALIZAR ESTADO DE ORDEN (simular flujo de trabajo)
update public.work_orders 
set status = 'diagnostic'
where status = 'reception'
returning id, status, description;

-- 9. COMPLETAR ORDEN (simular finalización)
update public.work_orders 
set status = 'completed', completed_at = now()
where status = 'diagnostic'
returning id, status, completed_at;

-- 10. VERIFICAR DATOS FINALES
select 
  'RESUMEN FINAL' as info,
  (select count(*) from public.customers) as total_customers,
  (select count(*) from public.vehicles) as total_vehicles,
  (select count(*) from public.work_orders) as total_orders,
  (select count(*) from public.order_items) as total_items,
  (select count(*) from public.services) as total_services,
  (select count(*) from public.inventory) as total_inventory;

-- 11. DATOS PARA EL FRONTEND
-- Clientes con vehículos
select 
  c.id as customer_id,
  c.name as customer_name,
  c.email,
  c.phone,
  v.id as vehicle_id,
  v.brand,
  v.model,
  v.year,
  v.license_plate
from public.customers c
left join public.vehicles v on v.customer_id = c.id
order by c.name;

-- Órdenes con detalles
select 
  wo.id,
  wo.status,
  wo.description,
  wo.estimated_cost,
  wo.entry_date,
  c.name as customer_name,
  v.brand || ' ' || v.model as vehicle_info
from public.work_orders wo
join public.customers c on c.id = wo.customer_id
join public.vehicles v on v.id = wo.vehicle_id
order by wo.entry_date desc;

-- Items de órdenes
select 
  oi.id,
  oi.order_id,
  oi.item_type,
  oi.description,
  oi.quantity,
  oi.unit_price,
  oi.total,
  oi.status
from public.order_items oi
order by oi.created_at desc;

