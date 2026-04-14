# 📋 ANÁLISIS DE PLACEHOLDERS Y PRIORIDADES

**Fecha de actualización:** 2025-01-22  
**Última revisión:** Análisis completo del código base  
**Estado:** 🔄 EN REVISIÓN

---

## 📊 RESUMEN EJECUTIVO

Este documento analiza todos los placeholders, TODOs, y funcionalidades pendientes en el código base, organizados por prioridad y categoría.

**Estadísticas:**
- **TODOs encontrados:** 34
- **Placeholders HTML válidos:** 100+ (no requieren acción)
- **Funcionalidades pendientes:** 15+
- **Archivos con TODOs:** 20+

---

## 🎯 PRIORIDADES

### 🔴 ALTA PRIORIDAD (Crítico - Implementar pronto)

#### 1. Sistema de Inventario - Alertas (CONECTAR AL DASHBOARD)
**Archivo:** `src/app/dashboard/page.tsx` (línea 441)
```typescript
alertasInventario: alertasInventario, // TODO: Cargar desde API de inventario
```

**Estado actual:**
- ✅ **Componente implementado:** `src/components/dashboard/LowStockAlert.tsx`
- ✅ **API endpoint existe:** `/api/inventory/low-stock`
- ✅ **Query function existe:** `getLowStockItems()` en `src/lib/database/queries/inventory.ts`
- ✅ **Función dashboard existe:** `getAlertasInventario()` en `src/lib/database/queries/dashboard.ts`
- ❌ **NO está conectado:** Dashboard no carga las alertas (siempre muestra 0)
- ⚠️ **Bug en query:** `getAlertasInventario()` usa `quantity <= 10` hardcodeado en lugar de `minimum_stock`

**Impacto:** Dashboard muestra 0 alertas aunque haya stock bajo  
**Esfuerzo:** 1-2 horas (solo conectar, funcionalidad ya existe)  
**Dependencias:** Ninguna (todo ya está implementado)

**Acción requerida:**
1. Llamar `getAlertasInventario()` en `loadIncomeAndCustomers()` o crear función separada
2. Actualizar `setAlertasInventario()` con el resultado
3. Corregir `getAlertasInventario()` para usar `minimum_stock` en lugar de `quantity <= 10`

#### 2. Envío de Emails - Invitaciones
**Archivos:**
- `src/app/api/invitations/route.ts` (línea 336)
- `src/app/api/invitations/resend/route.ts` (línea 142)
```typescript
// TODO: Implementar envío de email real
```
**Impacto:** Invitaciones no se envían por email  
**Esfuerzo:** 4-5 horas  
**Dependencias:** Servicio de email (SendGrid, Resend, etc.)

#### 3. Envío de Emails - Cotizaciones
**Archivo:** `src/app/api/quotations/[id]/send/route.ts` (línea 188)
```typescript
// TODO: Implementar envío de email
```
**Impacto:** Cotizaciones no se pueden enviar por email  
**Esfuerzo:** 3-4 horas  
**Dependencias:** Servicio de email + templates

---

### 🟡 MEDIA PRIORIDAD (Importante - Implementar después)

#### 4. Actualización de Perfil de Usuario
**Archivos:**
- `src/components/user-profile.tsx` (línea 120)
- `src/hooks/use-user-profile.ts` (líneas 64, 108, 126)
- `src/lib/supabase/user-profile.ts` (líneas 140, 157, 182)
```typescript
// TODO: Implementar actualización de perfil vía API
// TODO: Implementar subida real a Supabase Storage
// TODO: Implementar eliminación real de Supabase Storage
```
**Impacto:** Usuarios no pueden actualizar su perfil completamente  
**Esfuerzo:** 5-6 horas  
**Dependencias:** API de usuarios, Supabase Storage

#### 5. Transcripción de Audios - WhatsApp
**Archivo:** `src/app/api/webhooks/whatsapp/route.ts` (línea 412)
```typescript
// TODO: Integrar con Whisper API para transcribir audios
```
**Impacto:** Audios de WhatsApp no se transcriben automáticamente  
**Esfuerzo:** 4-5 horas  
**Dependencias:** OpenAI Whisper API o similar

#### 6. Configuración de Organización - Timezone y Idioma
**Archivo:** `src/lib/config/organization-config.ts` (líneas 37-38)
```typescript
timezone: undefined, // TODO: Agregar timezone a company_settings si es necesario
language: undefined, // TODO: Agregar language a company_settings si es necesario
```
**Impacto:** No se puede configurar timezone/idioma por organización  
**Esfuerzo:** 3-4 horas  
**Dependencias:** Migración de BD para agregar campos

#### 7. Notificaciones - Aprobación/Rechazo de Cotizaciones
**Archivos:**
- `src/app/api/quotations/[id]/approve/route.ts` (línea 138)
- `src/app/api/quotations/[id]/reject/route.ts` (línea 115)
```typescript
// TODO: Implementar notificaciones
```
**Impacto:** No se notifica cuando se aprueba/rechaza una cotización  
**Esfuerzo:** 2-3 horas  
**Dependencias:** Sistema de notificaciones (ya existe)

---

### 🟢 BAJA PRIORIDAD (Nice to have - Implementar cuando haya tiempo)

#### 8. Funciones de Work Orders - No implementadas
**Archivo:** `src/lib/database/queries/work-orders.ts` (línea 813)
```typescript
// TODO: Implementar cuando se necesite
```
**Impacto:** Funciones auxiliares no implementadas  
**Esfuerzo:** Variable  
**Dependencias:** Ninguna crítica

#### 9. Funciones de Vehicles - No implementadas
**Archivo:** `src/lib/database/queries/vehicles.ts` (línea 240)
```typescript
// TODO: Implementar estas funciones cuando se necesiten
```
**Impacto:** Funciones auxiliares no implementadas  
**Esfuerzo:** Variable  
**Dependencias:** Ninguna crítica

#### 10. Sistema de Versionado - Cotizaciones
**Archivo:** `src/lib/database/queries/quotations.ts` (línea 574)
```typescript
// TODO: Implementar sistema de versionado cuando se necesite
```
**Impacto:** No se puede versionar cotizaciones  
**Esfuerzo:** 6-8 horas  
**Dependencias:** Migración de BD

#### 11. Conversiones de Órdenes - Endpoints comentados
**Archivos:**
- `src/app/api/conversions/work-order-to-quotation/route.ts`
- `src/app/api/conversions/work-order-to-invoice/route.ts`
- `src/app/api/conversions/quotation-to-invoice/route.ts`
```typescript
/**
 * TODO: Implementar cuando se necesite la funcionalidad
 */
```
**Impacto:** No se pueden convertir órdenes a cotizaciones/facturas  
**Esfuerzo:** 8-10 horas  
**Dependencias:** Lógica de negocio definida

#### 12. Endpoints con withPermission - Comentados temporalmente
**Archivos:**
- `src/app/api/auth/me/route.ts`
- `src/app/api/users/[id]/activate/route.ts`
- `src/app/api/users/[id]/role/route.ts`
- `src/app/api/users/stats/route.ts`
- `src/app/api/reports/dashboard/route.ts`
```typescript
// TODO: Temporalmente comentado para deploy - withPermission no está implementado
```
**Impacto:** Endpoints no disponibles  
**Esfuerzo:** 3-4 horas  
**Dependencias:** Implementar `withPermission` helper

---

## ✅ PLACEHOLDERS HTML VÁLIDOS (NO MODIFICAR)

Los siguientes placeholders son correctos y mejoran la UX:

### Inputs de Formulario
- ✅ `placeholder="Buscar órdenes, clientes, vehículos, productos..."`
- ✅ `placeholder="Juan Pérez"`
- ✅ `placeholder="+52 81 1234 5678"`
- ✅ `placeholder="cliente@email.com"`
- ✅ `placeholder="Toyota Corolla 2020 - ABC123"`
- ✅ `placeholder="Cambio de aceite, Revisión general, etc."`
- ✅ `placeholder="Notas adicionales sobre la cita"`
- ✅ `placeholder="Buscar citas..."`
- ✅ `placeholder="Escribe un mensaje de prueba..."`
- ✅ `placeholder="¿Hacen diagnósticos gratis?"`

**Total:** 100+ placeholders HTML válidos - ✅ **NO REQUIEREN CAMBIOS**

---

## 📋 CATEGORIZACIÓN POR TIPO

### 🔔 Notificaciones y Comunicaciones
1. **Envío de emails** (Alta prioridad)
   - Invitaciones de usuarios
   - Envío de cotizaciones
   - Notificaciones de aprobación/rechazo

2. **Transcripción de audios** (Media prioridad)
   - WhatsApp audios → texto

### 👤 Gestión de Usuarios
1. **Actualización de perfil** (Media prioridad)
   - Subida de avatar
   - Actualización de datos
   - Configuración de seguridad

### ⚙️ Configuración
1. **Timezone e Idioma** (Media prioridad)
   - Por organización
   - Por usuario

### 📊 Dashboard y Reportes
1. **Alertas de inventario** (Alta prioridad) - ⚠️ **FUNCIONALIDAD EXISTE, FALTA CONECTAR**
   - ✅ Componente `LowStockAlert` implementado
   - ✅ API `/api/inventory/low-stock` funciona
   - ✅ Query `getLowStockItems()` implementada
   - ❌ NO conectado al dashboard principal
   - ⚠️ Bug: `getAlertasInventario()` usa `quantity <= 10` hardcodeado (debería usar `minimum_stock`)

### 🔄 Conversiones y Transformaciones
1. **Work Order → Quotation** (Baja prioridad)
2. **Work Order → Invoice** (Baja prioridad)
3. **Quotation → Invoice** (Baja prioridad)

### 🛠️ Funciones Auxiliares
1. **Work Orders queries** (Baja prioridad)
2. **Vehicles queries** (Baja prioridad)
3. **Versionado de cotizaciones** (Baja prioridad)

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Alta Prioridad (1-2 semanas)
1. ✅ **Alertas de inventario** - Conectar dashboard con API (funcionalidad ya existe)
   - Llamar `getAlertasInventario()` en `loadIncomeAndCustomers()`
   - Corregir bug: usar `minimum_stock` en lugar de `quantity <= 10`
2. ✅ **Envío de emails** - Configurar servicio (SendGrid/Resend)
3. ✅ **Emails de cotizaciones** - Templates y envío

### Fase 2: Media Prioridad (2-4 semanas)
4. ✅ **Actualización de perfil** - Completar funcionalidad
5. ✅ **Transcripción de audios** - Integrar Whisper API
6. ✅ **Timezone/Idioma** - Agregar campos a BD
7. ✅ **Notificaciones cotizaciones** - Conectar sistema existente

### Fase 3: Baja Prioridad (Cuando haya tiempo)
8. ✅ **Funciones auxiliares** - Implementar según necesidad
9. ✅ **Sistema de versionado** - Si se requiere
10. ✅ **Conversiones** - Si se requiere en el flujo

---

## 📊 ESTADÍSTICAS DETALLADAS

### Por Prioridad:
- 🔴 **Alta:** 3 items
- 🟡 **Media:** 4 items
- 🟢 **Baja:** 8 items

### Por Categoría:
- 🔔 **Comunicaciones:** 4 items
- 👤 **Usuarios:** 3 items
- ⚙️ **Configuración:** 2 items
- 📊 **Dashboard:** 1 item
- 🔄 **Conversiones:** 3 items
- 🛠️ **Auxiliares:** 3 items

### Por Esfuerzo Estimado:
- **1-3 horas:** 3 items
- **3-5 horas:** 6 items
- **5-8 horas:** 3 items
- **8+ horas:** 3 items

---

## ✅ VERIFICACIONES REALIZADAS

### Patrones buscados:
- ✅ `TODO:` - 34 encontrados (documentados arriba)
- ✅ `FIXME:` - 0 encontrados
- ✅ `XXX` - 0 encontrados
- ✅ `placeholder` - 100+ (todos HTML válidos)
- ✅ `test@test.com` - 0 encontrados
- ✅ `example.com` - Solo en documentación
- ✅ `mock` - 0 encontrados en código de producción
- ✅ `fake` - 0 encontrados

### Archivos revisados:
- ✅ `src/components/**/*.tsx`
- ✅ `src/app/**/page.tsx`
- ✅ `src/app/**/route.ts`
- ✅ `src/lib/**/*.ts`
- ✅ `src/hooks/**/*.ts`

---

## ✅ FUNCIONALIDADES YA IMPLEMENTADAS (Solo falta conectar)

### Stock Bajo - Sistema Completo Implementado

**Componentes existentes:**
- ✅ `src/components/dashboard/LowStockAlert.tsx` - Componente completo y funcional
- ✅ `src/app/api/inventory/low-stock/route.ts` - API endpoint funcionando
- ✅ `src/lib/database/queries/inventory.ts` - `getLowStockItems()` implementada (usa `min_quantity` correctamente)
- ✅ `src/lib/database/queries/dashboard.ts` - `getAlertasInventario()` existe pero tiene bug

**Páginas que usan stock bajo:**
- ✅ `/inventarios/alerts` - Página dedicada de alertas
- ✅ `/inventarios/productos` - Muestra badges de "Stock Bajo"
- ✅ `/inventarios` - Card de "Stock Bajo" con contador

**Lo que falta:**
1. Conectar `getAlertasInventario()` al dashboard principal (`src/app/dashboard/page.tsx`)
2. Corregir bug en `getAlertasInventario()`: cambiar `quantity <= 10` por comparación con `minimum_stock`
3. Llamar la función en `loadIncomeAndCustomers()` o crear función separada

**Esfuerzo estimado:** 30-60 minutos (solo conectar, no implementar)

---

## 📝 NOTAS IMPORTANTES

### Endpoints Temporalmente Comentados
Algunos endpoints están comentados porque dependen de `withPermission` que no está implementado. Estos son:
- `/api/auth/me`
- `/api/users/[id]/activate`
- `/api/users/[id]/role`
- `/api/users/stats`
- `/api/reports/dashboard`

**Recomendación:** Implementar `withPermission` helper para habilitar estos endpoints.

### Funcionalidades de Conversión
Los endpoints de conversión están creados pero no implementados. Si se requiere esta funcionalidad, será necesario:
1. Definir lógica de negocio
2. Implementar validaciones
3. Manejar estados de transición
4. Actualizar relaciones en BD

---

## 🎯 PRÓXIMOS PASOS

### Inmediatos (Esta semana):
1. Revisar y priorizar TODOs de alta prioridad
2. Decidir qué funcionalidades son críticas vs nice-to-have
3. Asignar recursos a items de alta prioridad

### Corto plazo (Este mes):
1. Implementar alertas de inventario
2. Configurar servicio de emails
3. Completar actualización de perfil

### Mediano plazo (Próximos 2-3 meses):
1. Implementar funcionalidades de media prioridad
2. Revisar y decidir sobre conversiones
3. Implementar funciones auxiliares según necesidad

---

## 📅 HISTORIAL DE ACTUALIZACIONES

- **2025-01-22:** Análisis completo actualizado
  - Agregados 34 TODOs encontrados
  - Categorizados por prioridad
  - Estimado esfuerzo para cada item
  - Plan de acción recomendado

- **2025-01-09:** Análisis inicial
  - 1 TODO encontrado
  - Placeholders HTML validados

---

**Generado por:** Análisis Automático del Código Base  
**Revisado por:** Sistema de Auditoría Confia Drive ERP  
**Próxima revisión:** 2025-02-22

