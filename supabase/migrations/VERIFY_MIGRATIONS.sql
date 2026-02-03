-- ==========================================
-- SCRIPT DE VERIFICACIÓN DE MIGRACIONES
-- Purchase Orders / Suppliers Module
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ==========================================

-- ==========================================
-- 1. VERIFICAR MIGRACIONES EJECUTADAS
-- ==========================================

-- Intentar verificar migraciones (puede fallar si no existe la tabla)
-- Si falla, continuar con las demás verificaciones
DO $$
BEGIN
  -- Intentar consultar migraciones si la tabla existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'supabase_migrations' 
    AND table_name = 'schema_migrations'
  ) THEN
    RAISE NOTICE 'Tabla de migraciones encontrada';
  ELSE
    RAISE NOTICE 'Tabla de migraciones no encontrada - continuando con verificación directa de tablas';
  END IF;
END $$;

-- Verificar migraciones (solo si la tabla existe)
SELECT 
  version,
  name,
  inserted_at,
  executed_at
FROM supabase_migrations.schema_migrations 
WHERE name LIKE '%supplier%' 
   OR name LIKE '%purchase%'
   OR version IN ('003', '009', '029')
ORDER BY version;

-- ==========================================
-- 2. VERIFICAR EXISTENCIA DE TABLAS
-- ==========================================

-- Verificar si existen las tablas principales
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('suppliers', 'purchase_orders', 'purchase_order_items')
ORDER BY table_name;

-- ==========================================
-- 3. VERIFICAR ESTRUCTURA DE TABLA: SUPPLIERS
-- ==========================================

-- Verificar columnas de suppliers
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'suppliers'
ORDER BY ordinal_position;

-- ==========================================
-- 4. VERIFICAR ESTRUCTURA DE TABLA: PURCHASE_ORDERS
-- ==========================================

-- Verificar columnas de purchase_orders
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_orders'
ORDER BY ordinal_position;

-- ==========================================
-- 5. VERIFICAR ESTRUCTURA DE TABLA: PURCHASE_ORDER_ITEMS
-- ==========================================

-- Verificar columnas de purchase_order_items
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'purchase_order_items'
ORDER BY ordinal_position;

-- ==========================================
-- 6. VERIFICAR FUNCIONES SQL
-- ==========================================

-- Verificar si existen las funciones críticas
SELECT 
  routine_name,
  routine_type,
  routine_schema
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
-- 7. VERIFICAR FOREIGN KEYS
-- ==========================================

-- Verificar foreign keys de purchase_order_items a inventory
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
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
-- 8. VERIFICAR POLÍTICAS RLS
-- ==========================================

-- Verificar políticas RLS activas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('suppliers', 'purchase_orders', 'purchase_order_items')
ORDER BY tablename, policyname;

-- ==========================================
-- 9. VERIFICAR ÍNDICES
-- ==========================================

-- Verificar índices creados
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('suppliers', 'purchase_orders', 'purchase_order_items')
ORDER BY tablename, indexname;

-- ==========================================
-- 10. RESUMEN DE VERIFICACIÓN
-- ==========================================

-- Resumen completo del estado
SELECT 
  'Tablas' AS tipo,
  COUNT(*) AS cantidad,
  string_agg(table_name, ', ') AS nombres
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('suppliers', 'purchase_orders', 'purchase_order_items')

UNION ALL

SELECT 
  'Funciones' AS tipo,
  COUNT(*) AS cantidad,
  string_agg(routine_name, ', ') AS nombres
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generate_purchase_order_number',
    'increment_product_stock',
    'update_purchase_order_totals',
    'update_purchase_order_status'
  )

UNION ALL

SELECT 
  'Políticas RLS' AS tipo,
  COUNT(*) AS cantidad,
  string_agg(policyname, ', ') AS nombres
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('suppliers', 'purchase_orders', 'purchase_order_items');

-- ==========================================
-- 11. DETECTAR CONFLICTOS DE COLUMNAS
-- ==========================================

-- Verificar si suppliers tiene columnas de migración 003 (antigua) vs 029 (nueva)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'suppliers' 
      AND column_name = 'category'
    ) THEN 'Migración 003 (ANTIGUA) - Tiene columna "category"'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'suppliers' 
      AND column_name = 'company_name'
    ) THEN 'Migración 029 (NUEVA) - Tiene columna "company_name"'
    ELSE 'Estructura desconocida'
  END AS estado_suppliers,
  
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_order_items' 
      AND column_name = 'product_name'
    ) THEN 'Migración 003 (ANTIGUA) - Tiene columna "product_name"'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'purchase_order_items' 
      AND column_name = 'product_id'
    ) THEN 'Migración 029 (NUEVA) - Tiene columna "product_id"'
    ELSE 'Estructura desconocida'
  END AS estado_purchase_order_items;

-- ==========================================
-- FIN DEL SCRIPT
-- ==========================================
