-- 📊 CONSULTA SQL PARA OBTENER ESQUEMA COMPLETO DE SUPABASE
-- Ejecutar en Supabase SQL Editor para obtener el esquema real

-- 🔍 CONSULTA PRINCIPAL: Obtener todas las columnas de todas las tablas
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 🔍 CONSULTA ADICIONAL: Obtener información de índices
SELECT 
  t.table_name,
  i.indexname,
  i.indexdef,
  pg_size_pretty(pg_relation_size(i.indexrelid)) as index_size
FROM information_schema.tables t
LEFT JOIN pg_indexes i ON t.table_name = i.tablename
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, i.indexname;

-- 🔍 CONSULTA ADICIONAL: Obtener información de foreign keys
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- 🔍 CONSULTA ADICIONAL: Obtener información de tablas y sus tamaños
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 🔍 CONSULTA ADICIONAL: Obtener información de triggers
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 🔍 CONSULTA ADICIONAL: Obtener información de funciones
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 📝 INSTRUCCIONES DE USO:
-- 1. Ejecutar cada consulta por separado en Supabase SQL Editor
-- 2. Copiar los resultados
-- 3. Actualizar el archivo SCHEMA.md con la información real
-- 4. Verificar que todas las tablas estén documentadas
-- 5. Actualizar las relaciones y índices según los resultados
