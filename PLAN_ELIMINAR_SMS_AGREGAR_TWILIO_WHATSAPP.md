# 📋 PLAN: Eliminar SMS y Agregar Twilio WhatsApp API Oficial

## 🎯 OBJETIVO
1. Eliminar completamente SMS del sistema
2. Agregar soporte para Twilio WhatsApp API Oficial (tier premium)
3. Crear capa de abstracción unificada para WAHA + Twilio WhatsApp
4. Mantener el motor de IA funcionando igual para ambos canales

---

## 📊 ANÁLISIS COMPLETO - ARCHIVOS A ELIMINAR

### 🗑️ DIRECTORIOS COMPLETOS A ELIMINAR

```
src/app/api/messaging/activate-sms/          ❌ ELIMINAR TODO
src/app/api/messaging/sms/                   ❌ ELIMINAR TODO
```

### 🗑️ ARCHIVOS INDIVIDUALES A ELIMINAR

```
src/app/api/messaging/send/sms/route.ts      ❌ ELIMINAR
src/app/api/messaging/test/sms/route.ts     ❌ ELIMINAR
src/app/mensajeria/sms/page.tsx              ❌ ELIMINAR
src/lib/messaging/sms-service.ts             ❌ ELIMINAR
src/lib/messaging/send-order-sms-notification.ts  ❌ ELIMINAR
supabase/migrations/028_add_sms_automation.sql    ❌ ELIMINAR (o crear down migration)
supabase/migrations/QUERY_TWILIO_NUMBERS.sql      ❌ ELIMINAR (solo para SMS)
```

### 📝 ARCHIVOS A MODIFICAR (eliminar referencias SMS)

```
src/app/api/messaging/config/route.ts        ✏️ MODIFICAR
src/app/api/messaging/stats/route.ts         ✏️ MODIFICAR
src/lib/messaging/twilio-client.ts           ✏️ MODIFICAR
src/app/api/work-orders/[id]/route.ts        ✏️ MODIFICAR (si tiene SMS automático)
src/app/mensajeria/page.tsx                  ✏️ MODIFICAR
src/components/layout/Sidebar.tsx             ✏️ MODIFICAR (eliminar menú SMS)
```

---

## 📊 ANÁLISIS - BASE DE DATOS

### 🗄️ TABLA: `organization_messaging_config`

**Columnas SMS a ELIMINAR:**
- `sms_enabled` ❌
- `sms_from_number` ❌
- `sms_provider` ❌
- `sms_twilio_number` ❌
- `sms_twilio_sid` ❌
- `sms_twilio_phone_sid` ❌
- `sms_webhook_url` ❌
- `sms_auto_notifications` ❌
- `sms_notification_statuses` ❌
- `sms_monthly_cost_usd` ❌
- `sms_per_message_cost_mxn` ❌
- `monthly_sms_limit` ❌

**Columnas a AGREGAR:**
- `tier` VARCHAR(20) DEFAULT 'basic' CHECK (tier IN ('basic', 'premium'))
- `whatsapp_api_provider` VARCHAR(20) -- 'waha' o 'twilio'
- `whatsapp_api_number` VARCHAR(20) -- +52 442 XXX XXXX
- `whatsapp_api_twilio_sid` VARCHAR(50) -- PNXXX... (Twilio Phone Number SID)
- `whatsapp_api_status` VARCHAR(20) DEFAULT 'inactive' -- 'active', 'inactive', 'pending'

### 🗄️ TABLA: `sms_messages`

**TABLA COMPLETA A ELIMINAR:**
```sql
DROP TABLE IF EXISTS sms_messages CASCADE;
```

---

## 📊 ANÁLISIS - CÓDIGO EXISTENTE A REUTILIZAR

### ✅ MOTOR DE IA (NO TOCAR - REUTILIZAR)

**Ubicación:** `src/integrations/whatsapp/services/ai-agent.ts`

**Función clave:**
```typescript
export async function processMessage(params: ProcessMessageParams): Promise<ProcessMessageResult>
```

**Uso actual:**
- Llamado desde `src/app/api/webhooks/whatsapp/route.ts` (webhook WAHA)
- Procesa mensajes con OpenAI/Anthropic
- Maneja funciones (agendar citas, crear órdenes, etc.)

**Acción:** ✅ REUTILIZAR esta función tal cual para ambos canales

### ✅ SERVICIO WAHA (NO TOCAR - REUTILIZAR)

**Ubicación:** `src/integrations/whatsapp/services/waha-service.ts`

**Funciones clave:**
- `sendTextMessage(organizationId, to, text)` ✅ REUTILIZAR
- `sendImage(organizationId, to, imageUrl, caption?)` ✅ REUTILIZAR
- `sendFile(organizationId, to, fileUrl, filename, caption?)` ✅ REUTILIZAR

**Acción:** ✅ REUTILIZAR estas funciones para tier 'basic'

### ✅ WEBHOOK WAHA EXISTENTE (MODIFICAR LEVEMENTE)

**Ubicación:** `src/app/api/webhooks/whatsapp/route.ts`

**Estado actual:**
- ✅ Funciona correctamente
- ✅ Procesa mensajes WAHA
- ✅ Usa `processMessage()` de ai-agent.ts

**Acción:** ✏️ MODIFICAR para delegar a capa unificada (opcional, puede quedarse igual)

---

## 🏗️ ESTRUCTURA PROPUESTA

### 📁 NUEVOS ARCHIVOS A CREAR

```
src/lib/messaging/
├── types.ts                    ✅ CREAR - Tipos TypeScript unificados
├── normalizer.ts              ✅ CREAR - Normalizar mensajes WAHA/Twilio
├── sender.ts                  ✅ CREAR - Envío inteligente por canal
└── unified-webhook.ts         ✅ CREAR - Manejo unificado de webhooks

src/app/api/messaging/
├── activate-premium/          ✅ CREAR - Endpoint activación tier premium
│   └── route.ts
└── twilio/                    ✅ CREAR - Webhook Twilio WhatsApp
    └── webhook/
        └── [organizationId]/
            └── route.ts
```

---

## 📋 PLAN DE IMPLEMENTACIÓN POR FASES

### FASE 1: LIMPIEZA - ELIMINAR SMS ⚠️

**1.1 Eliminar archivos:**
- [ ] `src/app/api/messaging/activate-sms/route.ts`
- [ ] `src/app/api/messaging/sms/webhook/[organizationId]/route.ts`
- [ ] `src/app/api/messaging/sms/webhook/[organizationId]/status/route.ts`
- [ ] `src/app/api/messaging/send/sms/route.ts`
- [ ] `src/app/api/messaging/test/sms/route.ts`
- [ ] `src/app/mensajeria/sms/page.tsx`
- [ ] `src/lib/messaging/sms-service.ts`
- [ ] `src/lib/messaging/send-order-sms-notification.ts`

**1.2 Limpiar referencias en archivos existentes:**
- [ ] `src/app/api/messaging/config/route.ts` - Eliminar campos SMS
- [ ] `src/app/api/messaging/stats/route.ts` - Eliminar estadísticas SMS
- [ ] `src/lib/messaging/twilio-client.ts` - Eliminar funciones SMS
- [ ] `src/app/api/work-orders/[id]/route.ts` - Eliminar notificaciones SMS automáticas
- [ ] `src/app/mensajeria/page.tsx` - Eliminar sección SMS
- [ ] `src/components/layout/Sidebar.tsx` - Eliminar menú SMS

**1.3 Eliminar migraciones:**
- [ ] Crear down migration para `028_add_sms_automation.sql`
- [ ] Eliminar `QUERY_TWILIO_NUMBERS.sql` (solo para SMS)

### FASE 2: BASE DE DATOS - MIGRACIÓN ⚠️

**2.1 Crear migración:**
- [ ] Archivo: `supabase/migrations/[timestamp]_remove_sms_add_tier.sql`
- [ ] Eliminar columnas SMS de `organization_messaging_config`
- [ ] Eliminar tabla `sms_messages`
- [ ] Agregar columnas nuevas (tier, whatsapp_api_*)
- [ ] Migrar datos existentes (tier='basic', provider='waha')
- [ ] Agregar índices y RLS policies

### FASE 3: BACKEND - CAPA DE ABSTRACCIÓN ✅

**3.1 Crear tipos:**
- [ ] `src/lib/messaging/types.ts` - Tipos unificados

**3.2 Crear normalizador:**
- [ ] `src/lib/messaging/normalizer.ts` - Normalizar WAHA/Twilio

**3.3 Crear sender:**
- [ ] `src/lib/messaging/sender.ts` - Envío inteligente
- [ ] Reutilizar `waha-service.ts` para tier basic
- [ ] Implementar Twilio WhatsApp para tier premium

**3.4 Crear webhook unificado:**
- [ ] `src/lib/messaging/unified-webhook.ts` - Manejo unificado
- [ ] Reutilizar `processMessage()` de ai-agent.ts
- [ ] Reutilizar lógica de conversaciones existente

### FASE 4: WEBHOOKS ✅

**4.1 Actualizar webhook WAHA:**
- [ ] `src/app/api/webhooks/whatsapp/route.ts` - Opcional: delegar a unified-webhook

**4.2 Crear webhook Twilio:**
- [ ] `src/app/api/messaging/twilio/webhook/[organizationId]/route.ts`
- [ ] Manejar form-data de Twilio
- [ ] Delegar a unified-webhook
- [ ] Retornar TwiML response

**4.3 Crear endpoint activación Premium:**
- [ ] `src/app/api/messaging/activate-premium/route.ts`
- [ ] Comprar número WhatsApp en Twilio
- [ ] Configurar webhook en Twilio
- [ ] Actualizar BD con tier='premium'

### FASE 5: UI - ACTUALIZAR COMPONENTES ✏️

**5.1 Actualizar página de mensajería:**
- [ ] `src/app/mensajeria/page.tsx` - Eliminar SMS, mostrar tiers
- [ ] Agregar botón "Upgrade to Premium"
- [ ] Mostrar estado: "WAHA (Básico)" o "API Oficial ✓"

**5.2 Actualizar Sidebar:**
- [ ] `src/components/layout/Sidebar.tsx` - Eliminar menú SMS

**5.3 Actualizar configuración:**
- [ ] Buscar componentes de configuración
- [ ] Eliminar opciones SMS
- [ ] Agregar selector de tier

---

## ⚠️ ARCHIVOS PROTEGIDOS - NO TOCAR

### 🛡️ NO MODIFICAR (CRÍTICO)

1. **`src/integrations/whatsapp/services/ai-agent.ts`**
   - ❌ NO modificar `processMessage()`
   - ✅ Solo reutilizar

2. **`src/integrations/whatsapp/services/waha-service.ts`**
   - ❌ NO modificar funciones existentes
   - ✅ Solo reutilizar

3. **`src/app/api/webhooks/whatsapp/route.ts`**
   - ⚠️ MODIFICAR solo para delegar a unified-webhook (opcional)
   - ✅ Mantener toda la lógica actual

4. **`src/components/WhatsAppQRConnectorSimple.tsx`**
   - ❌ NO tocar - Solo para tier básico (WAHA)

5. **`src/lib/context/SessionContext.tsx`**
   - ❌ NO modificar

6. **`src/middleware.ts`**
   - ❌ NO modificar

7. **Email (Resend)**
   - ❌ NO tocar nada relacionado con email

---

## ✅ CRITERIOS DE ÉXITO

1. ✅ Cero referencias a "SMS" en el código (excepto comentarios/documentación)
2. ✅ Base de datos sin columnas SMS
3. ✅ Webhook WAHA sigue funcionando (tier básico)
4. ✅ Nuevo webhook Twilio funcional (tier premium)
5. ✅ Motor de IA funciona igual para ambos canales
6. ✅ UI muestra solo Email y WhatsApp (con tiers)
7. ✅ Endpoint de activación Premium funcional
8. ✅ RLS policies correctas en nueva estructura
9. ✅ No se rompió ninguna funcionalidad existente

---

## 🧪 TESTING PLAN

### Test 1: Tier Básico (WAHA)
- [ ] Cliente envía mensaje → Llega a webhook WAHA
- [ ] IA procesa → Responde correctamente
- [ ] Mensaje se guarda en historial

### Test 2: Tier Premium (Twilio)
- [ ] Activar premium → Compra número
- [ ] Cliente envía mensaje → Llega a webhook Twilio
- [ ] IA procesa → Responde correctamente
- [ ] Mensaje se guarda en historial

### Test 3: Cambio de tier
- [ ] Organización básica → Puede hacer upgrade
- [ ] Después de upgrade → Mensajes llegan por Twilio
- [ ] WAHA se desactiva correctamente

---

## 📝 NOTAS IMPORTANTES

1. **Migración de datos:** Las organizaciones existentes se migran automáticamente a tier='basic' con provider='waha'
2. **Backward compatibility:** El webhook WAHA actual seguirá funcionando sin cambios
3. **Rollback:** Si algo falla, revertir migración y restaurar código anterior
4. **Variables de entorno:** Documentar que `TWILIO_SMS_*` ya no se usan

---

## ⏭️ SIGUIENTE PASO

**¿Proceder con la implementación?**

Responde:
- **"SÍ"** - Para ejecutar todas las fases
- **"FASE X"** - Para ejecutar solo una fase específica
- **"REVISAR"** - Para revisar algún punto específico antes
