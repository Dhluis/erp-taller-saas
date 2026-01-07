# 📊 ANÁLISIS COMPLETO: Página de Conversaciones de WhatsApp

**Archivo analizado:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`  
**Fecha:** 2025-01-XX  
**Objetivo:** Identificar elementos funcionales, placeholders y funcionalidades parciales

---

## 📋 RESUMEN EJECUTIVO

| Categoría | Funcional | Parcial | Placeholder/Mock |
|-----------|-----------|---------|------------------|
| **Alta Prioridad** | 8 | 3 | 2 |
| **Media Prioridad** | 4 | 5 | 3 |
| **Baja Prioridad** | 2 | 4 | 6 |
| **TOTAL** | **14** | **12** | **11** |

---

## ✅ FUNCIONALIDADES COMPLETAMENTE FUNCIONALES

### ✅ FUNCIONAL: Lista de conversaciones
- **Descripción:** Muestra conversaciones reales desde BD con paginación
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 150-154, 212-248
- **Query:** `SELECT * FROM whatsapp_conversations WHERE organization_id = X`
- **API:** `GET /api/whatsapp/conversations`
- **Hook:** `useWhatsAppConversations`
- **Estado:** Completamente funcional
- **Notas:** 
  - Usa paginación real (20 por página)
  - Filtra por organización automáticamente
  - Ordena por `last_message_at` descendente

### ✅ FUNCIONAL: Carga de mensajes
- **Descripción:** Carga mensajes reales de una conversación desde BD
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 280-470
- **API:** `GET /api/whatsapp/conversations/[id]/messages`
- **Query:** `SELECT * FROM whatsapp_messages WHERE conversation_id = X`
- **Estado:** Completamente funcional
- **Notas:**
  - Limite de 100 mensajes por carga
  - Maneja errores 404 y 403 correctamente
  - Formatea timestamps correctamente

### ✅ FUNCIONAL: Envío de mensajes
- **Descripción:** Envía mensajes de texto reales a través de WAHA
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 648-824
- **API:** `POST /api/whatsapp/send`
- **Estado:** Completamente funcional
- **Notas:**
  - Valida conversación y organización
  - Guarda mensaje en BD después de enviar
  - Actualiza `last_message` y `last_message_at` en conversación
  - Muestra loading state durante envío

### ✅ FUNCIONAL: Suscripción realtime de mensajes
- **Descripción:** Recibe nuevos mensajes en tiempo real usando Supabase Realtime
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 514-591
- **Estado:** Completamente funcional
- **Notas:**
  - Suscripción a `whatsapp_messages` y `whatsapp_conversations`
  - Filtra por `organization_id`
  - Recarga automáticamente cuando hay nuevos mensajes
  - Maneja indicador de "escribiendo" del bot

### ✅ FUNCIONAL: Filtros de conversaciones (Todos, No Leídos, Resueltos)
- **Descripción:** Filtra conversaciones por estado
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 494-512, 1354-1369
- **Estado:** Completamente funcional
- **Notas:**
  - Filtro "Todos" muestra todas las conversaciones
  - Filtro "Resueltos" filtra por `status = 'resolved'`
  - Filtro "No Leídos" filtra por `unread = true` (aunque `unread` siempre es `false` actualmente)
  - Filtro "Favoritos" filtra por `isFavorite = true` (aunque `isFavorite` siempre es `false` actualmente)

### ✅ FUNCIONAL: Búsqueda de conversaciones
- **Descripción:** Busca conversaciones por nombre de contacto o último mensaje
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 494-512, 1322-1336
- **Estado:** Completamente funcional
- **Notas:**
  - Busca en `contactName` y `lastMessage`
  - Búsqueda case-insensitive
  - Se combina con filtros activos

### ✅ FUNCIONAL: Botón "Resolver chat"
- **Descripción:** Cambia el estado de la conversación entre 'active' y 'resolved'
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 899-931
- **Estado:** Completamente funcional
- **Notas:**
  - Actualiza `status` en BD directamente
  - Valida `organization_id` para seguridad
  - Recarga conversaciones después de actualizar
  - Muestra toast de confirmación

### ✅ FUNCIONAL: Paginación de conversaciones
- **Descripción:** Navegación entre páginas de conversaciones
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1494-1509
- **Componente:** `Pagination`
- **Estado:** Completamente funcional
- **Notas:**
  - Muestra "1 a 5 de 5 resultados" (datos reales de paginación)
  - Navegación entre páginas funcional
  - Resetea a página 1 cuando cambia el filtro

### ✅ FUNCIONAL: Notas internas
- **Descripción:** Guarda notas internas en metadata de conversación
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 678-752, 1087-1115
- **Estado:** Completamente funcional
- **Notas:**
  - Guarda como mensaje interno (`is_internal_note = true`)
  - Actualiza `metadata.notes` en conversación
  - Muestra notas en panel derecho
  - Permite editar y guardar notas

### ✅ FUNCIONAL: Etiquetas
- **Descripción:** Agregar y eliminar etiquetas de conversaciones
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1019-1085, 2087-2152
- **Estado:** Completamente funcional
- **Notas:**
  - Guarda en columna `labels` (TEXT[])
  - Valida que no se dupliquen etiquetas
  - Muestra etiquetas en lista y panel derecho
  - Permite eliminar etiquetas con botón X

### ✅ FUNCIONAL: Respuestas rápidas
- **Descripción:** Insertar plantillas de respuestas predefinidas
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 601-616, 1855-1881
- **Estado:** Completamente funcional
- **Notas:**
  - 8 respuestas rápidas hardcoded
  - Inserta texto en input al hacer clic
  - Cambia a tab "Responder" automáticamente

### ✅ FUNCIONAL: Timestamps de mensajes
- **Descripción:** Muestra timestamps reales de mensajes
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 197-210, 1756-1761
- **Estado:** Completamente funcional
- **Notas:**
  - Usa `created_at` de BD
  - Formatea tiempo relativo ("Ahora", "5m", "2h", "3d")
  - Muestra hora exacta en mensajes (HH:MM)

### ✅ FUNCIONAL: Indicador de estado de lectura
- **Descripción:** Muestra si el mensaje fue leído (✓✓) o solo enviado (✓)
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1747-1755
- **Estado:** Completamente funcional
- **Notas:**
  - Usa campo `read` de mensaje
  - Muestra `CheckCheck` (✓✓) si `read = true`
  - Muestra `Check` (✓) si `read = false`

### ✅ FUNCIONAL: Mensajes internos (Notas)
- **Descripción:** Muestra mensajes internos con estilo diferente
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1714-1728
- **Estado:** Completamente funcional
- **Notas:**
  - Detecta `type === 'internal'`
  - Muestra badge "Nota Interna"
  - Estilo visual diferente (amarillo/gris)

---

## ⚠️ FUNCIONALIDADES PARCIALES

### ⚠️ FUNCIONALIDAD PARCIAL: Botón "Reasignar"
- **Descripción:** Reasigna conversación a un agente
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 933-963
- **Problemas:**
  - Guarda en `metadata.assigned_agent` (no hay columna `assigned_to_user_id` dedicada)
  - No valida que el agente exista
  - No actualiza UI inmediatamente
  - Lista de agentes puede tener datos mock si falla la carga
- **Acción requerida:**
  1. Crear/validar columna `assigned_to_user_id` en BD
  2. Validar que el agente existe antes de asignar
  3. Mostrar agente asignado en UI
  4. Filtrar conversaciones por agente asignado

### ⚠️ FUNCIONALIDAD PARCIAL: Filtro "No Leídos"
- **Descripción:** Filtra conversaciones no leídas
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 240, 507
- **Problemas:**
  - Campo `unread` siempre es `false` (hardcoded en línea 240)
  - No se calcula basado en mensajes no leídos
  - Filtro funciona pero no muestra resultados porque no hay conversaciones marcadas como no leídas
- **Acción requerida:**
  1. Calcular `unread` basado en mensajes no leídos
  2. Marcar conversación como leída cuando se selecciona
  3. Actualizar `unread` cuando llegan nuevos mensajes

### ⚠️ FUNCIONALIDAD PARCIAL: Filtro "Favoritos"
- **Descripción:** Filtra conversaciones favoritas
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 246, 509, 1469-1484
- **Problemas:**
  - Campo `isFavorite` siempre es `false` (hardcoded en línea 246)
  - Botón de favorito no guarda en BD
  - Solo muestra toast pero no actualiza estado
- **Acción requerida:**
  1. Agregar campo `is_favorite` en tabla `whatsapp_conversations`
  2. Guardar estado de favorito en BD al hacer clic
  3. Cargar estado de favorito desde BD

### ⚠️ FUNCIONALIDAD PARCIAL: Información de contacto (País, Idioma, Moneda)
- **Descripción:** Muestra información del contacto en panel derecho
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 434-451, 2041-2083
- **Problemas:**
  - País siempre es "México" (hardcoded línea 441)
  - Idioma siempre es "Español" (hardcoded línea 442)
  - Moneda siempre es "Peso Mexicano" (hardcoded línea 443)
  - No se obtiene de datos reales del cliente
- **Acción requerida:**
  1. Obtener país desde perfil de WhatsApp (si está disponible)
  2. Detectar idioma desde mensajes o configuración
  3. Obtener moneda desde configuración de organización
  4. O usar valores por defecto si no están disponibles

### ⚠️ FUNCIONALIDAD PARCIAL: Mensajes programados
- **Descripción:** Programa mensajes para enviar en fecha/hora específica
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 826-879
- **Problemas:**
  - Solo guarda en `metadata.scheduled_messages` (no hay tabla dedicada)
  - No hay sistema de cronjobs para enviar mensajes programados
  - No se envían automáticamente
- **Acción requerida:**
  1. Crear tabla `scheduled_messages` o usar sistema de jobs
  2. Implementar worker/cronjob para enviar mensajes programados
  3. Mostrar lista de mensajes programados pendientes

### ⚠️ FUNCIONALIDAD PARCIAL: Respuestas con IA
- **Descripción:** Genera respuestas sugeridas usando IA
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 881-896
- **Problemas:**
  - Solo simula respuesta (setTimeout de 2 segundos)
  - No llama a API de IA real
  - Respuesta es hardcoded
- **Acción requerida:**
  1. Integrar con API de IA (OpenAI/Claude)
  2. Usar contexto de conversación para generar respuesta
  3. Mostrar múltiples opciones de respuesta

### ⚠️ FUNCIONALIDAD PARCIAL: Adjuntos (Archivos, Imágenes)
- **Descripción:** Permite enviar archivos e imágenes
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1117-1129
- **Problemas:**
  - Solo muestra toast "simulado"
  - No sube archivos realmente
  - API `/api/whatsapp/send` retorna 501 para imágenes/archivos
- **Acción requerida:**
  1. Implementar subida de archivos a storage
  2. Implementar envío de media en API `/api/whatsapp/send`
  3. Mostrar preview de imágenes antes de enviar

### ⚠️ FUNCIONALIDAD PARCIAL: Menú de acciones (Exportar, Fijar, Silenciar, etc.)
- **Descripción:** Acciones adicionales del menú de conversación
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 965-1016
- **Problemas:**
  - "Marcar como no leído": Solo muestra toast, no actualiza BD
  - "Exportar chat": Funciona (descarga JSON)
  - "Fijar chat": Solo muestra toast, no guarda en BD
  - "Silenciar chat": Solo muestra toast, no guarda en BD
  - "Sincronizar mensajes": Simula con timeout, no sincroniza realmente
  - "Bloquear chat": Solo muestra toast, no actualiza BD
  - "Bloquear contacto": Solo muestra toast, no actualiza BD
  - "Eliminar chat": Solo muestra toast, no elimina de BD
- **Acción requerida:**
  1. Implementar actualización de BD para cada acción
  2. Agregar campos necesarios en tabla (pinned, muted, blocked, etc.)
  3. Implementar sincronización real con WAHA

### ⚠️ FUNCIONALIDAD PARCIAL: Carga de agentes para reasignación
- **Descripción:** Carga lista de agentes disponibles para reasignar
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1136-1203
- **Problemas:**
  - Si falla carga de empleados, usa lista mock hardcoded
  - Lista mock: ['Juan Pérez', 'María García', 'Carlos López', 'Ana Martínez']
  - No valida que los agentes estén activos
- **Acción requerida:**
  1. Mejorar manejo de errores para no usar datos mock
  2. Validar que agentes estén activos
  3. Mostrar indicador de carga mientras obtiene agentes

### ⚠️ FUNCIONALIDAD PARCIAL: Detección de cliente por teléfono
- **Descripción:** Busca cliente en BD por número de teléfono
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 401-432
- **Problemas:**
  - Carga TODOS los clientes y filtra en frontend (ineficiente)
  - Normalización de teléfono puede fallar con formatos diferentes
  - No maneja casos donde hay múltiples clientes con mismo teléfono
- **Acción requerida:**
  1. Crear endpoint específico `/api/customers/by-phone?phone=X`
  2. Mejorar normalización de teléfonos
  3. Manejar casos de múltiples coincidencias

### ⚠️ FUNCIONALIDAD PARCIAL: Avatar/Foto de perfil
- **Descripción:** Muestra foto de perfil del contacto
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1402-1426, 1669-1692
- **Problemas:**
  - `profile_picture_url` puede no estar actualizado
  - No hay fallback para obtener foto desde WAHA si no existe
  - Fallback a iniciales funciona pero no es ideal
- **Acción requerida:**
  1. Implementar obtención de foto desde WAHA si no existe
  2. Actualizar `profile_picture_url` periódicamente
  3. Cachear fotos localmente

---

## ❌ PLACEHOLDERS Y DATOS MOCK

### ❌ PLACEHOLDER: "Cliente WhatsApp" (múltiples)
- **Descripción:** Nombre por defecto cuando no hay `customer_name`
- **Estado actual:** Hardcoded como fallback
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 215, 435, 627, 1434, 1694, 2018
- **También en:**
  - `src/app/api/webhooks/whatsapp/route.ts` (líneas 770, 777, 789)
- **Acción requerida:**
  1. ✅ **CORRECTO:** Es un fallback válido cuando no hay nombre
  2. Mejorar obtención de nombre desde perfil de WhatsApp
  3. Usar nombre del contacto de WhatsApp si está disponible

### ❌ PLACEHOLDER: "Cliente de Prueba" (datos de testing)
- **Descripción:** Datos de prueba que no fueron limpiados
- **Estado actual:** Hardcoded en endpoints de testing
- **Archivo:** 
  - `src/app/api/whatsapp/test-agent/route.ts` (línea 206)
  - `src/app/api/whatsapp/config/route.ts` (línea 270)
- **Acción requerida:**
  1. **ALTA PRIORIDAD:** Limpiar registros de prueba de BD
  2. Agregar validación para prevenir "Cliente de Prueba" en producción
  3. Usar nombres reales desde contactos de WhatsApp o clientes

### ❌ PLACEHOLDER: "Sin mensajes"
- **Descripción:** Texto mostrado cuando `last_message` es null
- **Estado actual:** Fallback válido
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 238, 1455
- **Acción requerida:**
  1. ✅ **CORRECTO:** Es un fallback válido
  2. Considerar ocultar conversaciones sin mensajes si es necesario

### ❌ PLACEHOLDER: "País: México", "Idioma: Español", "Moneda: Peso Mexicano"
- **Descripción:** Valores hardcoded en panel de información
- **Estado actual:** Siempre muestra estos valores
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 441-443, 2051-2060
- **Acción requerida:**
  1. Obtener país desde configuración de organización o perfil de WhatsApp
  2. Detectar idioma desde mensajes o configuración
  3. Obtener moneda desde configuración de organización
  4. Mostrar "N/A" si no está disponible en lugar de valores hardcoded

### ❌ PLACEHOLDER: "Sin correo"
- **Descripción:** Muestra "Sin correo" cuando no hay email del cliente
- **Estado actual:** Fallback válido
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 2168-2169
- **Acción requerida:**
  1. ✅ **CORRECTO:** Es un fallback válido
  2. Considerar permitir agregar email manualmente si no existe

### ❌ PLACEHOLDER: "Cuenta personal"
- **Descripción:** Tipo de cuenta siempre muestra "Cuenta personal"
- **Estado actual:** Hardcoded
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 440, 2048
- **Acción requerida:**
  1. Determinar tipo de cuenta desde perfil de WhatsApp (si está disponible)
  2. O mostrar "N/A" si no está disponible

### ❌ PLACEHOLDER: "Dispositivo: WhatsApp"
- **Descripción:** Siempre muestra "WhatsApp" como dispositivo
- **Estado actual:** Hardcoded
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 446, 2082
- **Acción requerida:**
  1. Obtener información de dispositivo desde WAHA (si está disponible)
  2. O mostrar "N/A" si no está disponible

### ❌ PLACEHOLDER: Lista de agentes mock (fallback)
- **Descripción:** Lista hardcoded de agentes si falla la carga
- **Estado actual:** Datos mock en caso de error
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1182-1187, 1191-1196
- **Datos mock:**
  ```typescript
  [
    { id: '1', name: 'Juan Pérez' },
    { id: '2', name: 'María García' },
    { id: '3', name: 'Carlos López' },
    { id: '4', name: 'Ana Martínez' }
  ]
  ```
- **Acción requerida:**
  1. **ALTA PRIORIDAD:** Eliminar fallback a datos mock
  2. Mostrar error si no se pueden cargar agentes
  3. Deshabilitar reasignación si no hay agentes disponibles

### ❌ PLACEHOLDER: Respuestas rápidas hardcoded
- **Descripción:** 8 respuestas rápidas predefinidas
- **Estado actual:** Array hardcoded
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 601-611
- **Acción requerida:**
  1. Permitir configurar respuestas rápidas por organización
  2. Guardar en BD (tabla `quick_replies` o `metadata`)
  3. Permitir editar/eliminar respuestas rápidas

### ❌ PLACEHOLDER: Tabs de navegación superior (Atención al Cliente, Ventas, Reclutamiento)
- **Descripción:** Tabs en barra superior que no funcionan
- **Estado actual:** Solo UI, sin funcionalidad
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1250-1279
- **Acción requerida:**
  1. Implementar filtrado por departamento
  2. Agregar campo `department` en conversaciones
  3. Filtrar conversaciones por departamento seleccionado

### ❌ PLACEHOLDER: Contadores en barra superior (32, 24)
- **Descripción:** Números hardcoded en botones de la barra superior
- **Estado actual:** Siempre muestra "32" y "24"
- **Archivo:** `src/app/dashboard/whatsapp/conversaciones/page.tsx`
- **Líneas:** 1282-1287
- **Acción requerida:**
  1. Calcular contadores reales (conversaciones activas, pendientes, etc.)
  2. Actualizar contadores en tiempo real
  3. Hacer clicables para filtrar

---

## 🔍 ANÁLISIS DE QUERIES Y DATOS

### Queries que retornan datos reales:
1. ✅ `GET /api/whatsapp/conversations` - Conversaciones reales desde BD
2. ✅ `GET /api/whatsapp/conversations/[id]/messages` - Mensajes reales desde BD
3. ✅ `GET /api/whatsapp/conversations/[id]` - Detalles de conversación reales
4. ✅ `GET /api/customers` - Clientes reales (aunque se cargan todos)

### Queries que pueden retornar datos mock:
1. ⚠️ `GET /api/employees` - Puede fallar y usar lista mock
2. ⚠️ `GET /api/users` - Fallback si employees falla

### Datos hardcoded que deberían ser dinámicos:
1. ❌ País: "México" (línea 441)
2. ❌ Idioma: "Español" (línea 442)
3. ❌ Moneda: "Peso Mexicano" (línea 443)
4. ❌ Tipo de cuenta: "Cuenta personal" (línea 440)
5. ❌ Dispositivo: "WhatsApp" (línea 446)
6. ❌ Respuestas rápidas: Array hardcoded (líneas 601-611)
7. ❌ Contadores: "32", "24" (líneas 1282-1287)

---

## 🎯 PRIORIDADES DE CORRECCIÓN

### 🔴 ALTA PRIORIDAD:
1. **Eliminar "Cliente de Prueba" de BD** - Limpiar datos de testing
2. **Eliminar fallback a agentes mock** - Mostrar error en lugar de datos falsos
3. **Implementar cálculo de `unread`** - Basado en mensajes no leídos
4. **Implementar `isFavorite` en BD** - Guardar favoritos realmente

### 🟡 MEDIA PRIORIDAD:
5. **Obtener país/idioma/moneda dinámicamente** - Desde configuración
6. **Implementar reasignación completa** - Con validación de agentes
7. **Implementar mensajes programados** - Con sistema de jobs
8. **Implementar respuestas con IA real** - Integrar API de IA
9. **Implementar envío de adjuntos** - Archivos e imágenes

### 🟢 BAJA PRIORIDAD:
10. **Configurar respuestas rápidas** - Por organización
11. **Implementar tabs de departamentos** - Filtrar por departamento
12. **Calcular contadores reales** - En barra superior
13. **Mejorar obtención de foto de perfil** - Desde WAHA
14. **Optimizar búsqueda de cliente por teléfono** - Endpoint específico

---

## 📝 NOTAS ADICIONALES

### Funcionalidades que dicen "próximamente":
- ❌ Envío de imágenes/archivos (API retorna 501)
- ❌ Respuestas con IA (solo simula)
- ❌ Mensajes programados (solo guarda, no envía)

### Componentes que necesitan conexión a API:
- ✅ Lista de conversaciones - **CONECTADO**
- ✅ Mensajes - **CONECTADO**
- ✅ Envío de mensajes - **CONECTADO**
- ⚠️ Reasignación - **PARCIAL** (guarda pero no valida)
- ❌ Respuestas IA - **NO CONECTADO**
- ❌ Adjuntos - **NO CONECTADO**

### Datos de prueba que deben limpiarse:
1. Conversaciones con `customer_name = 'Cliente de Prueba'`
2. Conversaciones creadas por `/api/whatsapp/test-agent`
3. Conversaciones creadas por `/api/whatsapp/config` (testing)

---

## ✅ CONCLUSIÓN

La página de conversaciones de WhatsApp está **mayormente funcional** con datos reales. Las funcionalidades críticas (cargar conversaciones, mensajes, enviar mensajes) funcionan correctamente. Sin embargo, hay varios placeholders y funcionalidades parciales que necesitan completarse, especialmente:

1. **Datos mock en fallbacks** (agentes, contadores)
2. **Valores hardcoded** (país, idioma, moneda)
3. **Funcionalidades sin implementar** (IA, adjuntos, programados)
4. **Campos no calculados** (unread, isFavorite)

**Recomendación:** Priorizar eliminar datos mock y completar funcionalidades parciales de alta prioridad antes de agregar nuevas características.

