# WhatsApp Integration - Database Schema

## 📊 Tablas Creadas

### 1. `whatsapp_config`
**Propósito:** Configuración de WhatsApp Business API por organización.

**Campos principales:**
- `organization_id` - Organización dueña
- `provider` - twilio | evolution | meta-cloud
- `phone_number` - Número de WhatsApp del taller
- `is_active` - Estado de activación

**RLS:** Solo usuarios de la organización pueden ver/modificar

---

### 2. `whatsapp_conversations`
**Propósito:** Historial de conversaciones con clientes.

**Campos principales:**
- `customer_phone` - Teléfono del cliente
- `customer_id` - Referencia a tabla customers (opcional)
- `status` - active | closed | archived
- `is_bot_active` - Si el bot está manejando la conversación
- `assigned_to_user_id` - Usuario humano si fue escalado

**Relaciones:**
- `related_order_id` - Orden asociada (opcional)
- `related_appointment_id` - Cita asociada (opcional)

**RLS:** Solo usuarios de la organización

---

### 3. `whatsapp_messages`
**Propósito:** Mensajes individuales de cada conversación.

**Campos principales:**
- `conversation_id` - Conversación a la que pertenece
- `direction` - inbound | outbound
- `body` - Contenido del mensaje
- `message_type` - text | image | document | audio | video
- `status` - sent | delivered | read | failed

**RLS:** Solo usuarios de la organización

---

### 4. `ai_agent_config`
**Propósito:** Configuración del bot IA por organización.

**Campos principales:**
- `enabled` - Si el bot está activo
- `provider` - openai | anthropic
- `model` - Modelo específico (claude-3-5-sonnet, gpt-4, etc.)
- `system_prompt` - Prompt del sistema
- `auto_schedule_appointments` - Si puede agendar automáticamente
- `business_hours` - Horarios de atención (JSON)
- `services` - Servicios disponibles (JSON)
- `faqs` - Preguntas frecuentes (JSON)

**RLS:** Solo usuarios de la organización

---

### 5. Tablas de Metadata

#### `whatsapp_order_metadata`
Tracking adicional de órdenes creadas por el bot.

#### `whatsapp_appointment_metadata`
Tracking adicional de citas creadas por el bot.

#### `whatsapp_customer_metadata`
Tracking adicional de clientes que contactaron por WhatsApp.

---

## 🔒 Seguridad (RLS Policies)

Todas las tablas tienen Row Level Security habilitado:
```sql
-- Ejemplo de policy
CREATE POLICY "Users can view their org data"
  ON table_name FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM user_organizations 
      WHERE user_id = auth.uid()
    )
  );
```

Esto asegura que:
- ✅ Los usuarios solo ven datos de su organización
- ✅ Multi-tenant seguro
- ✅ Sin posibilidad de ver datos de otros talleres

---

## 📈 Índices Creados

Para optimizar performance:

- `organization_id` - En todas las tablas
- `customer_phone` - Para búsquedas rápidas
- `created_at DESC` - Para ordenamiento temporal
- `status` - Para filtros de estado

---

## 🔄 Triggers Automáticos

### `update_updated_at_column`
Actualiza automáticamente el campo `updated_at` en cada UPDATE.

### `update_conversation_message_count`
Incrementa el contador de mensajes y actualiza `last_message_at` cuando llega un nuevo mensaje.

---

## 🚀 Cómo Ejecutar

1. Abre Supabase Dashboard
2. Ve a SQL Editor
3. Copia y pega el contenido de `database-schema.sql`
4. Ejecuta
5. ✅ Verifica que todas las tablas se crearon

---

## 🧪 Verificación
```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'whatsapp%'
OR table_name LIKE 'ai_agent%';

-- Debería retornar:
-- whatsapp_config
-- whatsapp_conversations
-- whatsapp_messages
-- whatsapp_order_metadata
-- whatsapp_appointment_metadata
-- whatsapp_customer_metadata
-- ai_agent_config
```

---

## ⚠️ Importante

- **NO se modificó ninguna tabla existente**
- Todas las nuevas tablas tienen `FOREIGN KEY` a tablas existentes
- Si borras una organización, se borran en cascada sus datos de WhatsApp
- RLS activo en todas las tablas

