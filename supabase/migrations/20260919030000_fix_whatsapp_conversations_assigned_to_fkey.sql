-- =====================================================
-- MIGRACIÓN: Corregir FK de whatsapp_conversations.assigned_to_user_id
-- Fecha: 2026-09-19
-- Objetivo: la FK apuntaba a system_users (tabla legacy, solo 4 filas, la
-- mayoría de usuarios reales no existen ahí) en vez de a la tabla users
-- real que usa el resto de la app (permisos, sesión, leads.assigned_to,
-- work_orders.assigned_to). Sin esto, "asignar conversación a un miembro
-- del equipo" no funcionaría para el 89% de los usuarios reales.
-- Verificado antes de aplicar: 93 conversaciones existentes, 0 con
-- assigned_to_user_id poblado — no hay datos que se puedan huerfanar.
-- =====================================================

alter table whatsapp_conversations
  drop constraint if exists whatsapp_conversations_assigned_to_user_id_fkey;

alter table whatsapp_conversations
  add constraint whatsapp_conversations_assigned_to_user_id_fkey
  foreign key (assigned_to_user_id) references users(id) on delete set null;

comment on column whatsapp_conversations.assigned_to_user_id is
  'Referencia a users.id (no system_users) — usuario del equipo asignado a esta conversación.';
