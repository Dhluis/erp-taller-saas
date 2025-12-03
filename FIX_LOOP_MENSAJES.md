# 🐛 FIX: Loop de mensajes (auto-respuesta)

## ❌ Problema identificado:

**El AI Agent estaba respondiendo a tu mismo número**, creando un loop infinito.

### Causa raíz:
WAHA no estaba marcando correctamente `fromMe: true` en los mensajes propios, por lo que el webhook los procesaba como mensajes de clientes.

---

## ✅ Solución implementada:

### 1. Mejorado filtro `fromMe`
**Archivo**: `src/app/api/webhooks/whatsapp/route.ts`

Ahora verifica `fromMe` en múltiples ubicaciones:

```typescript
const isFromMe = 
  message.fromMe === true || 
  message.fromMe === 'true' ||
  message.fromMe === 1 ||
  message.key?.fromMe === true ||        // WAHA puede ponerlo aquí
  message.key?.fromMe === 'true' ||
  message._data?.key?.fromMe === true;   // O aquí
```

### 2. Verificación de número propio (ANTI-LOOP)
**Nueva validación crítica**:

```typescript
// Obtener el número de teléfono de la sesión
const sessionStatus = await getSessionStatus(sessionName, organizationId);
const ownPhone = sessionStatus?.me?.id?.split('@')[0];

// Si el remitente es el mismo número que la sesión, IGNORAR
if (ownPhone && fromNumber && (
  fromNumber === ownPhone ||
  fromNumber.includes(ownPhone) ||
  ownPhone.includes(fromNumber)
)) {
  console.log('[WAHA Webhook] ⏭️ Ignorando mensaje loop (mismo número que la sesión)');
  return;
}
```

**Esto previene que:**
- ✅ El AI responda a sus propios mensajes
- ✅ Se creen loops infinitos
- ✅ Se procesen mensajes que enviaste tú mismo

### 3. Logs mejorados para diagnosticar

```typescript
console.log('[WAHA Webhook] 📦 Body completo:', JSON.stringify(body).substring(0, 500));
console.log('[WAHA Webhook] 📋 Mensaje extraído:', {
  hasMessage: !!message,
  sessionName,
  fromMe: message?.fromMe,
  from: message?.from,
  body: message?.body?.substring(0, 50)
});
console.log('[WAHA Webhook] 📱 Número del remitente:', fromNumber);
console.log('[WAHA Webhook] 📱 Número de la sesión:', ownPhone);
```

---

## 🧪 Para probar el fix:

### 1. Deploy los cambios:
```bash
git add .
git commit -m "fix: prevenir loop de mensajes en WhatsApp webhook"
git push
```

### 2. Probar conversación:
1. Envía un mensaje a tu número de WhatsApp desde OTRO número
2. ✅ El AI debería responder al otro número
3. ✅ NO debería responderte a ti mismo
4. ✅ NO debería crear un loop

### 3. Monitorear logs:
Busca en Vercel logs:

```
[WAHA Webhook] 📨 Procesando mensaje...
[WAHA Webhook] 📋 Mensaje extraído: { fromMe: false, from: "521234567890", ... }
[WAHA Webhook] ✅ Mensaje es entrante, procesando...
[WAHA Webhook] 📱 Número del remitente: 521234567890
[WAHA Webhook] 📱 Número de la sesión: 5214491698635
[WAHA Webhook] ✅ Procesando mensaje de cliente diferente
```

**Si el remitente es TU número:**
```
[WAHA Webhook] 📱 Número del remitente: 5214491698635
[WAHA Webhook] 📱 Número de la sesión: 5214491698635
[WAHA Webhook] ⏭️ Ignorando mensaje loop (mismo número que la sesión)
```

---

## 🎯 Comportamiento esperado:

### ✅ CORRECTO:
```
Cliente (521-123-4567) → Tu WhatsApp
  ↓
Webhook recibe mensaje
  ↓
AI procesa: fromMe=false, número diferente ✅
  ↓
AI responde a 521-123-4567 ✅
```

### ❌ ANTES (loop):
```
Tú (521-449-1698) → Tu WhatsApp
  ↓
Webhook recibe mensaje
  ↓
AI procesa: fromMe=false ❌ (debería ser true)
  ↓
AI te responde a ti mismo ❌
  ↓
Webhook recibe TU respuesta
  ↓
AI procesa de nuevo ❌
  ↓
Loop infinito ❌❌❌
```

### ✅ DESPUÉS (con fix):
```
Tú (521-449-1698) → Tu WhatsApp
  ↓
Webhook recibe mensaje
  ↓
Verifica: fromMe O mismo número ✅
  ↓
Ignora mensaje ✅
  ↓
No hay respuesta ✅
```

---

## 📊 Checklist:

- [x] Mejorado filtro `fromMe` (múltiples ubicaciones)
- [x] Agregada verificación de número propio
- [x] Logs detallados para diagnóstico
- [ ] Deploy a Vercel
- [ ] Probar con mensaje desde OTRO número
- [ ] Verificar que NO responde a ti mismo
- [ ] Confirmar que el loop está eliminado

---

## 🎉 Resultado:

Después de este fix:
- ✅ El AI Agent solo responderá a mensajes de OTROS números
- ✅ No habrá loops infinitos
- ✅ Tus propios mensajes serán ignorados correctamente
- ✅ La integración funcionará como debe

---

**Haz deploy de los cambios y prueba enviando un mensaje desde otro número. El loop debería estar completamente eliminado.** 🚀

