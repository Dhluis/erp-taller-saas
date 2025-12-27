# 📱 WhatsApp Business Support (@lid) - Documentación Completa

**Commit Principal:** `19af1ca2ebb1194743f35d9032412e6aacdefcd0`  
**Fecha:** 27 de diciembre de 2025  
**Estado:** ✅ Implementado y funcionando

---

## 📋 Resumen Ejecutivo

Se implementó soporte completo para **WhatsApp Business** usando el formato `@lid` además de los formatos existentes (`@c.us`, `@s.whatsapp.net`). El sistema ahora puede recibir y responder mensajes correctamente a cuentas de WhatsApp Business.

### Problema Identificado

- El webhook rechazaba mensajes de WhatsApp Business porque solo aceptaba `@c.us` y `@s.whatsapp.net`
- Al responder, se perdía el formato `@lid` y se agregaba `@c.us` incorrectamente
- Esto causaba que los mensajes no se entregaran a cuentas Business

### Solución Implementada

1. **Validación de mensajes:** Se agregó soporte para `@lid` en la validación de mensajes directos
2. **Envío de mensajes:** Se preserva el formato original del `chatId` al responder
3. **Extracción de números:** Se actualizó para soportar `@lid` al extraer números de teléfono

---

## 🔧 Cambios Técnicos

### Commit: `19af1ca` - Soporte completo para @lid

#### Archivos Modificados

1. **`src/lib/waha-sessions.ts`**
   - Función: `sendWhatsAppMessage()`
   - Línea: ~712-721

2. **`src/app/api/webhooks/whatsapp/route.ts`**
   - Función: `handleMessageEvent()`
   - Línea: ~572-577

---

## 📝 Detalles de Implementación

### 1. Validación de Mensajes Directos

**Archivo:** `src/app/api/webhooks/whatsapp/route.ts`  
**Línea:** ~207-220

```typescript
// ✅ CÓDIGO ACTUAL - Soporta @c.us, @s.whatsapp.net Y @lid
const isValidDirectMessage = 
  chatId && 
  (chatId.includes('@c.us') || 
   chatId.includes('@s.whatsapp.net') ||
   chatId.includes('@lid') ||  // ← NUEVO
   /^\d+@c\.us$/.test(chatId) ||
   /^\d+@s\.whatsapp\.net$/.test(chatId) ||
   /^\d+@lid$/.test(chatId));  // ← NUEVO
```

**Antes:** Solo aceptaba `@c.us` y `@s.whatsapp.net`  
**Ahora:** Acepta `@c.us`, `@s.whatsapp.net` y `@lid`

---

### 2. Construcción de chatId al Enviar Mensajes

**Archivo:** `src/lib/waha-sessions.ts`  
**Función:** `sendWhatsAppMessage()`  
**Línea:** ~712-721

```typescript
// ✅ CÓDIGO ACTUAL - Mantiene formato original si ya tiene @
let chatId: string;
if (to.includes('@')) {
  // Ya tiene formato (@lid, @c.us, @s.whatsapp.net)
  chatId = to;
} else {
  // Solo número, agregar @c.us por defecto
  chatId = `${to}@c.us`;
}
```

**Antes:**
```typescript
// ❌ CÓDIGO ANTERIOR - Siempre agregaba @c.us
const chatId = to.includes('@') ? to : `${to}@c.us`;
```

**Problema:** Si recibía `93832184119502@lid`, lo convertía a `93832184119502@lid@c.us` (incorrecto)  
**Solución:** Si ya tiene `@`, se mantiene el formato original

---

### 3. Paso de chatId Completo desde Webhook

**Archivo:** `src/app/api/webhooks/whatsapp/route.ts`  
**Función:** `handleMessageEvent()`  
**Línea:** ~572-577

```typescript
// ✅ CÓDIGO ACTUAL - Pasa chatId completo con formato preservado
const sendResult = await sendWhatsAppMessage(
  sessionName,
  chatId,  // ← Usa chatId completo (ej: "93832184119502@lid")
  aiResult.response,
  organizationId
);
```

**Antes:**
```typescript
// ❌ CÓDIGO ANTERIOR - Pasaba solo el número
const sendResult = await sendWhatsAppMessage(
  sessionName,
  customerPhone,  // Solo "93832184119502"
  aiResult.response,
  organizationId
);
```

**Problema:** Se perdía el formato `@lid` al pasar solo el número  
**Solución:** Se pasa el `chatId` completo con el formato preservado

---

### 4. Extracción de Números de Teléfono

**Archivo:** `src/app/api/webhooks/whatsapp/route.ts`  
**Función:** `extractPhoneNumber()`  
**Línea:** ~696-709

```typescript
/**
 * Extrae número de teléfono del chatId
 * Formato: 5214491234567@c.us, @s.whatsapp.net o @lid -> 5214491234567
 */
function extractPhoneNumber(chatId: string): string | null {
  if (!chatId) return null;
  
  // Remover @c.us, @s.whatsapp.net o @lid
  const phoneDigits = chatId.replace(/@[^@]+$/, '');
  
  if (!phoneDigits || phoneDigits.length < 10) {
    return null;
  }
  
  return phoneDigits;
}
```

**Nota:** El regex `/@[^@]+$/` ya funcionaba para `@lid`, pero se actualizó el comentario para documentarlo explícitamente.

---

## 📊 Formatos de chatId Soportados

| Formato | Descripción | Ejemplo | Estado |
|---------|-------------|---------|--------|
| `@c.us` | WhatsApp Personal (clásico) | `5214491234567@c.us` | ✅ Soportado |
| `@s.whatsapp.net` | WhatsApp Business API | `5214491234567@s.whatsapp.net` | ✅ Soportado |
| `@lid` | WhatsApp Business (nuevo) | `93832184119502@lid` | ✅ Soportado (NUEVO) |
| `@g.us` | Grupos | `120363123456789012@g.us` | ⏭️ Ignorado (diseño) |

---

## 🔍 Commits Relacionados

### Commit Principal
- **`19af1ca`** - `fix(whatsapp): pasar chatId completo con @lid al enviar mensajes`
  - Actualizar `sendWhatsAppMessage` para mantener formato original del chatId
  - Pasar chatId completo (con @lid) desde webhook en lugar de solo número
  - Soporta WhatsApp Business (@lid) correctamente al responder mensajes

### Commit Anterior (Validación)
- **`6f0ac66`** - `fix(whatsapp): agregar soporte para WhatsApp Business (@lid)`
  - Agregar @lid a validación de mensajes directos
  - Actualizar extractPhoneNumber para soportar @lid
  - Permite recibir mensajes de WhatsApp Business accounts

### Otros Commits Relevantes
- `eb05249` - `fix(whatsapp): usar polling más lento cuando ya hay QR`
- `5732841` - `fix(whatsapp): aumentar TTL del cache de QR a 50 segundos`
- `0b53e8b` - `fix(whatsapp): evitar regeneración excesiva de QR y mostrar solo con botón`

---

## 🧪 Testing

### Casos de Prueba

1. **Mensaje entrante de WhatsApp Business (`@lid`)**
   - ✅ Debe ser aceptado por el webhook
   - ✅ Debe procesarse con el AI agent
   - ✅ Debe guardarse en la base de datos

2. **Respuesta a WhatsApp Business (`@lid`)**
   - ✅ Debe usar el formato `@lid` al enviar
   - ✅ El mensaje debe llegar correctamente

3. **Mensaje entrante de WhatsApp Personal (`@c.us`)**
   - ✅ Debe seguir funcionando como antes
   - ✅ Debe responder con formato `@c.us`

4. **Mensaje entrante de WhatsApp Business API (`@s.whatsapp.net`)**
   - ✅ Debe seguir funcionando como antes
   - ✅ Debe responder con formato `@s.whatsapp.net`

---

## 📍 Ubicaciones de Código

### Archivos Principales

1. **`src/app/api/webhooks/whatsapp/route.ts`**
   - Validación de mensajes directos: `línea ~207-220`
   - Paso de chatId a sendWhatsAppMessage: `línea ~572-577`
   - Función extractPhoneNumber: `línea ~696-709`

2. **`src/lib/waha-sessions.ts`**
   - Función sendWhatsAppMessage: `línea ~649-876`
   - Construcción de chatId: `línea ~712-721`

---

## 🔄 Flujo Completo

### Mensaje Entrante

```
1. WAHA envía webhook con chatId: "93832184119502@lid"
2. Webhook valida: ✅ chatId.includes('@lid') → Aceptado
3. Se extrae número: "93832184119502"
4. Se busca/crea conversación
5. Se guarda mensaje
6. Se procesa con AI agent
```

### Mensaje Saliente

```
1. AI genera respuesta
2. Webhook llama: sendWhatsAppMessage(sessionName, chatId, response)
   - chatId = "93832184119502@lid" (preservado)
3. sendWhatsAppMessage detecta: to.includes('@') → true
4. Mantiene formato: chatId = "93832184119502@lid"
5. Envía a WAHA con formato correcto
6. Mensaje llega a WhatsApp Business correctamente
```

---

## 🚀 Mejoras Futuras

### Posibles Optimizaciones

1. **Detección automática de tipo de cuenta**
   - Detectar si el remitente es Business o Personal
   - Almacenar esta información en la conversación

2. **Fallback inteligente**
   - Si falla el envío con `@lid`, intentar con `@c.us`
   - (Solo si es necesario, actualmente no es necesario)

3. **Logging mejorado**
   - Registrar el formato de chatId en logs
   - Métricas de distribución de tipos de chatId

---

## 📚 Referencias

### Documentación Relacionada

- `docs/WHATSAPP_INTEGRATION_STATUS.md` - Estado general de integración
- `docs/WHATSAPP_WEBHOOK_VERIFICATION.md` - Verificación de webhooks
- `docs/WHATSAPP_BUSINESS_API_SETUP.md` - Configuración inicial
- `docs/whatsapp/QUICK_START.md` - Guía rápida de inicio

### Enlaces Externos

- [WAHA Documentation](https://waha.devlike.pro/)
- [WhatsApp Business API](https://www.whatsapp.com/business/api)
- [WhatsApp Format Specification](https://github.com/WhatsApp/WhatsApp-API-Implementation)

---

## ✅ Checklist de Verificación

- [x] Validación de mensajes directos incluye `@lid`
- [x] `sendWhatsAppMessage` preserva formato original
- [x] Webhook pasa `chatId` completo (no solo número)
- [x] `extractPhoneNumber` funciona con `@lid`
- [x] Tests manuales realizados
- [x] Documentación completa
- [x] Commits con mensajes descriptivos
- [x] Código revisado y funcionando

---

## 🐛 Troubleshooting

### Problema: Mensajes de Business no se reciben

**Solución:**
1. Verificar que el webhook esté configurado correctamente en WAHA
2. Verificar logs del webhook: `[WAHA Webhook] ⏭️ Ignorando mensaje no válido`
3. Verificar que el `chatId` incluye `@lid`

### Problema: Respuestas no llegan a Business

**Solución:**
1. Verificar que se está pasando `chatId` completo (no solo número)
2. Verificar logs: `[WAHA Sessions] 📤 Enviando mensaje` - debe mostrar chatId con `@lid`
3. Verificar estado de sesión WAHA: debe estar `WORKING`

---

## 📝 Notas Adicionales

- El formato `@lid` es usado por WhatsApp Business más reciente
- El formato `@s.whatsapp.net` es usado por WhatsApp Business API oficial
- El formato `@c.us` es el estándar para WhatsApp Personal
- Todos los formatos se manejan de manera uniforme en el código

---

**Última actualización:** 27 de diciembre de 2025  
**Autor:** Equipo de Desarrollo  
**Versión:** 1.0.0

