# 🔍 DIAGNÓSTICO: Conversaciones WhatsApp Duplicadas

## 📋 CÓDIGO ACTUAL - ANÁLISIS COMPLETO

### 1. WEBHOOK COMPLETO
**Archivo:** `src/app/api/webhooks/whatsapp/route.ts`

#### Función `extractPhoneNumber()` (líneas 720-739):
```typescript
function extractPhoneNumber(chatId: string): string | null {
  if (!chatId) return null;
  
  // Remover @c.us, @s.whatsapp.net o @lid
  const phoneDigits = chatId.replace(/@[^@]+$/, '');
  
  if (!phoneDigits || phoneDigits.length < 10) {
    return null;
  }
  
  // ✅ NORMALIZAR número antes de retornar para evitar duplicados
  // Esto asegura que números mexicanos siempre tengan formato: 52 + 1 + 10 dígitos = 13 dígitos
  const normalized = normalizePhoneNumber(phoneDigits);
  
  if (!normalized || normalized.length < 10) {
    return null;
  }
  
  return normalized;
}
```

**🔍 PUNTO CRÍTICO:**
- Extrae número del `chatId` (ej: `5214494533160@lid` → `5214494533160`)
- Normaliza usando `normalizePhoneNumber()`
- **PROBLEMA POTENCIAL:** Si `normalizePhoneNumber()` retorna diferentes formatos, se crearán conversaciones duplicadas

#### Función `getOrCreateConversation()` (líneas 744-869):
```typescript
async function getOrCreateConversation(
  supabase: any,
  organizationId: string,
  customerPhone: string,  // ⚠️ Este ya viene normalizado de extractPhoneNumber()
  sessionName: string
): Promise<{ conversationId: string; isNewConversation: boolean }> {
  
  // Buscar conversación existente
  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('id, is_bot_active, customer_name')
    .eq('organization_id', organizationId)
    .eq('customer_phone', customerPhone)  // ⚠️ Búsqueda exacta por customer_phone
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    console.log('[WAHA Webhook] ✅ Conversación existente encontrada:', existing.id);
    return { conversationId: existing.id, isNewConversation: false };
  }

  // Si no existe, crear nueva conversación
  const { data: newConv, error } = await supabase
    .from('whatsapp_conversations')
    .insert({
      organization_id: organizationId,
      customer_id: customerId,
      customer_phone: customerPhone,  // ⚠️ Se guarda el número normalizado
      customer_name: customerName,
      status: 'active',
      // ...
    })
    .select('id')
    .single();
}
```

**🔍 PUNTO CRÍTICO:**
- Busca por `customer_phone` con `.eq()` (búsqueda exacta)
- Si el número no coincide EXACTAMENTE, crea nueva conversación
- **PROBLEMA:** Si `normalizePhoneNumber()` retorna formatos inconsistentes, no encontrará la conversación existente

### 2. FUNCIÓN DE NORMALIZACIÓN
**Archivo:** `src/lib/utils/phone-formatter.ts`

#### Función `normalizePhoneNumber()` (líneas 89-137):
```typescript
export function normalizePhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return '';

  // 1. Extraer solo dígitos
  const digitsOnly = phoneNumber.replace(/\D/g, '');

  // 2. Si está vacío o muy corto, retornar vacío
  if (!digitsOnly || digitsOnly.length < 10) {
    console.warn('[normalizePhoneNumber] Número muy corto o inválido:', phoneNumber);
    return digitsOnly;
  }

  // 3. Detectar si es número mexicano (empieza con 52)
  if (digitsOnly.startsWith('52')) {
    // Validar que tenga longitud razonable para México (12 o 13 dígitos)
    if (digitsOnly.length < 12 || digitsOnly.length > 13) {
      console.warn('[normalizePhoneNumber] Número mexicano con longitud inválida:', digitsOnly);
      return digitsOnly; // ⚠️ RETORNA SIN NORMALIZAR
    }

    const withoutCountryCode = digitsOnly.substring(2); // Remover "52"

    // Si tiene 13 dígitos y el tercer dígito es "1", ya está correcto
    if (digitsOnly.length === 13 && digitsOnly.charAt(2) === '1') {
      return digitsOnly; // Ya está correcto: 5214494533160
    }

    // Si tiene 12 dígitos (52 + 10), agregar "1" después del 52
    if (digitsOnly.length === 12 && withoutCountryCode.length === 10) {
      return `521${withoutCountryCode}`; // Insertar "1": 52 + 1 + 4494533160
    }

    // Si tiene 13 dígitos pero NO tiene "1" en posición correcta
    if (digitsOnly.length === 13 && digitsOnly.charAt(2) !== '1') {
      console.warn('[normalizePhoneNumber] Número mexicano de 13 dígitos pero sin "1" en posición 3:', digitsOnly);
      // Intentar arreglarlo quitando primer dígito después del 52 y agregando "1"
      return `521${withoutCountryCode.substring(1)}`; // 52 + 1 + últimos 10
    }
  }

  // 4. Para otros países o formatos no reconocidos:
  return digitsOnly; // ⚠️ RETORNA SIN NORMALIZAR
}
```

**🔍 PROBLEMAS IDENTIFICADOS:**

1. **Caso 1: Número de 12 dígitos sin "1"**
   - Input: `524494533160` (12 dígitos)
   - Output: `5214494533160` ✅ CORRECTO

2. **Caso 2: Número de 13 dígitos con "1"**
   - Input: `5214494533160` (13 dígitos)
   - Output: `5214494533160` ✅ CORRECTO

3. **Caso 3: Número de 13 dígitos SIN "1" en posición 3**
   - Input: `5244945331600` (13 dígitos, sin "1")
   - Output: `5214494533160` ✅ CORRECTO (intenta arreglarlo)

4. **Caso 4: Número fuera de rango (11 dígitos o 14+ dígitos)**
   - Input: `52449453316` (11 dígitos) o `52449453316000` (14 dígitos)
   - Output: `52449453316` o `52449453316000` ❌ **NO SE NORMALIZA**
   - **PROBLEMA:** Retorna número inválido sin normalizar

5. **Caso 5: Número que NO empieza con 52**
   - Input: `4494533160` (10 dígitos sin código país)
   - Output: `4494533160` ❌ **NO SE NORMALIZA A 5214494533160**
   - **PROBLEMA:** Si WAHA envía número sin código país, no se normaliza

### 3. FLUJO COMPLETO DEL WEBHOOK

```typescript
// Línea 201: Extraer chatId
const chatId = message.chatId || messageFrom || messageTo;
// Ejemplo: "5214494533160@lid" o "4494533160@c.us"

// Línea 243: Extraer número
const fromNumber = extractPhoneNumber(chatId);
// extractPhoneNumber() llama a normalizePhoneNumber()

// Línea 284: Usar número normalizado
const customerPhone = fromNumber;

// Línea 291: Buscar/crear conversación
const { conversationId } = await getOrCreateConversation(
  supabase,
  organizationId,
  customerPhone,  // ⚠️ Número ya normalizado
  sessionName
);
```

**🔍 PROBLEMA POTENCIAL:**
- Si `chatId` viene como `4494533160@c.us` (sin código país)
- `extractPhoneNumber()` retorna `4494533160`
- `normalizePhoneNumber('4494533160')` retorna `4494533160` (sin normalizar)
- Búsqueda en BD: `.eq('customer_phone', '4494533160')`
- Si en BD está guardado como `5214494533160`, NO LO ENCUENTRA
- **RESULTADO:** Crea nueva conversación duplicada

---

## 📊 QUERIES SQL PARA DIAGNÓSTICO

Ejecuta estas queries en Supabase SQL Editor para ver los datos reales:

### Query A: Todas las conversaciones con sus números
```sql
SELECT 
  id,
  customer_phone,
  customer_name,
  created_at,
  LENGTH(customer_phone) as largo_numero,
  status
FROM whatsapp_conversations
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
ORDER BY created_at DESC
LIMIT 30;
```

### Query B: Números únicos vs duplicados
```sql
SELECT 
  customer_phone,
  COUNT(*) as cantidad_conversaciones,
  MIN(created_at) as primera,
  MAX(created_at) as ultima,
  LENGTH(customer_phone) as largo_numero,
  STRING_AGG(id::text, ', ') as ids_conversaciones
FROM whatsapp_conversations
WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
GROUP BY customer_phone
ORDER BY cantidad_conversaciones DESC;
```

### Query C: Columnas exactas de la tabla
```sql
SELECT 
  column_name, 
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'whatsapp_conversations'
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Query D: Ejemplo de mensajes recientes con sus conversaciones
```sql
SELECT 
  wm.id as message_id,
  wm.from_number,
  wm.to_number,
  wm.body,
  wm.sent_at,
  wc.customer_phone as conv_phone,
  wc.id as conversation_id,
  LENGTH(wm.from_number) as largo_from,
  LENGTH(wc.customer_phone) as largo_conv_phone
FROM whatsapp_messages wm
JOIN whatsapp_conversations wc ON wm.conversation_id = wc.id
WHERE wc.organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
ORDER BY wm.sent_at DESC
LIMIT 20;
```

### Query E: Detectar números que son el mismo pero con formato diferente
```sql
-- Encontrar números que son el mismo cliente pero con formato diferente
WITH normalized_phones AS (
  SELECT 
    customer_phone,
    -- Extraer últimos 10 dígitos (número local sin código país)
    RIGHT(customer_phone, 10) as last_10_digits,
    id,
    created_at
  FROM whatsapp_conversations
  WHERE organization_id = 'b3962fe4-d238-42bc-9455-4ed84a38c6b4'
)
SELECT 
  last_10_digits,
  COUNT(DISTINCT customer_phone) as formatos_diferentes,
  COUNT(*) as total_conversaciones,
  STRING_AGG(DISTINCT customer_phone, ', ') as numeros_encontrados,
  STRING_AGG(id::text, ', ') as ids_conversaciones
FROM normalized_phones
GROUP BY last_10_digits
HAVING COUNT(DISTINCT customer_phone) > 1
ORDER BY formatos_diferentes DESC;
```

---

## 🐛 HIPÓTESIS DEL PROBLEMA

### Hipótesis 1: Normalización inconsistente
**Problema:** `normalizePhoneNumber()` retorna diferentes formatos para el mismo número real.

**Ejemplo:**
- Mensaje 1: `chatId = "4494533160@c.us"` → `normalizePhoneNumber("4494533160")` → `"4494533160"` (sin normalizar)
- Mensaje 2: `chatId = "5214494533160@lid"` → `normalizePhoneNumber("5214494533160")` → `"5214494533160"` (normalizado)

**Resultado:** 
- BD tiene: `customer_phone = "5214494533160"`
- Búsqueda: `.eq('customer_phone', '4494533160')` → NO ENCUENTRA
- Crea nueva conversación con `customer_phone = "4494533160"`

### Hipótesis 2: Números fuera de rango no se normalizan
**Problema:** Números con 11 dígitos o 14+ dígitos no se normalizan.

**Ejemplo:**
- `normalizePhoneNumber("52449453316")` → retorna `"52449453316"` (11 dígitos, inválido)
- `normalizePhoneNumber("52449453316000")` → retorna `"52449453316000"` (14 dígitos, inválido)

### Hipótesis 3: Números sin código país no se normalizan
**Problema:** Si WAHA envía número sin código país (10 dígitos), no se agrega `521`.

**Ejemplo:**
- Input: `"4494533160"` (10 dígitos, sin código país)
- Output: `"4494533160"` (no se normaliza a `"5214494533160"`)

---

## ✅ PRÓXIMOS PASOS

1. **Ejecutar las queries SQL** y compartir resultados
2. **Revisar logs del webhook** para ver qué números se están recibiendo
3. **Verificar formato de `chatId`** que envía WAHA
4. **Corregir `normalizePhoneNumber()`** para manejar todos los casos

---

## 📝 NOTAS IMPORTANTES

- El campo en BD es `customer_phone` (no `phone_number`)
- La búsqueda usa `.eq('customer_phone', customerPhone)` (búsqueda exacta)
- Si los números no coinciden EXACTAMENTE, se crea nueva conversación
- La normalización DEBE ser consistente para evitar duplicados
