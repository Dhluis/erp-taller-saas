-- ═══════════════════════════════════════════════════════════════
-- QUERIES DE DIAGNÓSTICO - DESINCRONIZACIÓN DASHBOARD vs KANBAN
-- ═══════════════════════════════════════════════════════════════
-- 
-- INSTRUCCIONES:
-- 1. Abre Supabase SQL Editor
-- 2. Ejecuta cada query por separado
-- 3. Copia los resultados de cada una
-- 4. Comparte los resultados con el desarrollador
--
-- ═══════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────
-- QUERY 1: Ver TODAS las órdenes con fechas
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Verificar cuántas órdenes hay en total y sus fechas

SELECT 
  id,
  status,
  created_at,
  entry_date,
  organization_id,
  workshop_id,
  DATE(created_at) as fecha_creacion,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') as fecha_formateada
FROM work_orders
ORDER BY created_at DESC;

-- RESULTADO ESPERADO:
-- - Deberías ver todas las órdenes con sus fechas
-- - Anota el TOTAL de órdenes
-- - Verifica si todas tienen organization_id y workshop_id


-- ───────────────────────────────────────────────────────────────
-- QUERY 2: Contar órdenes de los últimos 7 días por estado
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Ver exactamente qué cuenta Supabase con filtro de 7 días

SELECT 
  status,
  COUNT(*) as total,
  MIN(created_at) as primera_orden,
  MAX(created_at) as ultima_orden,
  TO_CHAR(MIN(created_at), 'DD/MM/YYYY HH24:MI:SS') as primera_formateada,
  TO_CHAR(MAX(created_at), 'DD/MM/YYYY HH24:MI:SS') as ultima_formateada
FROM work_orders
WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days')
GROUP BY status
ORDER BY status;

-- RESULTADO ESPERADO:
-- - Deberías ver cuántas órdenes hay por estado en los últimos 7 días
-- - SUMA el total y compáralo con lo que muestra el Dashboard


-- ───────────────────────────────────────────────────────────────
-- QUERY 3: Ver si hay órdenes sin organization_id
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Verificar si hay órdenes "huérfanas" sin organización

SELECT 
  COUNT(*) as ordenes_sin_organization,
  COUNT(*) FILTER (WHERE workshop_id IS NULL) as ordenes_sin_workshop
FROM work_orders 
WHERE organization_id IS NULL OR workshop_id IS NULL;

-- RESULTADO ESPERADO:
-- - Debería ser 0 en ambos casos
-- - Si hay algún número > 0, hay un problema de datos


-- ───────────────────────────────────────────────────────────────
-- QUERY 4: Ver si hay múltiples organizations
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Verificar cuántas organizaciones hay en la BD

SELECT 
  organization_id,
  workshop_id,
  COUNT(*) as total_ordenes,
  MIN(created_at) as primera_orden,
  MAX(created_at) as ultima_orden
FROM work_orders
GROUP BY organization_id, workshop_id
ORDER BY total_ordenes DESC;

-- RESULTADO ESPERADO:
-- - Si hay 1 sola fila: perfecto
-- - Si hay múltiples filas: hay múltiples organizaciones/workshops


-- ───────────────────────────────────────────────────────────────
-- QUERY 5: Órdenes de los últimos 7 días CON DETALLES
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Ver las órdenes exactas que debería mostrar el Dashboard

SELECT 
  id,
  status,
  created_at,
  TO_CHAR(created_at, 'DD/MM/YYYY HH24:MI:SS') as fecha_creacion,
  organization_id,
  workshop_id,
  EXTRACT(DAY FROM (NOW() - created_at)) as dias_desde_creacion
FROM work_orders
WHERE created_at >= (CURRENT_DATE - INTERVAL '7 days')
ORDER BY created_at DESC;

-- RESULTADO ESPERADO:
-- - Ver las órdenes específicas de los últimos 7 días
-- - Verificar que todas tengan organization_id correcto


-- ───────────────────────────────────────────────────────────────
-- QUERY 6: Comparar rangos de fechas (Dashboard vs Kanban)
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Ver exactamente qué rango usa Supabase

SELECT 
  CURRENT_DATE as hoy,
  CURRENT_DATE - INTERVAL '7 days' as hace_7_dias,
  NOW() as ahora,
  NOW() - INTERVAL '7 days' as hace_7_dias_con_hora,
  (CURRENT_DATE - INTERVAL '7 days')::timestamp as inicio_7dias_00h,
  (CURRENT_DATE + INTERVAL '1 day' - INTERVAL '1 second')::timestamp as fin_hoy_23h59;

-- RESULTADO ESPERADO:
-- - Ver exactamente qué fechas usa Supabase
-- - Comparar con los logs del Dashboard y Kanban


-- ───────────────────────────────────────────────────────────────
-- QUERY 7: Órdenes del mes actual
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Verificar filtro "Este mes"

SELECT 
  status,
  COUNT(*) as total
FROM work_orders
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND created_at < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY status
ORDER BY status;

-- RESULTADO ESPERADO:
-- - Órdenes del 1 al 31 del mes actual


-- ───────────────────────────────────────────────────────────────
-- QUERY 8: Verificar zona horaria de la BD
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Ver si hay problema de zona horaria

SELECT 
  CURRENT_TIMESTAMP as timestamp_actual,
  CURRENT_DATE as fecha_actual,
  NOW() as now_actual,
  EXTRACT(TIMEZONE FROM NOW()) / 3600 as timezone_hours;

-- RESULTADO ESPERADO:
-- - Ver qué hora tiene Supabase
-- - Comparar con la hora de tu computadora


-- ───────────────────────────────────────────────────────────────
-- QUERY 9: Contar TODAS las órdenes por estado (sin filtro)
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Baseline - qué debería mostrar "Todas"

SELECT 
  status,
  COUNT(*) as total
FROM work_orders
GROUP BY status
ORDER BY status;

-- RESULTADO ESPERADO:
-- - Total general sin filtros
-- - Esto es lo que debería mostrar el Kanban con filtro "Todas"


-- ───────────────────────────────────────────────────────────────
-- QUERY 10: Ver UNA orden completa de ejemplo
-- ───────────────────────────────────────────────────────────────
-- OBJETIVO: Ver la estructura completa de una orden

SELECT *
FROM work_orders
ORDER BY created_at DESC
LIMIT 1;

-- RESULTADO ESPERADO:
-- - Ver todos los campos de una orden
-- - Verificar que tenga todos los campos necesarios


-- ═══════════════════════════════════════════════════════════════
-- PREGUNTAS PARA RESPONDER DESPUÉS DE EJECUTAR LAS QUERIES
-- ═══════════════════════════════════════════════════════════════

/*
DESPUÉS DE EJECUTAR TODAS LAS QUERIES, RESPONDE:

1. ¿Cuántas órdenes tiene la BD en total? (Query 1)
   Respuesta: _______

2. ¿Cuántas órdenes de los últimos 7 días hay según Supabase? (Query 2)
   Respuesta: _______

3. ¿Cuántas órdenes muestra el Dashboard para "Últimos 7 días"?
   Respuesta: _______

4. ¿Cuántas órdenes muestra el Kanban para "Últimos 7 días"?
   Respuesta: _______

5. ¿Los rangos de fechas en los logs son exactamente iguales? (Sí/No)
   Respuesta: _______

6. ¿Hay órdenes con organization_id NULL? (Query 3)
   Respuesta: _______

7. ¿Hay múltiples organization_id en la BD? (Query 4)
   Respuesta: _______

8. ¿Qué zona horaria tiene Supabase? (Query 8)
   Respuesta: _______

9. ¿La zona horaria coincide con tu ubicación? (Sí/No)
   Respuesta: _______

10. ¿Ves alguna diferencia en las fechas entre created_at y entry_date? (Sí/No)
    Respuesta: _______
*/

