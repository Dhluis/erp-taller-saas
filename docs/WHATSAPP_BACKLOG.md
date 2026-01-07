# 📋 Backlog de Tareas - WhatsApp Module

**Última actualización:** 2025-01-06  
**Fuente:** Análisis completo en `docs/ANALISIS_CONVERSACIONES_WHATSAPP.md`

---

## 🔴 ALTA PRIORIDAD (1-2 horas)

### 1. Limpiar "Cliente de Prueba" de BD (30 min)
**Problema:** Datos de testing en producción  
**Archivo:** `docs/CLEANUP_WHATSAPP_TEST_DATA.sql`  
**Pasos:**
1. Ejecutar queries de identificación
2. Reemplazar `'tu-org-id'` con organization_id real
3. Eliminar mensajes primero (foreign key)
4. Eliminar conversaciones
5. Verificar limpieza

**Comando rápido:**
```sql
-- 1. Eliminar mensajes
DELETE FROM whatsapp_messages 
WHERE conversation_id IN (
  SELECT id FROM whatsapp_conversations 
  WHERE customer_name = 'Cliente de Prueba' 
    AND organization_id = 'tu-org-id'
);

-- 2. Eliminar conversaciones
DELETE FROM whatsapp_conversations 
WHERE customer_name = 'Cliente de Prueba' 
  AND organization_id = 'tu-org-id';
```

---

### 2. Eliminar fallback a agentes mock (45 min)
**Problema:** Lista hardcoded de agentes cuando falla la carga  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 1182-1196  

**Cambios:**
```typescript
// ❌ ANTES (con fallback mock):
} catch (error) {
  console.error('Error cargando agentes:', error)
  setAvailableAgents([
    { id: '1', name: 'Juan Pérez' },
    { id: '2', name: 'María García' },
    // ...
  ])
}

// ✅ DESPUÉS (sin fallback):
} catch (error) {
  console.error('Error cargando agentes:', error)
  toast.error('No se pudieron cargar los agentes disponibles')
  setAvailableAgents([])
  // Deshabilitar botón de reasignación
  setCanReassign(false)
}
```

**Testing:**
- Simular error en `/api/employees`
- Verificar que NO muestra lista mock
- Verificar que botón "Reasignar" está deshabilitado

---

### 3. Implementar campo `unread` (1 hora)
**Problema:** Campo `unread` siempre es `false` (hardcoded)  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 240, 507  

**Pasos:**
1. **Calcular `unread` al cargar conversaciones:**
```typescript
// En línea 240, reemplazar:
unread: false, // ❌ Hardcoded

// Por:
unread: conv.unread || false, // ✅ Desde BD
```

2. **Marcar como leído al abrir conversación:**
```typescript
// Agregar en loadMessages() después de cargar mensajes:
if (selectedConversation?.unread) {
  await supabase
    .from('whatsapp_conversations')
    .update({ unread: false })
    .eq('id', conversationId)
    .eq('organization_id', organizationId)
}
```

3. **Actualizar `unread` al recibir nuevo mensaje:**
```typescript
// En suscripción realtime (línea 560):
if (payload.eventType === 'INSERT' && payload.new.from_me === false) {
  // Marcar conversación como no leída
  await supabase
    .from('whatsapp_conversations')
    .update({ unread: true })
    .eq('id', payload.new.conversation_id)
}
```

**Testing:**
- Enviar mensaje desde otro número
- Verificar que conversación aparece en "No Leídos"
- Abrir conversación
- Verificar que desaparece de "No Leídos"

---

### 4. Implementar `is_favorite` en BD (45 min)
**Problema:** Campo `isFavorite` siempre es `false` (hardcoded)  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 246, 1469-1484  

**Pasos:**
1. **Agregar columna en BD:**
```sql
ALTER TABLE whatsapp_conversations 
ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;

CREATE INDEX idx_whatsapp_conversations_is_favorite 
ON whatsapp_conversations(organization_id, is_favorite);
```

2. **Actualizar al hacer clic en estrella:**
```typescript
// Reemplazar función handleToggleFavorite (línea 1469):
const handleToggleFavorite = async () => {
  if (!selectedConversation) return
  
  const newFavoriteState = !selectedConversation.isFavorite
  
  const { error } = await supabase
    .from('whatsapp_conversations')
    .update({ is_favorite: newFavoriteState })
    .eq('id', selectedConversation.id)
    .eq('organization_id', organizationId)
  
  if (error) {
    toast.error('Error al actualizar favorito')
    return
  }
  
  // Actualizar estado local
  setSelectedConversation({
    ...selectedConversation,
    isFavorite: newFavoriteState
  })
  
  // Recargar conversaciones
  mutate()
  
  toast.success(newFavoriteState ? 'Agregado a favoritos' : 'Eliminado de favoritos')
}
```

3. **Cargar desde BD:**
```typescript
// En línea 246, reemplazar:
isFavorite: false, // ❌ Hardcoded

// Por:
isFavorite: conv.is_favorite || false, // ✅ Desde BD
```

**Testing:**
- Hacer clic en estrella
- Verificar que se guarda en BD
- Recargar página
- Verificar que favorito persiste
- Filtrar por "Favoritos"

---

## 🟡 MEDIA PRIORIDAD (2-4 horas)

### 5. Obtener país/idioma/moneda dinámicamente (1 hora)
**Problema:** Valores hardcoded ("México", "Español", "Peso Mexicano")  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 441-443, 2051-2060  

**Solución:**
```typescript
// Obtener desde configuración de organización:
const { data: orgConfig } = await supabase
  .from('organizations')
  .select('country, default_language, default_currency')
  .eq('id', organizationId)
  .single()

const country = orgConfig?.country || 'N/A'
const language = orgConfig?.default_language || 'N/A'
const currency = orgConfig?.default_currency || 'N/A'
```

---

### 6. Implementar reasignación completa con validación (1 hora)
**Problema:** Guarda en `metadata.assigned_agent` sin validar  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 933-963  

**Pasos:**
1. Agregar columna `assigned_to_user_id` en BD
2. Validar que agente existe antes de asignar
3. Actualizar UI para mostrar agente asignado
4. Agregar filtro por agente asignado

---

### 7. Implementar mensajes programados (1.5 horas)
**Problema:** Solo guarda en metadata, no envía automáticamente  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 826-879  

**Pasos:**
1. Crear tabla `scheduled_messages`
2. Implementar worker/cronjob para enviar mensajes
3. Mostrar lista de mensajes programados pendientes

---

### 8. Implementar respuestas con IA real (1.5 horas)
**Problema:** Solo simula respuesta con setTimeout  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 881-896  

**Pasos:**
1. Integrar con API de IA (OpenAI/Claude)
2. Usar contexto de conversación
3. Mostrar múltiples opciones de respuesta

---

### 9. Implementar envío de adjuntos (2 horas)
**Problema:** API retorna 501 para imágenes/archivos  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 1117-1129  
**API:** `src/app/api/whatsapp/send/route.ts`  

**Pasos:**
1. Implementar subida de archivos a Supabase Storage
2. Implementar envío de media en API `/api/whatsapp/send`
3. Mostrar preview de imágenes antes de enviar

---

## 🟢 BAJA PRIORIDAD (1-2 horas)

### 10. Configurar respuestas rápidas por organización (1 hora)
**Problema:** Array hardcoded de respuestas  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 601-611  

---

### 11. Implementar tabs de departamentos (1 hora)
**Problema:** Tabs sin funcionalidad  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 1250-1279  

---

### 12. Calcular contadores reales (45 min)
**Problema:** Números hardcoded ("32", "24")  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 1282-1287  

---

### 13. Mejorar obtención de foto de perfil (1 hora)
**Problema:** `profile_picture_url` puede estar desactualizado  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 1402-1426  

---

### 14. Optimizar búsqueda de cliente por teléfono (45 min)
**Problema:** Carga TODOS los clientes y filtra en frontend  
**Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Líneas:** 401-432  

**Solución:**
```typescript
// Crear endpoint específico:
GET /api/customers/by-phone?phone=+52XXXXXXXXXX
```

---

## 🚀 TAREAS RÁPIDAS (30 min total)

### Opción A: Limpieza rápida (30 min)
1. ✅ Guardar análisis en `docs/ANALISIS_CONVERSACIONES_WHATSAPP.md`
2. ✅ Actualizar `docs/EAGLES_ERP_DEVELOPER_SKILL.md`
3. ✅ Crear `docs/CLEANUP_WHATSAPP_TEST_DATA.sql`
4. 🔄 Ejecutar limpieza de "Cliente de Prueba"

---

## 📊 ESTIMACIONES TOTALES

| Prioridad | Tareas | Tiempo Estimado |
|-----------|--------|-----------------|
| 🔴 Alta | 4 | 3-4 horas |
| 🟡 Media | 5 | 7-9 horas |
| 🟢 Baja | 5 | 5-6 horas |
| **TOTAL** | **14** | **15-19 horas** |

---

## 🎯 PRÓXIMA SESIÓN RECOMENDADA (2 horas)

1. **Optimizar WhatsApp QR** (1 hora) - Pendiente de sesión anterior
   - Reducir polling de 60s a 3-5s después de escanear QR
   - Agregar estado "QR escaneado, conectando..."
   - Timeout de 30s para reintentar

2. **Eliminar fallback a agentes mock** (45 min)
   - Quitar lista hardcoded
   - Mostrar error si no carga agentes
   - Deshabilitar reasignación sin agentes

3. **Limpiar "Cliente de Prueba"** (15 min)
   - Ejecutar SQL de limpieza

---

**Última actualización:** 2025-01-06  
**Mantenido por:** Eagles ERP Development Team

