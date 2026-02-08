-- =====================================================
-- Script para crear órdenes de prueba para testear límites del plan FREE
-- Ejecutar en Supabase SQL Editor
-- =====================================================
-- Plan FREE: max_orders_per_month = 20
-- Objetivo: Crear 20 órdenes en el MES ACTUAL para que al intentar 
-- la #21 desde la UI, el middleware bloquee la creación
-- =====================================================

-- PASO 0: Desactivar triggers de USUARIO en work_orders (no los de sistema/FK)
ALTER TABLE work_orders DISABLE TRIGGER USER;

-- PASO 1: Limpiar órdenes de prueba anteriores de esta organización
DELETE FROM work_orders 
WHERE organization_id = '042ab6bd-8979-4166-882a-c244b5e51e51'
  AND order_number LIKE 'WO-TEST-%';

-- PASO 2: Crear exactamente 20 órdenes (el límite del plan free) en el mes actual
DO $$
DECLARE
  v_org_id UUID := '042ab6bd-8979-4166-882a-c244b5e51e51';
  v_user_id UUID := '301eb55a-f6f9-449f-ab04-8dcf8fc081a6';
  v_customer_id UUID;
  v_vehicle_id UUID;
  v_assigned_user_id UUID;
  v_i INTEGER;
  v_statuses TEXT[] := ARRAY['reception', 'diagnosis', 'waiting_parts', 'completed', 'ready', 'testing'];
  v_entry_date TIMESTAMP WITH TIME ZONE;
  v_month_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_month_start := DATE_TRUNC('month', NOW());

  SELECT id INTO v_customer_id 
  FROM customers 
  WHERE organization_id = v_org_id 
  LIMIT 1;
  
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún cliente para org %', v_org_id;
  END IF;
  
  SELECT id INTO v_vehicle_id 
  FROM vehicles 
  WHERE organization_id = v_org_id 
  LIMIT 1;
  
  IF v_vehicle_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró ningún vehículo para org %', v_org_id;
  END IF;
  
  SELECT id INTO v_assigned_user_id 
  FROM users 
  WHERE organization_id = v_org_id 
  LIMIT 1;

  FOR v_i IN 1..20 LOOP
    v_entry_date := v_month_start + ((v_i - 1) || ' hours')::INTERVAL * 36;
    
    IF v_entry_date > NOW() THEN
      v_entry_date := NOW() - ((20 - v_i) || ' hours')::INTERVAL;
    END IF;
    
    INSERT INTO work_orders (
      organization_id,
      customer_id,
      vehicle_id,
      assigned_to,
      order_number,
      status,
      description,
      estimated_cost,
      final_cost,
      entry_date,
      created_at
    ) VALUES (
      v_org_id,
      v_customer_id,
      v_vehicle_id,
      v_assigned_user_id,
      'WO-TEST-' || LPAD(v_i::TEXT, 5, '0'),
      v_statuses[1 + ((v_i - 1) % array_length(v_statuses, 1))],
      'Orden de prueba #' || v_i || ' - Mantenimiento general del vehículo',
      1000.00 + (v_i * 100),
      CASE WHEN (v_i % 4) = 0 THEN 1000.00 + (v_i * 100) ELSE NULL END,
      v_entry_date,
      v_entry_date
    );
  END LOOP;
  
  RAISE NOTICE '✅ Se crearon 20 órdenes de trabajo en el mes actual';
  RAISE NOTICE '   - Organization ID: %', v_org_id;
  RAISE NOTICE '   - Mes: %', TO_CHAR(v_month_start, 'YYYY-MM');
  RAISE NOTICE '   - Customer ID: %', v_customer_id;
  RAISE NOTICE '   - Vehicle ID: %', v_vehicle_id;
  RAISE NOTICE '   - Assigned User: %', COALESCE(v_assigned_user_id::TEXT, 'NULL');
  RAISE NOTICE '🧪 Intenta crear la orden #21 desde la UI para probar el límite.';
END $$;

-- PASO 3: Reactivar triggers de usuario en work_orders
ALTER TABLE work_orders ENABLE TRIGGER USER;

-- PASO 4: Verificar cuántas órdenes hay este mes
SELECT 
  COUNT(*) as ordenes_este_mes,
  MIN(created_at) as primera_orden,
  MAX(created_at) as ultima_orden
FROM work_orders 
WHERE organization_id = '042ab6bd-8979-4166-882a-c244b5e51e51'
  AND created_at >= DATE_TRUNC('month', NOW())
  AND created_at <= (DATE_TRUNC('month', NOW()) + INTERVAL '1 month - 1 second');
