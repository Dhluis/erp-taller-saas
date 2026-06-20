-- Migración 040: Actualizar límites del plan Free (Eagles System)
-- Valores nuevos: 20 clientes, 20 órdenes/mes, 30 productos inventario, 2 usuarios
-- No modifica RLS ni políticas.

UPDATE plan_limits SET limit_value = 20, description = 'Máximo de clientes en plan gratis'
  WHERE plan_tier = 'free' AND feature_key = 'max_customers';

UPDATE plan_limits SET limit_value = 20, description = 'Máximo de órdenes por mes en plan gratis'
  WHERE plan_tier = 'free' AND feature_key = 'max_orders_per_month';

UPDATE plan_limits SET limit_value = 30, description = 'Máximo de productos en inventario'
  WHERE plan_tier = 'free' AND feature_key = 'max_inventory_items';

UPDATE plan_limits SET limit_value = 2, description = 'Máximo de usuarios en plan gratis'
  WHERE plan_tier = 'free' AND feature_key = 'max_users';
