-- ==========================================
-- DIAGNÓSTICO DETALLADO
-- Ejecutar después de VERIFY_MIGRATIONS_SIMPLE.sql
-- ==========================================

-- 1. VER QUÉ TABLAS EXISTEN EXACTAMENTE
SELECT 
  'TABLAS EXISTENTES' AS seccion,
  table_name AS tabla,
  'EXISTE' AS estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('suppliers', 'purchase_orders', 'purchase_order_items')
ORDER BY table_name;

-- 2. VER QUÉ TABLA FALTA
SELECT 
  'TABLAS FALTANTES' AS seccion,
  expected_table AS tabla,
  'NO EXISTE' AS estado
FROM (
  SELECT 'suppliers' AS expected_table
  UNION ALL SELECT 'purchase_orders'
  UNION ALL SELECT 'purchase_order_items'
) AS expected
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = expected.expected_table
);

-- 3. VERIFICAR COLUMNAS DE SUPPLIERS (si existe)
SELECT 
  'SUPPLIERS - COLUMNAS' AS seccion,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'category' THEN '⚠️ ANTIGUA (003)'
    WHEN column_name = 'company_name' THEN '✅ NUEVA (029)'
    WHEN column_name = 'contact_name' THEN '✅ NUEVA (029)'
    WHEN column_name = 'postal_code' THEN '✅ NUEVA (029)'
    ELSE 'Normal'
  END AS tipo_estructura
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'suppliers'
ORDER BY ordinal_position;

-- 4. VERIFICAR COLUMNAS DE PURCHASE_ORDERS (si existe)
SELECT 
  'PURCHASE_ORDERS - COLUMNAS' AS seccion,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'subtotal' THEN '✅ NUEVA (029)'
    WHEN column_name = 'tax' THEN '✅ NUEVA (029)'
    WHEN column_name = 'payment_status' THEN '✅ NUEVA (029)'
    ELSE 'Normal'
  END AS tipo_estructura
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- 5. VERIFICAR SI PURCHASE_ORDER_ITEMS EXISTE Y SU ESTRUCTURA
SELECT 
  'PURCHASE_ORDER_ITEMS - COLUMNAS' AS seccion,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'product_name' THEN '⚠️ ANTIGUA (003) - NO tiene FK a inventory'
    WHEN column_name = 'product_id' THEN '✅ NUEVA (029) - Tiene FK a inventory'
    ELSE 'Normal'
  END AS tipo_estructura
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_order_items'
ORDER BY ordinal_position;

-- 6. VERIFICAR FUNCIONES FALTANTES
SELECT 
  'FUNCIONES FALTANTES' AS seccion,
  expected_function AS funcion,
  'NO EXISTE' AS estado,
  CASE expected_function
    WHEN 'generate_purchase_order_number' THEN 'Genera números automáticos OC-YYYY-XXXX'
    WHEN 'increment_product_stock' THEN '⚠️ CRÍTICA - Actualiza stock de forma segura'
    WHEN 'update_purchase_order_totals' THEN 'Calcula totales automáticamente'
    WHEN 'update_purchase_order_status' THEN 'Actualiza status según recepciones'
  END AS descripcion
FROM (
  SELECT 'generate_purchase_order_number' AS expected_function
  UNION ALL SELECT 'increment_product_stock'
  UNION ALL SELECT 'update_purchase_order_totals'
  UNION ALL SELECT 'update_purchase_order_status'
) AS expected
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name = expected.expected_function
);

-- 7. RESUMEN DE ACCIONES NECESARIAS
SELECT 
  'ACCIÓN REQUERIDA' AS seccion,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_order_items') 
      THEN '❌ CREAR tabla purchase_order_items'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_order_items' 
      AND column_name = 'product_name'
    ) THEN '⚠️ MIGRAR purchase_order_items de estructura antigua a nueva'
    ELSE '✅ purchase_order_items está correcta'
  END AS accion_items,
  
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'increment_product_stock'
    ) THEN '❌ CREAR función increment_product_stock (CRÍTICA)'
    ELSE '✅ increment_product_stock existe'
  END AS accion_funcion_stock,
  
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'generate_purchase_order_number'
    ) THEN '⚠️ CREAR función generate_purchase_order_number'
    ELSE '✅ generate_purchase_order_number existe'
  END AS accion_funcion_number;
