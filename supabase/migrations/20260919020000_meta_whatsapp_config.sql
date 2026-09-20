-- =====================================================
-- MIGRACIÓN: Configuración de Meta WhatsApp Cloud API
-- Fecha: 2026-09-19
-- Objetivo: soportar el modelo centralizado de WhatsApp con la API oficial
-- de Meta. Token de acceso global vive en variables de entorno; cada
-- organización solo necesita su propio meta_phone_number_id para que el
-- webhook (único, global) sepa a qué organización rutear cada mensaje
-- entrante. meta_business_account_id y meta_access_token quedan nullable
-- para no requerir otra migración si en el futuro algún taller trae su
-- propia cuenta de Meta o se migra a un modelo con múltiples portfolios/BSP.
-- =====================================================

alter table organization_messaging_config
  add column if not exists meta_phone_number_id text,
  add column if not exists meta_business_account_id text,
  add column if not exists meta_access_token text;

-- Único mecanismo de aislamiento multi-tenant del webhook: dos organizaciones
-- nunca pueden compartir el mismo phone_number_id. Parcial para permitir
-- muchos NULL (organizaciones sin WhatsApp configurado todavía).
create unique index if not exists idx_org_messaging_config_meta_phone_number_id
  on organization_messaging_config(meta_phone_number_id)
  where meta_phone_number_id is not null;

comment on column organization_messaging_config.meta_phone_number_id is
  'ID de número de WhatsApp Business (Meta Cloud API). Usado para rutear el webhook global a esta organización.';
comment on column organization_messaging_config.meta_business_account_id is
  'ID de la WhatsApp Business Account (WABA) de Meta a la que pertenece el número, si se necesita distinguir entre varios portfolios en el futuro.';
comment on column organization_messaging_config.meta_access_token is
  'Override opcional de token de acceso por organización. Si es NULL, se usa META_WHATSAPP_ACCESS_TOKEN global.';
