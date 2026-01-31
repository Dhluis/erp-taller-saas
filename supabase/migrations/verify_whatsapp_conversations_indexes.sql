-- =====================================================
-- VERIFICACIÓN Y CREACIÓN DE ÍNDICES PARA PAGINACIÓN
-- Tabla: whatsapp_conversations
-- =====================================================
-- Fecha: 2026-01-31
-- Descripción: Índices optimizados para paginación y búsqueda

-- =====================================================
-- 1. VERIFICAR ÍNDICES EXISTENTES
-- =====================================================
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'whatsapp_conversations'
ORDER BY indexname;

-- =====================================================
-- 2. CREAR ÍNDICES OPTIMIZADOS PARA PAGINACIÓN
-- =====================================================

-- Índice compuesto para paginación por fecha (CRÍTICO para performance)
-- Usado en: ORDER BY last_message_at DESC con filtro organization_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_org_last_message 
ON whatsapp_conversations(organization_id, last_message_at DESC NULLS LAST);

-- Índice para búsqueda por teléfono
-- Usado en: WHERE customer_phone ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_org_phone 
ON whatsapp_conversations(organization_id, customer_phone);

-- Índice para búsqueda por nombre
-- Usado en: WHERE customer_name ILIKE '%search%'
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_org_name 
ON whatsapp_conversations(organization_id, customer_name);

-- Índice para ordenamiento por fecha de creación
-- Usado en: ORDER BY created_at
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_org_created 
ON whatsapp_conversations(organization_id, created_at DESC);

-- Índice para ordenamiento por cantidad de mensajes
-- Usado en: ORDER BY messages_count
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_org_messages_count 
ON whatsapp_conversations(organization_id, messages_count DESC);

-- Índice para filtro de status (ya puede existir, pero lo verificamos)
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_org_status 
ON whatsapp_conversations(organization_id, status);

-- =====================================================
-- 3. VERIFICAR ÍNDICES CREADOS
-- =====================================================
SELECT 
  indexname,
  indexdef,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename = 'whatsapp_conversations'
ORDER BY indexname;

-- =====================================================
-- 4. ESTADÍSTICAS DE LA TABLA
-- =====================================================
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE tablename = 'whatsapp_conversations';
