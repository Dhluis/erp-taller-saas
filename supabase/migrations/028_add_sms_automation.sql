-- =====================================================
-- MIGRACIÓN 028: Sistema SMS Automático
-- =====================================================
-- Fecha: 2026-01-29
-- Descripción: Agrega campos para SMS automático (compra de números, webhooks, tracking)
--              SIN MODIFICAR campos existentes

-- Agregar columnas adicionales para SMS automático
DO $$ 
BEGIN
  -- sms_twilio_phone_sid: SID del número comprado en Twilio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_twilio_phone_sid'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE organization_messaging_config 
    ADD COLUMN sms_twilio_phone_sid text;
  END IF;

  -- sms_webhook_url: URL del webhook para SMS entrantes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_webhook_url'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE organization_messaging_config 
    ADD COLUMN sms_webhook_url text;
  END IF;

  -- sms_auto_notifications: Habilitar notificaciones automáticas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_auto_notifications'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE organization_messaging_config 
    ADD COLUMN sms_auto_notifications boolean default false;
  END IF;

  -- sms_notification_statuses: Estados que activan SMS automático
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organization_messaging_config' 
    AND column_name = 'sms_notification_statuses'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE organization_messaging_config 
    ADD COLUMN sms_notification_statuses text[] default array['completed', 'ready'];
  END IF;
END $$;

-- Comentarios
COMMENT ON COLUMN organization_messaging_config.sms_twilio_phone_sid IS 'SID del número de teléfono comprado en Twilio';
COMMENT ON COLUMN organization_messaging_config.sms_webhook_url IS 'URL del webhook para recibir SMS entrantes';
COMMENT ON COLUMN organization_messaging_config.sms_auto_notifications IS 'Habilitar envío automático de SMS al cambiar estado de órdenes';
COMMENT ON COLUMN organization_messaging_config.sms_notification_statuses IS 'Estados de orden que activan SMS automático (ej: completed, ready)';

-- Crear tabla para tracking de SMS enviados
CREATE TABLE IF NOT EXISTS sms_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  
  -- Información del mensaje
  to_number text not null,
  from_number text not null,
  message_body text not null,
  message_sid text, -- SID de Twilio
  
  -- Estado y tracking
  status text default 'pending' check (status in ('pending', 'sent', 'delivered', 'failed', 'undelivered')),
  error_code text,
  error_message text,
  
  -- Relación con orden (opcional)
  work_order_id uuid references work_orders(id) on delete set null,
  order_status text, -- Estado de orden que activó el SMS
  
  -- Metadata
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  delivered_at timestamptz,
  
  -- Índices
  constraint sms_messages_org_fk foreign key (organization_id) references organizations(id) on delete cascade
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sms_messages_org ON sms_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_work_order ON sms_messages(work_order_id);
CREATE INDEX IF NOT EXISTS idx_sms_messages_status ON sms_messages(status);
CREATE INDEX IF NOT EXISTS idx_sms_messages_created ON sms_messages(created_at desc);
CREATE INDEX IF NOT EXISTS idx_sms_messages_sid ON sms_messages(message_sid);

-- RLS para sms_messages
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- Policy: usuarios solo ven SMS de su organización
CREATE POLICY "Users can view their org SMS messages"
  ON sms_messages FOR SELECT
  USING (
    exists (
      select 1 
      from users 
      where users.auth_user_id = auth.uid()
        and users.organization_id = sms_messages.organization_id
    )
    or exists (
      select 1 
      from user_profiles 
      where user_profiles.id = auth.uid()
        and user_profiles.organization_id = sms_messages.organization_id
    )
  );

-- Policy: usuarios solo pueden insertar SMS para su organización
CREATE POLICY "Users can insert SMS for their org"
  ON sms_messages FOR INSERT
  WITH CHECK (
    exists (
      select 1 
      from users 
      where users.auth_user_id = auth.uid()
        and users.organization_id = sms_messages.organization_id
    )
    or exists (
      select 1 
      from user_profiles 
      where user_profiles.id = auth.uid()
        and user_profiles.organization_id = sms_messages.organization_id
    )
  );

-- Policy: usuarios solo pueden actualizar SMS de su organización
CREATE POLICY "Users can update their org SMS messages"
  ON sms_messages FOR UPDATE
  USING (
    exists (
      select 1 
      from users 
      where users.auth_user_id = auth.uid()
        and users.organization_id = sms_messages.organization_id
    )
    or exists (
      select 1 
      from user_profiles 
      where user_profiles.id = auth.uid()
        and user_profiles.organization_id = sms_messages.organization_id
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_sms_messages_updated_at
  BEFORE UPDATE ON sms_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en tabla
COMMENT ON TABLE sms_messages IS 'Historial de SMS enviados y recibidos por organización';
COMMENT ON COLUMN sms_messages.work_order_id IS 'ID de la orden de trabajo relacionada (si aplica)';
COMMENT ON COLUMN sms_messages.order_status IS 'Estado de orden que activó el SMS automático';

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Migración 028 completada: Sistema SMS Automático';
  RAISE NOTICE '   - Columnas agregadas a organization_messaging_config';
  RAISE NOTICE '   - Tabla sms_messages creada con RLS';
END $$;

