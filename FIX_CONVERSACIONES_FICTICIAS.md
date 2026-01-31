# ✅ FIX: Conversaciones Ficticias WhatsApp - IMPLEMENTADO

## 🎯 PROBLEMA RESUELTO

**Antes:**
- WAHA envía `@lid` (IDs internos de WhatsApp) como `93832184119502@lid`
- El webhook los trataba como números reales
- Se creaban conversaciones ficticias con esos IDs

**Después:**
- `@lid` se resuelve al número real via API de WAHA
- Si no se resuelve, el mensaje se ignora (no crea conversación)
- Solo se crean conversaciones con números reales válidos

---

## 🔧 CAMBIOS IMPLEMENTADOS

### 1. Nueva Función: `resolveRealPhoneNumber()`

**Ubicación:** `src/app/api/webhooks/whatsapp/route.ts`

**Funcionalidad:**
- ✅ Si es `@c.us` → usa el número directamente (ya es real)
- ✅ Si es `@s.whatsapp.net` → usa el número directamente (ya es real)
- ✅ Si es `@lid` → llama a API de WAHA para obtener número real
- ✅ Valida que el número sea real (empieza con código de país)
- ✅ Si no se resuelve → retorna `null` (no crea conversación ficticia)

**Endpoints de WAHA intentados:**
1. `/api/sessions/{session}/contacts/{chatId}`
2. `/api/v1/sessions/{session}/contacts/{chatId}`
3. `/api/{session}/contacts/{chatId}`

### 2. Nueva Función: `isValidPhoneNumber()`

**Validación:**
- Verifica que el número empiece con código de país válido (52, 57, 54, etc.)
- Verifica que tenga entre 10 y 15 dígitos
- Previene guardar números inválidos

### 3. Webhook Actualizado

**Cambios en `handleMessageEvent()`:**
- ✅ Ahora usa `resolveRealPhoneNumber()` en lugar de `extractPhoneNumber()`
- ✅ Si no se resuelve el número → ignora el mensaje (no crea conversación)
- ✅ Logs mejorados para debugging

**Flujo actualizado:**
```typescript
// ANTES (incorrecto):
const fromNumber = extractPhoneNumber(chatId); // Trataba @lid como número

// DESPUÉS (correcto):
const fromNumber = await resolveRealPhoneNumber(chatId, sessionName, organizationId);
if (!fromNumber) {
  // No se pudo resolver → NO crear conversación
  return;
}
```

---

## 📋 MIGRACIÓN SQL

**Archivo:** `supabase/migrations/018_clean_fake_whatsapp_conversations.sql`

### Pasos para Limpiar Conversaciones Ficticias Existentes:

1. **PASO A: Verificar** (ejecutar primero)
   ```sql
   SELECT 
     wc.id,
     wc.customer_phone,
     wc.messages_count,
     LENGTH(wc.customer_phone) as largo
   FROM whatsapp_conversations wc
   WHERE wc.organization_id = 'TU_ORGANIZATION_ID'
     AND (LENGTH(wc.customer_phone) != 13 OR wc.customer_phone NOT LIKE '521%')
   ORDER BY wc.created_at DESC;
   ```

2. **PASO B: Eliminar mensajes** (solo después de verificar)
   ```sql
   DELETE FROM whatsapp_messages
   WHERE conversation_id IN (
     SELECT id FROM whatsapp_conversations
     WHERE organization_id = 'TU_ORGANIZATION_ID'
       AND (LENGTH(customer_phone) != 13 OR customer_phone NOT LIKE '521%')
   );
   ```

3. **PASO C: Eliminar conversaciones** (solo después de PASO B)
   ```sql
   DELETE FROM whatsapp_conversations
   WHERE organization_id = 'TU_ORGANIZATION_ID'
     AND (LENGTH(customer_phone) != 13 OR customer_phone NOT LIKE '521%');
   ```

4. **PASO D: Verificar resultado**
   ```sql
   SELECT 
     customer_phone,
     LENGTH(customer_phone) as largo,
     messages_count
   FROM whatsapp_conversations
   WHERE organization_id = 'TU_ORGANIZATION_ID'
   ORDER BY created_at DESC;
   ```

**⚠️ IMPORTANTE:**
- Reemplazar `'TU_ORGANIZATION_ID'` con el ID real
- Ejecutar PASO A primero para ver qué se eliminará
- Solo ejecutar PASO B y C si estás seguro

---

## 🔍 VARIABLES DE ENTORNO

El fix usa la función `getWahaConfig()` que busca configuración en este orden:

1. **Variables de entorno:**
   - `WAHA_API_URL`
   - `WAHA_API_KEY`

2. **Base de datos:**
   - `ai_agent_config.policies.waha_api_url`
   - `ai_agent_config.policies.waha_api_key`

**Verificar configuración:**
```bash
# Verificar variables de entorno
echo $WAHA_API_URL
echo $WAHA_API_KEY

# O verificar en Supabase
SELECT policies->>'waha_api_url', policies->>'waha_api_key'
FROM ai_agent_config
WHERE organization_id = 'TU_ORGANIZATION_ID';
```

---

## 🧪 TESTING

### 1. Enviar Mensaje desde WhatsApp

1. Envía un mensaje desde WhatsApp al número del taller
2. Verificar logs del webhook:

**Si es @c.us (número real):**
```
[WAHA Webhook] ✅ Número real directo (@c.us): 5214494533160
[WAHA Webhook] 📱 Número del remitente resuelto: 5214494533160
```

**Si es @lid (ID interno):**
```
[WAHA Webhook] 🔍 Resolviendo contacto @lid: 93832184119502@lid via WAHA API...
[WAHA Webhook] ✅ Contacto resuelto desde: /api/sessions/...
[WAHA Webhook] ✅ Resuelto: 93832184119502@lid → 5214494533160
[WAHA Webhook] 📱 Número del remitente resuelto: 5214494533160
```

**Si no se resuelve:**
```
[WAHA Webhook] ⚠️ Ignorando mensaje de contacto no resuelto: 93832184119502@lid
[WAHA Webhook] ⚠️ Esto previene crear conversaciones ficticias con IDs de WhatsApp
```

### 2. Verificar en Supabase

```sql
-- Ver conversaciones recientes
SELECT 
  id,
  customer_phone,
  LENGTH(customer_phone) as largo,
  customer_name,
  messages_count,
  created_at
FROM whatsapp_conversations
WHERE organization_id = 'TU_ORGANIZATION_ID'
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado esperado:**
- ✅ Todos los números tienen formato `521XXXXXXXXX` (13 dígitos)
- ✅ No hay números con formato `93832184119502` (IDs de WhatsApp)
- ✅ No hay números con longitud incorrecta

### 3. Verificar Mensajes

```sql
-- Ver mensajes recientes
SELECT 
  wm.id,
  wm.from_number,
  wm.body,
  wc.customer_phone,
  wm.created_at
FROM whatsapp_messages wm
JOIN whatsapp_conversations wc ON wm.conversation_id = wc.id
WHERE wc.organization_id = 'TU_ORGANIZATION_ID'
ORDER BY wm.created_at DESC
LIMIT 10;
```

**Resultado esperado:**
- ✅ `from_number` coincide con `customer_phone` de la conversación
- ✅ Todos los números tienen formato válido

---

## ✅ CRITERIOS DE ÉXITO

- [x] Función `resolveRealPhoneNumber()` implementada
- [x] Función `isValidPhoneNumber()` implementada
- [x] Webhook actualizado para usar `resolveRealPhoneNumber()`
- [x] Si no se resuelve @lid, el mensaje se ignora
- [x] Migración SQL creada para limpiar conversaciones ficticias
- [x] Logs mejorados para debugging
- [ ] Conversaciones ficticias existentes eliminadas (ejecutar migración)
- [ ] Nuevos mensajes van a conversaciones correctas (testing)

---

## 📝 NOTAS IMPORTANTES

1. **No modificar:**
   - ❌ NO modificar lógica de envío de mensajes (outbound)
   - ❌ NO cambiar `normalizePhoneNumber()` existente
   - ❌ NO tocar configuración del AI Agent

2. **Compatibilidad:**
   - ✅ Funciona con WAHA Plus y WAHA estándar
   - ✅ Intenta múltiples endpoints de WAHA
   - ✅ Maneja errores gracefully (no bloquea el webhook)

3. **Performance:**
   - ⚠️ Resolver @lid requiere llamada a API de WAHA (agrega ~500ms)
   - ✅ Timeout de 5 segundos para evitar bloqueos
   - ✅ Si falla, ignora el mensaje (no bloquea otros mensajes)

---

## 🚀 PRÓXIMOS PASOS

1. **Desplegar cambios:**
   ```bash
   git add src/app/api/webhooks/whatsapp/route.ts
   git commit -m "fix(whatsapp): resolver @lid a números reales, prevenir conversaciones ficticias"
   git push origin main
   ```

2. **Ejecutar migración SQL:**
   - Abrir Supabase SQL Editor
   - Ejecutar PASO A para verificar
   - Si estás seguro, ejecutar PASO B y C
   - Ejecutar PASO D para verificar

3. **Testing:**
   - Enviar mensaje desde WhatsApp
   - Verificar logs del webhook
   - Verificar en Supabase que no se crearon conversaciones ficticias

4. **Monitoreo:**
   - Revisar logs periódicamente
   - Verificar que no aparezcan conversaciones con números inválidos

---

## 📚 REFERENCIAS

- **Archivo modificado:** `src/app/api/webhooks/whatsapp/route.ts`
- **Migración SQL:** `supabase/migrations/018_clean_fake_whatsapp_conversations.sql`
- **Función WAHA config:** `src/lib/waha-sessions.ts` → `getWahaConfig()`
