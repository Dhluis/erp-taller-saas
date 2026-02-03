-- ==========================================
-- SCRIPT DE VERIFICACIÓN SIMPLIFICADO
-- Purchase Orders / Suppliers Module
-- Ejecutar en Supabase Dashboard > SQL Editor
-- NO requiere tabla de migraciones
-- ==========================================

-- ==========================================
-- 1. VERIFICAR EXISTENCIA DE TABLAS
-- ==========================================

SELECT 
  'TABLAS' AS tipo,
  table_name AS nombre,
  CASE 
    WHEN table_name = 'suppliers' THEN '✅ Tabla de proveedores'
    WHEN table_name = 'purchase_orders' THEN '✅ Tabla de órdenes de compra'
    WHEN table_name = 'purchase_order_items' THEN '✅ Tabla de items de órdenes'
    ELSE '❓ Tabla desconocida'
  END AS descripcion
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('suppliers', 'purchase_orders', 'purchase_order_items')
ORDER BY table_name;

-- ==========================================
-- 2. VERIFICAR ESTRUCTURA DE SUPPLIERS
-- ==========================================

SELECT 
  'SUPPLIERS - COLUMNAS' AS tipo,
  column_name AS nombre,
  data_type AS tipo_dato,
  is_nullable AS nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'suppliers'
ORDER BY ordinal_position;

-- ==========================================
-- 3. VERIFICAR ESTRUCTURA DE PURCHASE_ORDERS
-- ==========================================

SELECT 
  'PURCHASE_ORDERS - COLUMNAS' AS tipo,
  column_name AS nombre,
  data_type AS tipo_dato,
  is_nullable AS nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- ==========================================
-- 4. VERIFICAR ESTRUCTURA DE PURCHASE_ORDER_ITEMS
-- ==========================================

SELECT 
  'PURCHASE_ORDER_ITEMS - COLUMNAS' AS tipo,
  column_name AS nombre,
  data_type AS tipo_dato,
  is_nullable AS nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_order_items'
ORDER BY ordinal_position;

-- ==========================================
-- 5. VERIFICAR FUNCIONES SQL
-- ==========================================

SELECT 
  'FUNCIONES' AS tipo,
  routine_name AS nombre,
  routine_type AS tipo_funcion
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_purchase_order_number',
    'increment_product_stock',
    'update_purchase_order_totals',
    'update_purchase_order_status'
  )
ORDER BY routine_name;

-- ==========================================
-- 6. VERIFICAR FOREIGN KEYS (especialmente a inventory)
-- ==========================================

SELECT 
  'FOREIGN KEYS' AS tipo,
  tc.table_name AS tabla,
  kcu.column_name AS columna,
  ccu.table_name AS tabla_referenciada,
  ccu.column_name AS columna_referenciada
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (
    tc.table_name = 'purchase_order_items'
    OR tc.table_name = 'purchase_orders'
    OR tc.table_name = 'suppliers'
  )
ORDER BY tc.table_name, tc.constraint_name;

-- ==========================================
-- 7. DETECTAR ESTRUCTURA (003 vs 029)
-- ==========================================

SELECT 
  'DIAGNÓSTICO' AS tipo,
  CASE 
    -- Verificar suppliers
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'suppliers' 
      AND column_name = 'category'
    ) THEN '⚠️ SUPPLIERS: Estructura ANTIGUA (003) - Tiene "category"'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'suppliers' 
      AND column_name = 'company_name'
    ) THEN '✅ SUPPLIERS: Estructura NUEVA (029) - Tiene "company_name"'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'suppliers'
    ) THEN '⚠️ SUPPLIERS: Existe pero estructura desconocida'
    ELSE '❌ SUPPLIERS: No existe'
  END AS estado_suppliers,
  
  CASE 
    -- Verificar purchase_order_items
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_order_items' 
      AND column_name = 'product_name'
    ) THEN '⚠️ ITEMS: Estructura ANTIGUA (003) - Tiene "product_name"'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_order_items' 
      AND column_name = 'product_id'
    ) THEN '✅ ITEMS: Estructura NUEVA (029) - Tiene "product_id" (FK a inventory)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'purchase_order_items'
    ) THEN '⚠️ ITEMS: Existe pero estructura desconocida'
    ELSE '❌ ITEMS: No existe'
  END AS estado_items;

-- ==========================================
-- 8. RESUMEN FINAL
-- ==========================================

SELECT 
  'RESUMEN' AS tipo,
  COUNT(DISTINCT table_name) AS tablas_encontradas,
  COUNT(DISTINCT routine_name) AS funciones_encontradas,
  CASE 
    WHEN COUNT(DISTINCT table_name) = 3 THEN '✅ Todas las tablas existen'
    WHEN COUNT(DISTINCT table_name) > 0 THEN '⚠️ Algunas tablas faltan'
    ELSE '❌ No hay tablas'
  END AS estado_general
FROM (
  SELECT table_name, NULL::text AS routine_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('suppliers', 'purchase_orders', 'purchase_order_items')
  
  UNION ALL
  
  SELECT NULL::text, routine_name
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'generate_purchase_order_number',
      'increment_product_stock',
      'update_purchase_order_totals',
      'update_purchase_order_status'
    )
) AS combined;

-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================
