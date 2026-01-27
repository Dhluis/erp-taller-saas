-- =====================================================
-- MIGRACIÓN 027: Tabla de Configuración de Mensajería
-- =====================================================
-- Fecha: 2026-01-23
-- Descripción: Crea tabla organization_messaging_config para configuración
--              de Email, SMS y WhatsApp por organización (multi-tenant)
--              SIN MODIFICAR tablas existentes

-- Tabla de configuración de mensajería por organización
create table if not exists organization_messaging_config (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  
  -- Email configuration
  email_enabled boolean default true,
  email_from_name text default 'Mi Taller',
  email_reply_to text,
  
  -- SMS configuration
  sms_enabled boolean default false,
  sms_from_number text, -- Número Twilio
  
  -- WhatsApp configuration
  whatsapp_provider text default 'waha', -- 'waha' o 'twilio'
  whatsapp_enabled boolean default false,
  whatsapp_twilio_number text, -- Número Twilio WhatsApp
  whatsapp_verified boolean default false,
  
  -- WAHA configuration (existente)
  waha_session_id text,
  waha_connected boolean default false,
  
  -- AI Chatbot
  chatbot_enabled boolean default false,
  chatbot_system_prompt text,
  
  -- Límites y costos
  monthly_email_limit integer default 1000,
  monthly_sms_limit integer default 100,
  monthly_whatsapp_limit integer default 500,
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraint: una config por organización
  unique(organization_id)
);

-- Índices
create index if not exists idx_messaging_config_org on organization_messaging_config(organization_id);

-- Comentarios
comment on table organization_messaging_config is 'Configuración de mensajería (Email, SMS, WhatsApp) por organización';
comment on column organization_messaging_config.whatsapp_provider is 'Proveedor de WhatsApp: waha o twilio';
comment on column organization_messaging_config.monthly_email_limit is 'Límite mensual de emails (0 = ilimitado)';
comment on column organization_messaging_config.monthly_sms_limit is 'Límite mensual de SMS (0 = ilimitado)';
comment on column organization_messaging_config.monthly_whatsapp_limit is 'Límite mensual de WhatsApp (0 = ilimitado)';

-- RLS Policies
alter table organization_messaging_config enable row level security;

-- Policy: usuarios solo ven su organización
-- Nota: Esta política asume que los usuarios tienen organization_id en su perfil
-- Si tu sistema usa otro método de autenticación, ajusta esta política
create policy "Users can view their org messaging config"
  on organization_messaging_config for select
  using (
    organization_id in (
      select organization_id 
      from users 
      where auth_user_id = auth.uid()
    )
  );

-- Policy: usuarios solo pueden actualizar su organización
create policy "Users can update their org messaging config"
  on organization_messaging_config for update
  using (
    organization_id in (
      select organization_id 
      from users 
      where auth_user_id = auth.uid()
    )
  );

-- Policy: usuarios solo pueden insertar para su organización
create policy "Users can insert their org messaging config"
  on organization_messaging_config for insert
  with check (
    organization_id in (
      select organization_id 
      from users 
      where auth_user_id = auth.uid()
    )
  );

-- Verificar si existe la función update_updated_at_column, si no, crearla
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger para updated_at
create trigger update_messaging_config_updated_at
  before update on organization_messaging_config
  for each row
  execute function update_updated_at_column();

-- Crear configuración default para organizaciones existentes
-- Solo inserta si no existe ya una configuración para esa organización
insert into organization_messaging_config (organization_id, email_enabled, whatsapp_provider)
select id, true, 'waha'
from organizations
where id not in (select organization_id from organization_messaging_config)
on conflict (organization_id) do nothing;

-- Verificación: Contar configuraciones creadas
do $$
declare
  config_count integer;
  org_count integer;
begin
  select count(*) into config_count from organization_messaging_config;
  select count(*) into org_count from organizations;
  
  raise notice '✅ Configuraciones creadas: % de % organizaciones', config_count, org_count;
  
  if config_count < org_count then
    raise warning '⚠️ Algunas organizaciones no tienen configuración. Ejecuta el INSERT manualmente.';
  end if;
end $$;

