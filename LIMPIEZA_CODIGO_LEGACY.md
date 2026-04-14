# 🧹 LIMPIEZA DE CÓDIGO LEGACY

## Archivos a ELIMINAR (no se usan con WAHA):

### 1. Evolution API (Legacy)
- ❌ `src/integrations/whatsapp/utils/evolution-parser.ts`
- ❌ Referencias a Evolution en otros archivos

### 2. Meta/Facebook Business API (Official - Legacy)
- ❌ `src/integrations/whatsapp/utils/meta-parser.ts`
- ❌ `src/integrations/whatsapp/senders/meta-sender.ts`
- ❌ Referencias a Meta en otros archivos

### 3. Endpoints obsoletos
- ❌ `src/app/api/whatsapp/qr-coexistence/route.ts` (mezclaba WAHA + Meta + Evolution)
- ⚠️ `src/app/api/whatsapp/qr/route.ts` (revisar si usa WAHA o legacy)

### 4. Otros providers (si no los usas)
- ❌ `src/integrations/whatsapp/senders/twilio-sender.ts`
- ❌ `src/integrations/whatsapp/utils/twilio-parser.ts`

## Archivos a CONSERVAR (WAHA actual):

### Core WAHA (MANTENER)
- ✅ `src/lib/waha-sessions.ts` - Gestión multi-tenant de sesiones
- ✅ `src/app/api/whatsapp/session/route.ts` - Endpoint principal
- ✅ `src/components/WhatsAppQRConnectorSimple.tsx` - UI simplificada
- ✅ `src/integrations/whatsapp/services/waha-service.ts` - Servicio WAHA
- ✅ `src/integrations/whatsapp/services/ai-agent.ts` - Agente AI
- ✅ `src/integrations/whatsapp/services/webhook-handler.ts` - Procesador de webhooks
- ✅ `src/app/api/whatsapp/send/route.ts` - Envío de mensajes
- ✅ `src/app/api/webhooks/whatsapp/[organization_id]/route.ts` - Webhook receiver

### Utilidades (MANTENER)
- ✅ `src/integrations/whatsapp/utils/supabase-helpers.ts`
- ✅ `src/integrations/whatsapp/utils/supabase-server-helpers.ts`
- ✅ `src/integrations/whatsapp/adapters/*` - Adaptadores de datos

### Diagnóstico (MANTENER)
- ✅ `src/app/api/whatsapp/test-waha/route.ts` - Herramienta nueva
- ✅ `src/app/api/whatsapp/diagnose/route.ts` - Diagnóstico existente

## ⚠️ REVISAR antes de eliminar:

### `src/integrations/whatsapp/services/message-sender.ts`
- ¿Usa WAHA o tiene lógica para Meta/Evolution?
- Si tiene switch/case para múltiples providers, simplificar a solo WAHA

### `src/integrations/whatsapp/utils/index.ts`
- ¿Exporta funciones de Evolution/Meta?
- Limpiar exports obsoletos

### `src/integrations/whatsapp/types/index.ts`
- ¿Define tipos para Evolution/Meta?
- Eliminar tipos no usados

## Posibles CONFLICTOS identificados:

1. **Nombres de sesión diferentes**:
   - Evolution/Meta probablemente usaban otro formato
   - WAHA usa: `confiadrive_<orgId>`
   - Verificar que no haya lógica que espere el formato antiguo

2. **Webhooks diferentes**:
   - Evolution API tiene estructura de payload diferente
   - Meta API tiene estructura diferente
   - WAHA tiene su propia estructura
   - El webhook-handler.ts debe estar configurado solo para WAHA

3. **Variables de entorno**:
   - Pueden existir: `EVOLUTION_API_URL`, `META_ACCESS_TOKEN`, etc.
   - Estas ya no se usan, pero no causan conflicto (solo ocupan espacio)

4. **message-sender.ts probablemente tiene lógica para elegir provider**:
   ```typescript
   // Posible código legacy:
   if (config.provider === 'evolution') { ... }
   else if (config.provider === 'meta') { ... }
   else if (config.provider === 'waha') { ... }
   ```
   - Simplificar a solo WAHA

## Impacto de eliminar archivos:

### Bajo riesgo ✅:
- `evolution-parser.ts` - Solo se usaba para Evolution
- `meta-parser.ts` - Solo se usaba para Meta
- `meta-sender.ts` - Solo se usaba para Meta
- `twilio-parser.ts` / `twilio-sender.ts` - Solo para Twilio
- `qr-coexistence/route.ts` - Endpoint obsoleto que mezclaba todo

### Medio riesgo ⚠️:
- `message-sender.ts` - Revisar primero, puede tener lógica compartida
- `webhook-handler.ts` - Verificar que solo procese webhooks de WAHA
- `types/index.ts` - Puede tener tipos usados en otros lugares
- `utils/index.ts` - Puede exportar utilidades usadas

### Alto riesgo ❌:
- Ninguno de los archivos legacy es crítico si ya usas WAHA

## Recomendación de LIMPIEZA SEGURA:

### Fase 1 - Eliminar lo obvio (BAJO RIESGO):
```bash
# Parsers legacy
rm src/integrations/whatsapp/utils/evolution-parser.ts
rm src/integrations/whatsapp/utils/meta-parser.ts
rm src/integrations/whatsapp/utils/twilio-parser.ts

# Senders legacy
rm src/integrations/whatsapp/senders/meta-sender.ts
rm src/integrations/whatsapp/senders/twilio-sender.ts

# Endpoint obsoleto
rm src/app/api/whatsapp/qr-coexistence/route.ts
```

### Fase 2 - Revisar y limpiar (MEDIO RIESGO):
1. Revisar `message-sender.ts` - simplificar a solo WAHA
2. Revisar `webhook-handler.ts` - verificar que solo use WAHA
3. Revisar `types/index.ts` - eliminar tipos de Evolution/Meta
4. Revisar `utils/index.ts` - eliminar exports de parsers legacy

### Fase 3 - Limpiar referencias:
1. Buscar imports de archivos eliminados
2. Eliminar código muerto relacionado
3. Actualizar documentación

## ¿Proceder con la limpieza?

Si confirmas, ejecuto:
1. ✅ Fase 1 automática (bajo riesgo)
2. 🔍 Análisis de Fase 2 (te muestro qué cambiar)
3. 📝 Lista de referencias a actualizar

