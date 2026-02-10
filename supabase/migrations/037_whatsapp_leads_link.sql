-- Vincular conversaciones de WhatsApp con leads (crear lead en vez de cliente automáticamente)
-- whatsapp_conversations: lead_id, is_lead, lead_status, lead_updated_at
-- leads: whatsapp_conversation_id, lead_source, customer_id, converted_at (pueden existir en otras migraciones)

-- 1. whatsapp_conversations: columnas para lead
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'lead_id') THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.whatsapp_conversations.lead_id IS 'Lead vinculado cuando el contacto aún no es cliente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'is_lead') THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN is_lead BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'lead_status') THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN lead_status TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'lead_updated_at') THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN lead_updated_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. leads: columnas para WhatsApp y conversión (si no existen)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'whatsapp_conversation_id') THEN
    ALTER TABLE public.leads ADD COLUMN whatsapp_conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'lead_source') THEN
    ALTER TABLE public.leads ADD COLUMN lead_source TEXT DEFAULT 'manual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'customer_id') THEN
    ALTER TABLE public.leads ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'converted_at') THEN
    ALTER TABLE public.leads ADD COLUMN converted_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'company') THEN
    ALTER TABLE public.leads ADD COLUMN company TEXT;
  END IF;
END $$;

-- Índice para buscar conversación por lead_id
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_lead_id ON public.whatsapp_conversations(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_conversation_id ON public.leads(whatsapp_conversation_id) WHERE whatsapp_conversation_id IS NOT NULL;
