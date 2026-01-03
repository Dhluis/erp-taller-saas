# 📱 Análisis de Rendimiento en Mobile

**Fecha:** 2025-01-10  
**Prioridad:** ALTA  
**Estado:** 🔍 ANÁLISIS COMPLETADO - Sin cambios aplicados

---

## 📊 RESUMEN EJECUTIVO

El sistema es **demasiado lento en versión mobile**. Se identificaron **8 problemas principales** que afectan el rendimiento, especialmente en dispositivos móviles con conexiones más lentas y procesadores menos potentes.

**Impacto estimado:** 3-5x más lento en mobile vs desktop

---

## 🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 1. **Polling Excesivo de WhatsApp** ⚠️ CRÍTICO

**Ubicación:**
- `src/components/WhatsAppQRConnectorSimple.tsx` (líneas 35-37)
- `src/components/WhatsAppQRConnector.tsx` (línea 35)

**Problema:**
```typescript
const POLLING_INTERVAL = 3000 // 3 segundos
const POLLING_INTERVAL_WITH_QR = 30000 // 30 segundos
```

**Impacto en Mobile:**
- ❌ **Cada 3 segundos** hace una petición HTTP al servidor
- ❌ En mobile con conexión lenta (3G/4G), cada petición puede tardar 1-2 segundos
- ❌ **Consumo constante de batería** y datos móviles
- ❌ **Bloquea el hilo principal** durante las peticiones
- ❌ Si hay múltiples componentes WhatsApp montados, se multiplica el problema

**Cálculo:**
- 20 peticiones/minuto = ~1.2MB de datos (solo polling)
- En 5 minutos: ~6MB de datos móviles consumidos

**Recomendación:**
- Aumentar intervalo a **10-15 segundos** cuando no hay QR
- Aumentar a **60 segundos** cuando ya hay QR visible
- Detener polling completamente cuando la app está en background
- Usar **WebSockets** o **Server-Sent Events** en lugar de polling

---

### 2. **Múltiples Realtime Subscriptions** ⚠️ CRÍTICO

**Ubicación:**
- `src/app/citas/page.tsx` (línea 160)
- `src/app/dashboard/whatsapp/conversaciones/page.tsx` (múltiples)
- `src/lib/context/SessionContext.tsx`
- `src/contexts/OrganizationContext.tsx`

**Problema:**
- ❌ **43 suscripciones realtime** activas simultáneamente
- ❌ Cada suscripción mantiene una conexión WebSocket abierta
- ❌ En mobile, múltiples WebSockets consumen mucha batería
- ❌ Cada cambio en la BD dispara actualizaciones en todos los clientes

**Impacto en Mobile:**
- ❌ **Alto consumo de batería** (WebSockets activos constantemente)
- ❌ **Alto consumo de datos** (cada cambio se sincroniza)
- ❌ **Lag en la UI** cuando hay muchos cambios simultáneos
- ❌ **Conexiones inestables** en mobile pueden causar reconexiones constantes

**Recomendación:**
- Consolidar suscripciones (una por tipo de dato, no una por componente)
- Usar **polling inteligente** en mobile (cada 30-60s) en lugar de realtime
- Detener suscripciones cuando la app está en background
- Implementar **debouncing** para actualizaciones frecuentes

---

### 3. **Queries sin Límites en Algunos Endpoints** ⚠️ ALTO

**Ubicación:**
- `src/app/api/whatsapp/conversations/[id]/messages/route.ts` (línea 1)
- `src/app/api/inventory/route.ts` (línea 1)
- `src/app/api/notifications/route.ts` (línea 1)
- Y otros 14 endpoints más

**Problema:**
```typescript
.select('*') // ❌ Trae TODOS los campos, incluso los que no se usan
```

**Impacto en Mobile:**
- ❌ **Payloads grandes** (10-50KB por respuesta)
- ❌ **Tiempo de descarga lento** en conexiones móviles (3G: 1-3s, 4G: 0.5-1s)
- ❌ **Alto consumo de datos móviles**
- ❌ **Parsing JSON lento** en dispositivos móviles menos potentes

**Recomendación:**
- Seleccionar solo campos necesarios: `.select('id, name, email')`
- Implementar **paginación estricta** (máximo 20-50 items por página)
- Usar **compresión gzip** en respuestas (ya debería estar activo en Vercel)
- Implementar **lazy loading** de datos secundarios

---

### 4. **652 useEffect/setInterval/setTimeout Activos** ⚠️ ALTO

**Problema:**
- ❌ **652 instancias** de `useEffect`, `setInterval`, `setTimeout`, `polling` encontradas
- ❌ Muchos componentes hacen polling o verificaciones constantes
- ❌ Cada `useEffect` puede disparar re-renders

**Impacto en Mobile:**
- ❌ **Alto consumo de CPU** (procesador móvil menos potente)
- ❌ **Batería drenada rápidamente**
- ❌ **UI laggy** cuando hay muchos efectos ejecutándose
- ❌ **Memory leaks** potenciales si no se limpian correctamente

**Recomendación:**
- Auditar y consolidar `useEffect` duplicados
- Usar **React.memo** y **useMemo** más agresivamente
- Implementar **debouncing** para efectos que se disparan frecuentemente
- Limpiar timers correctamente en `useEffect` cleanup

---

### 5. **Bundle Size Grande sin Code Splitting** ⚠️ MEDIO

**Dependencias pesadas:**
- `framer-motion` (12.23.24) - ~50KB gzipped
- `recharts` (3.2.1) - ~80KB gzipped
- `@dnd-kit/*` (múltiples) - ~40KB gzipped
- `qrcode.react` (4.2.0) - ~20KB gzipped

**Problema:**
- ❌ **Bundle inicial grande** (~500KB-1MB sin comprimir)
- ❌ En mobile con conexión lenta, carga inicial puede tardar 5-10 segundos
- ❌ Todas las dependencias se cargan aunque no se usen en la página actual

**Impacto en Mobile:**
- ❌ **Tiempo de carga inicial largo** (First Contentful Paint > 3s)
- ❌ **Alto consumo de datos móviles** en primera carga
- ❌ **JavaScript parsing lento** en dispositivos móviles menos potentes

**Recomendación:**
- Implementar **dynamic imports** para componentes pesados:
  ```typescript
  const HeavyChart = dynamic(() => import('./HeavyChart'), { ssr: false })
  ```
- **Code splitting** por ruta (Next.js ya lo hace, pero verificar)
- **Lazy load** componentes que no están en viewport inicial
- Considerar alternativas más ligeras para gráficos (Chart.js en lugar de Recharts)

---

### 6. **Falta de Optimización de Imágenes** ⚠️ MEDIO

**Ubicación:**
- `src/components/work-orders/WorkOrderImageManager.tsx`
- Documentado en `OPTIMIZATION_ANALYSIS.md`

**Problema:**
- ❌ **20 imágenes** se cargan simultáneamente al abrir una orden
- ❌ Cada imagen es **~500KB-1MB** (después de compresión)
- ❌ **Total: 10-20MB** de imágenes en una sola orden
- ❌ No hay lazy loading explícito
- ❌ No hay thumbnails (se carga imagen completa en grid)

**Impacto en Mobile:**
- ❌ **Carga inicial muy lenta** (10-20MB en 4G = 20-40 segundos)
- ❌ **Alto consumo de datos móviles**
- ❌ **UI bloqueada** mientras cargan imágenes
- ❌ **Scroll laggy** con muchas imágenes

**Recomendación:**
- Implementar **lazy loading** con Intersection Observer
- Generar **thumbnails** (200x200px) para el grid
- Cargar imagen completa solo al hacer zoom
- Paginación de imágenes (6-9 por página)

---

### 7. **Múltiples Context Providers Anidados** ⚠️ MEDIO

**Ubicación:**
- `src/lib/context/SessionContext.tsx`
- `src/contexts/OrganizationContext.tsx`
- `src/contexts/AuthContext.tsx`

**Problema:**
- ❌ **Múltiples context providers** anidados
- ❌ Cada cambio en un context dispara re-renders en todos los consumidores
- ❌ En mobile, re-renders frecuentes causan lag

**Impacto en Mobile:**
- ❌ **Re-renders innecesarios** cuando cambia cualquier context
- ❌ **UI laggy** durante actualizaciones de estado
- ❌ **Batería consumida** por re-renders constantes

**Recomendación:**
- Consolidar contexts relacionados
- Usar **Zustand** o **Jotai** para estado global (más eficiente)
- Implementar **selectores** para evitar re-renders innecesarios
- Usar **React.memo** en componentes que consumen context

---

### 8. **Falta de Service Worker / Cache** ⚠️ BAJO

**Problema:**
- ❌ No hay **Service Worker** para cachear assets
- ❌ No hay **cache de API responses** en el cliente
- ❌ Cada visita descarga todo desde cero

**Impacto en Mobile:**
- ❌ **Carga inicial lenta** en cada visita
- ❌ **Alto consumo de datos móviles** repetitivo
- ❌ **No funciona offline** (aunque sea básico)

**Recomendación:**
- Implementar **Service Worker** para cachear assets estáticos
- Cachear respuestas de API con **stale-while-revalidate**
- Implementar **IndexedDB** para datos críticos offline

---

## 📈 IMPACTO ESTIMADO POR PROBLEMA

| Problema | Impacto Mobile | Esfuerzo Fix | Prioridad |
|----------|---------------|--------------|-----------|
| Polling WhatsApp | 🔴 CRÍTICO (3-5s delay) | Bajo (2h) | **1** |
| Realtime Subscriptions | 🔴 CRÍTICO (batería) | Medio (4h) | **2** |
| Queries sin límites | 🟠 ALTO (1-3s delay) | Bajo (3h) | **3** |
| 652 useEffect | 🟠 ALTO (lag general) | Alto (8h) | **4** |
| Bundle size | 🟡 MEDIO (5-10s carga) | Medio (6h) | **5** |
| Imágenes sin optimizar | 🟡 MEDIO (20-40s carga) | Medio (4h) | **6** |
| Context providers | 🟡 MEDIO (lag UI) | Bajo (3h) | **7** |
| Sin Service Worker | 🟢 BAJO (carga repetida) | Alto (10h) | **8** |

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### **Fase 1: Quick Wins (1-2 días) - Impacto Inmediato**

1. **Reducir polling de WhatsApp** (2 horas)
   - Aumentar intervalos: 3s → 10s, 30s → 60s
   - Detener cuando app en background

2. **Optimizar queries** (3 horas)
   - Seleccionar solo campos necesarios
   - Verificar paginación en todos los endpoints

3. **Consolidar realtime subscriptions** (4 horas)
   - Una suscripción por tipo de dato
   - Detener cuando app en background

**Resultado esperado:** 40-50% mejora en velocidad

---

### **Fase 2: Optimizaciones Medias (3-5 días)**

4. **Lazy loading de imágenes** (4 horas)
   - Intersection Observer
   - Thumbnails para grid

5. **Code splitting agresivo** (6 horas)
   - Dynamic imports para componentes pesados
   - Lazy load por ruta

6. **Optimizar contexts** (3 horas)
   - Consolidar providers
   - Usar selectores

**Resultado esperado:** 60-70% mejora total

---

### **Fase 3: Optimizaciones Avanzadas (5-7 días)**

7. **Service Worker + Cache** (10 horas)
   - Cache de assets estáticos
   - Cache de API responses

8. **Auditar y optimizar useEffect** (8 horas)
   - Consolidar duplicados
   - Implementar debouncing

**Resultado esperado:** 80-90% mejora total

---

## 📊 MÉTRICAS ACTUALES (Estimadas)

### **Desktop:**
- First Contentful Paint: ~1.5s
- Time to Interactive: ~3s
- Bundle size: ~500KB

### **Mobile (4G):**
- First Contentful Paint: ~4-6s ⚠️
- Time to Interactive: ~8-12s ⚠️
- Bundle size: ~500KB (mismo, pero parsing más lento)
- Consumo datos: ~10-15MB por sesión ⚠️

### **Mobile (3G):**
- First Contentful Paint: ~8-12s 🔴
- Time to Interactive: ~15-25s 🔴
- Consumo datos: ~10-15MB por sesión 🔴

---

## ✅ RECOMENDACIONES INMEDIATAS

1. **Implementar detección de conexión móvil:**
   ```typescript
   const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
   const isSlowConnection = navigator.connection?.effectiveType === 'slow-2g' || '2g'
   
   // Ajustar polling según conexión
   const POLLING_INTERVAL = isMobile ? 10000 : 3000
   ```

2. **Detener polling cuando app en background:**
   ```typescript
   useEffect(() => {
     const handleVisibilityChange = () => {
       if (document.hidden) {
         stopPolling() // Detener cuando no está visible
       }
     }
     document.addEventListener('visibilitychange', handleVisibilityChange)
   }, [])
   ```

3. **Implementar debouncing en búsquedas:**
   - Ya existe `useDebouncedValue` hook
   - Verificar que se use en todos los inputs de búsqueda

---

## 🔍 ARCHIVOS A REVISAR PRIMERO

1. `src/components/WhatsAppQRConnectorSimple.tsx` - Polling
2. `src/app/citas/page.tsx` - Realtime subscription
3. `src/app/dashboard/whatsapp/conversaciones/page.tsx` - Múltiples subscriptions
4. `src/lib/context/SessionContext.tsx` - Context provider
5. `src/app/api/whatsapp/conversations/[id]/messages/route.ts` - Query sin límites

---

**Nota:** Este análisis se realizó sin hacer cambios al código. Todos los problemas identificados son basados en análisis estático del código y patrones conocidos de rendimiento en mobile.

