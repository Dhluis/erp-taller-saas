# Confia Drive ERP - Developer Guide

**Última actualización:** Abril 2026
**Versión del proyecto:** 5.0.0
**Estado general:** ✅ **PRODUCCIÓN ESTABLE**

---

## 🚨 REGLAS CRÍTICAS - LEER ANTES DE HACER CAMBIOS

### ⛔ NO TOCAR - Funcionalidades 100% operativas:

#### 1. **WhatsApp Integration via Twilio (CRÍTICO)**
**Archivos clave:**
- `src/lib/messaging/twilio-client.ts` — cliente Twilio
- `src/lib/messaging/sender.ts` — lógica de envío
- `src/lib/messaging/whatsapp-service.ts` — servicio unificado
- `src/app/api/messaging/twilio/webhook/[organizationId]/route.ts` — webhook entrante
- `src/integrations/whatsapp/utils/index.ts` — parsers Twilio/Meta/Evolution (**NO eliminar**)
- `src/components/WhatsAppTwilioStatus.tsx` — UI de estado de conexión

**Cómo funciona:**
- Mensajes entrantes llegan al webhook de Twilio por organización
- El AI Agent (`src/integrations/whatsapp/services/ai-agent.ts`) procesa y responde
- Las conversaciones se guardan en `whatsapp_conversations` y `whatsapp_messages`
- `MessageSource = 'twilio'` únicamente — no hay WAHA ni Meta directo

**NUNCA:**
- ❌ Modificar `ai-agent.ts` sin entender el contexto completo del agente
- ❌ Eliminar `src/integrations/whatsapp/utils/index.ts` (parsers de múltiples providers)
- ❌ Cambiar la URL del webhook de Twilio sin actualizar en el dashboard de Twilio

**Impacto si se rompe:** Módulo WhatsApp completamente inoperativo, sin notificaciones automáticas a clientes

---

#### 2. **RLS Multi-tenant (CRÍTICO - 5+ horas de auditoría)**
**Archivos:** `supabase/migrations/**/*.sql`

**Políticas implementadas:**
- ✅ 41 tablas con políticas RLS correctas
- ✅ Patrón estándar: `organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())`
- ✅ Políticas para: SELECT, INSERT, UPDATE, DELETE
- ✅ Validación de `workshop_id` opcional (puede ser NULL)
- ✅ **NUEVA:** Política `"Users can view organization users"` en tabla `users` (migración 025)
  - Permite ver usuarios de la misma organización (necesario para dropdowns de asignación)
  - Usa función helper `get_user_organization_id()` para obtener `organization_id` del usuario autenticado

**Tablas críticas con RLS:**
- `work_orders` - ✅ Políticas validadas y funcionando (incluye soft delete)
- `vehicles` - ✅ Políticas validadas y funcionando
- `customers` - ✅ Políticas validadas y funcionando
- `inventory` - ✅ Políticas validadas y funcionando
- `quotations` - ✅ Políticas validadas y funcionando
- `invoices` - ✅ Políticas validadas y funcionando
- `users` - ✅ Política para ver usuarios de la misma organización (migración 025)

**NUNCA:**
- ❌ Eliminar políticas RLS
- ❌ Cambiar estructura de políticas sin revisar impacto
- ❌ Agregar policies con "Enable all" (bypass RLS)
- ❌ Modificar `organization_id` checks sin validar

**Impacto si se rompe:** Filtrado multi-tenant roto, datos de otras organizaciones visibles

---

#### 3. **Autenticación y Sesión (CRÍTICO)**
**Archivos:** 
- `src/middleware.ts`
- `src/lib/context/SessionContext.tsx`
- `src/lib/auth/middleware.ts`

**Middleware order (CRÍTICO):**
```typescript
// ✅ ORDEN CORRECTO:
1. Auth middleware (verificar sesión)
2. Rate limit middleware (DESPUÉS de auth)
3. Organization context (cargar organization_id)
```

**Session Context:**
- ✅ Carga `organization_id` desde tabla `users`
- ✅ Carga `workshop_id` opcional
- ✅ Manejo de estados: `loading`, `ready`, `error`
- ✅ Cache de sesión para evitar múltiples queries

**NUNCA cambiar:**
- ❌ Orden de middleware (rate limit DEBE ir después de auth)
- ❌ Variables de entorno con `\r\n` (causa errores de parsing)
- ❌ Estructura de SessionContext (rompe toda la app)

**Impacto si se rompe:** Autenticación rota, usuarios no pueden acceder

---

#### 4. **Work Orders API (CRÍTICO - Lógica especial)**
**Archivo:** `src/app/api/work-orders/route.ts`

**Lógica implementada:**
- ✅ GET: Si usuario NO tiene `employee_id`, mostrar **TODAS** las órdenes de la organización
- ✅ GET: Si usuario SÍ tiene `employee_id`, filtrar por `assigned_to = employee_id`
- ✅ POST: Usa service role key para INSERT (bypass RLS cuando es necesario)
- ✅ POST: Pasa cliente autenticado a `createWorkOrder()` para que RLS funcione
- ✅ Soft Delete: Todas las queries filtran `deleted_at IS NULL`
- ✅ Estadísticas: Filtran órdenes eliminadas (soft delete)

**NUNCA:**
- ❌ Filtrar por `assigned_to` si user no tiene `employee_id` (retorna 0 órdenes)
- ❌ Retornar array vacío si no hay `employee_id` (debe mostrar todas las órdenes)
- ❌ Usar cliente sin autenticación para INSERT (falla RLS)
- ❌ Olvidar filtrar `deleted_at IS NULL` en queries (muestra órdenes eliminadas)

**Impacto si se rompe:** Mecánicos no ven órdenes, creación de órdenes falla, estadísticas incorrectas

---

#### 5. **Mobile Performance**
**Archivos:**
- `src/app/reportes/page.tsx` (skeleton loading con refs)

**Optimizaciones implementadas:**
- ✅ Reportes: Skeleton loading sin parpadeo (usando `hasLoadedRef`)
- ✅ Datos del dashboard se cargan en paralelo (Promise.allSettled)
- ✅ Imágenes lazy-loaded

**NUNCA:**
- ❌ Remover refs de prevención de ejecución múltiple en useEffect
- ❌ Agregar dependencias innecesarias a useEffect (loops de render)

**Impacto si se rompe:** Parpadeo en carga de reportes, renders infinitos

---

#### 6. **Asignación de Empleados (CRÍTICO - Cambio de tabla)**
**Archivos:**
- `src/components/ordenes/CreateWorkOrderModal.tsx`
- `src/app/ordenes/page.tsx`
- `supabase/migrations/024_change_assigned_to_to_users.sql`
- `supabase/migrations/025_add_users_organization_view_policy.sql`

**Cambios implementados:**
- ✅ `assigned_to` ahora apunta a `users.id` (no `employees.id`)
- ✅ Dropdown carga desde tabla `users` con roles `MECANICO` y `ASESOR`
- ✅ Política RLS permite ver usuarios de la misma organización
- ✅ Lista de órdenes muestra correctamente el empleado asignado
- ✅ Incluye mecánicos con `workshop_id: null` (flotantes) para todos los workshops

**Tabla y campos:**
- Tabla: `users` (no `system_users` ni `employees`)
- Campos: `id, full_name, email, role, workshop_id, organization_id, is_active`
- Roles incluidos: `MECANICO`, `ASESOR`
- Filtro: `role IN ('MECANICO', 'ASESOR') AND is_active = true`

**Política RLS:**
- Nombre: `"Users can view organization users"`
- Permite: Ver usuarios de la misma organización (además del propio perfil)
- Función helper: `get_user_organization_id()` obtiene `organization_id` del usuario autenticado

**NUNCA:**
- ❌ Usar tabla `employees` o `system_users` para asignación
- ❌ Filtrar solo por `MECANICO` (debe incluir `ASESOR`)
- ❌ Excluir mecánicos con `workshop_id: null` cuando hay múltiples workshops
- ❌ Olvidar filtrar por `organization_id` en queries de usuarios

**Impacto si se rompe:** Dropdown vacío, asignación incorrecta, lista muestra "Sin asignar"

---

## ✅ ESTADO ACTUAL DEL PROYECTO (Abril 2026)

### **Módulos 100% Funcionales:**

#### **Dashboard**
- ✅ Estadísticas en tiempo real (KPIs)
- ✅ Gráficas de órdenes por estado
- ✅ Alertas de inventario
- ✅ Actividades recientes
- ✅ Métricas de rendimiento

#### **Work Orders (Órdenes de Trabajo)**
- ✅ Kanban Board (drag & drop)
- ✅ Lista de órdenes con filtros
- ✅ Creación/edición de órdenes
- ✅ Detalles de orden con items
- ✅ Asignación a mecánicos y asesores (roles MECANICO y ASESOR)
- ✅ Tracking de estados
- ✅ Soft delete (marca `deleted_at` sin eliminar físicamente)
- ✅ Visualización correcta de empleados asignados en lista
- ✅ Subida de PDFs de términos y condiciones

#### **Customers (Clientes)**
- ✅ CRUD completo
- ✅ Búsqueda y filtros
- ✅ Historial de órdenes por cliente
- ✅ Vehículos asociados

#### **Vehicles (Vehículos)**
- ✅ CRUD completo
- ✅ Búsqueda por placa
- ✅ Historial de servicios
- ✅ Asociación con clientes

#### **Appointments (Citas)**
- ✅ Creación de citas
- ✅ Creación automática de clientes/vehículos
- ✅ Visualización de citas
- ✅ Filtros por fecha

#### **Inventory (Inventario)**
- ✅ CRUD de productos
- ✅ Categorías de inventario
- ✅ Movimientos de inventario
- ✅ Alertas de stock bajo
- ✅ Estadísticas de inventario

#### **Quotations (Cotizaciones)**
- ✅ Creación de cotizaciones
- ✅ Tracking de estados
- ✅ Versiones de cotizaciones
- ✅ Conversión a factura
- ✅ Items y descuentos

#### **WhatsApp Integration (Twilio)**
- ✅ Mensajes entrantes y salientes via Twilio
- ✅ Bot AI con configuración personalizada por organización
- ✅ Conversaciones en tiempo real
- ✅ Notificación automática al cliente al cambiar estado de orden
- ✅ Botón manual "Notificar al cliente" en detalle de orden

#### **Reportes**
- ✅ Reporte de órdenes
- ✅ Reporte de inventario
- ✅ Reporte de ingresos
- ✅ Reporte de ventas
- ✅ Reporte financiero
- ✅ Exportación de reportes

#### **Users & Invitations**
- ✅ Gestión de usuarios multi-tenant
- ✅ Invitaciones (sin email aún)
- ✅ Roles y permisos
- ✅ Perfiles de usuario

---

### **Módulos con Mock Data (pendientes):**

#### **Comercial/Leads**
**Archivo:** `src/app/comercial/page.tsx`
- ❌ Solo datos mock, sin API real ni persistencia en BD
- **Estado:** Módulo de UI sin funcionalidad real — bajo prioridad

---

### **TODOs Documentados:**

#### **Media Prioridad:**
1. **WhatsApp Audio Transcription**
   - Estado: Audios de WhatsApp recibidos no se transcriben (se ignoran)
   - Requiere: integración con Whisper API o similar

3. **Comercial/Leads API**
   - Crear tabla `leads` en BD
   - Implementar API routes
   - Impacto: Módulo completamente no funcional

#### **Media Prioridad:**
4. **WhatsApp Audio Transcription**
   - Archivo: `src/app/api/webhooks/whatsapp/route.ts` (línea 410)
   - Estado: `// TODO: Integrar con Whisper API para transcribir audios`
   - Impacto: Audios de WhatsApp no se transcriben

5. **User Profile Update API**
   - Archivo: `src/components/user-profile.tsx` (línea 120)
   - Estado: `// TODO: Implementar actualización de perfil vía API`
   - Impacto: No se puede actualizar perfil de usuario

#### **Baja Prioridad:**
6. **Timezone/Language en org config**
   - Archivo: `src/lib/config/organization-config.ts` (líneas 37-38)
   - Estado: `timezone: undefined, // TODO: Agregar timezone`
   - Impacto: Configuración opcional, no crítica

---

## 🏗️ ARQUITECTURA

### **Stack Tecnológico:**
- **Framework:** Next.js 15 (App Router)
- **Lenguaje:** TypeScript
- **Base de datos:** Supabase (PostgreSQL + RLS)
- **Autenticación:** Supabase Auth
- **Estilos:** Tailwind CSS
- **Componentes UI:** shadcn/ui
- **Estado:** React Context + Hooks
- **Formularios:** React Hook Form
- **Validación:** Zod

### **Estructura de Archivos:**
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes (REST endpoints)
│   ├── dashboard/         # Dashboard pages
│   ├── auth/              # Autenticación
│   └── [módulos]/         # Páginas de módulos
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn)
│   ├── layout/           # Layout components
│   └── [módulos]/        # Componentes específicos
├── lib/                   # Utilidades y helpers
│   ├── database/         # Queries a BD
│   ├── supabase/         # Clientes Supabase
│   ├── auth/             # Autenticación
│   └── utils/            # Utilidades generales
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript types
└── contexts/              # React Context providers
```

### **Patrones de Código:**

#### **API Routes:**
```typescript
// ✅ PATRÓN CORRECTO:
export async function GET(request: NextRequest) {
  // 1. Autenticación
  const supabase = createClientFromRequest(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // 2. Obtener organization_id
  const supabaseAdmin = getSupabaseServiceClient()
  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  
  if (!userProfile?.organization_id) {
    return NextResponse.json({ error: 'No se pudo obtener organización' }, { status: 403 })
  }
  
  // 3. Query con filtro multi-tenant
  const { data, error } = await supabaseAdmin
    .from('table_name')
    .select('*')
    .eq('organization_id', userProfile.organization_id)
  
  if (error) {
    return NextResponse.json({ error: 'Error en query' }, { status: 500 })
  }
  
  // 4. Retornar respuesta
  return NextResponse.json({ success: true, data })
}
```

#### **Database Queries:**
```typescript
// ✅ PATRÓN CORRECTO:
export async function getItems(organizationId: string) {
  const supabase = getSupabaseServiceClient()
  
  const { data, error } = await supabase
    .from('items')
    .select('id, name, organization_id, created_at') // ✅ Solo campos necesarios
    .eq('organization_id', organizationId) // ✅ SIEMPRE filtrar por org
    .limit(100) // ✅ SIEMPRE limitar
    
  if (error) throw error
  return data
}
```

#### **React Components:**
```typescript
// ✅ PATRÓN CORRECTO:
export function Component() {
  const { organizationId, ready } = useOrganization()
  const [loading, setLoading] = useState(true)
  const hasLoadedRef = useRef(false) // ✅ Prevenir ejecución múltiple
  
  useEffect(() => {
    if (hasLoadedRef.current || !ready || !organizationId) return
    hasLoadedRef.current = true
    
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, ready]) // ✅ Solo dependencias necesarias
  
  // ...
}
```

---

## 🔐 SEGURIDAD Y MULTI-TENANCY

### **Row Level Security (RLS):**
- ✅ 41 tablas con políticas RLS activas
- ✅ Patrón estándar: `organization_id IN (SELECT organization_id FROM users WHERE auth_user_id = auth.uid())`
- ✅ Políticas para: SELECT, INSERT, UPDATE, DELETE
- ✅ Validación de `workshop_id` opcional
- ✅ **Política especial en `users`:** Permite ver usuarios de la misma organización (migración 025)
  - Nombre: `"Users can view organization users"`
  - Permite: Ver propio perfil O usuarios de la misma organización
  - Función helper: `get_user_organization_id()` obtiene `organization_id` del usuario autenticado

**Tablas con RLS:**
- `customers`, `vehicles`, `work_orders`, `invoices`, `quotations`
- `payments`, `inventory`, `inventory_categories`, `inventory_movements`
- `suppliers`, `services`, `employees`, `appointments`
- `ai_agent_config`, `whatsapp_conversations`, `whatsapp_messages`
- `purchase_orders`, `users`, `organizations`, `workshops`
- Y 25+ tablas más...

### **Supabase Storage:**
- ✅ Bucket `work-order-documents` configurado para documentos de órdenes
- ✅ Políticas RLS: Lectura pública, subida/actualización/eliminación para usuarios autenticados
- ✅ Límite de tamaño: 50MB por archivo
- ✅ Tipos permitidos: PDF, imágenes (JPEG, PNG), Word, Excel, texto plano
- ✅ Path de archivos: `terms/{organizationId}/{timestamp}.{ext}`
- ✅ **IMPORTANTE:** Usar bucket `work-order-documents` (NO `documents`)

### **Autenticación:**
- ✅ Supabase Auth para autenticación
- ✅ Middleware para proteger rutas
- ✅ Session Context para estado global
- ✅ Headers de usuario en requests

### **Validación:**
- ✅ Validación de `organization_id` en todas las queries
- ✅ Validación de `workshop_id` opcional
- ✅ Validación de permisos por rol
- ✅ Rate limiting en API routes

---

## 📊 PERFORMANCE OPTIMIZATIONS

### **Mobile Performance (Fase 1 - Completada):**
- ✅ Polling WhatsApp: 70-95% reducción de requests
- ✅ Pausa en background: Ahorro de batería
- ✅ Skeleton loading: Sin parpadeos
- ✅ Refs para prevenir ejecuciones múltiples

**Métricas:**
- Mobile sin QR: 360 req/h (antes 1,200) = **-70%**
- Mobile con QR: 60 req/h (antes 1,200) = **-95%**
- Mobile conectado: 60 req/h (antes 1,200) = **-95%**

### **Queries Optimizadas:**
- ✅ Paginación en todas las listas
- ✅ Límites en queries (no `.select('*')` sin límite)
- ✅ Cache de queries (10 segundos)
- ✅ Retry logic para errores de red

### **Bundle Size:**
- ⚠️ Pendiente: Code splitting
- ⚠️ Pendiente: Lazy loading de componentes
- ⚠️ Pendiente: Optimización de imágenes

---

## 🐛 BUGS CONOCIDOS Y SOLUCIONES

### **Resueltos:**
1. ✅ **Work Orders RLS** - Mecánicos sin employee_id ahora ven todas las órdenes
2. ✅ **Vehicles RLS** - Creación de vehículos funciona con API endpoint
3. ✅ **WhatsApp Polling** - Optimizado para mobile (70-95% reducción)
4. ✅ **Reportes Parpadeo** - Skeleton loading con refs
5. ✅ **Infinite Loops** - Dependencias de useEffect optimizadas
6. ✅ **ReferenceError loadConversations** - Reemplazado con `mutate`
7. ✅ **ReferenceError formatRelativeTime** - Movido antes de uso
8. ✅ **500/401/404 en mensajes WhatsApp** - Validación mejorada
9. ✅ **Dropdown de Mecánicos Vacío** - Cambiado de `employees` a `users`, incluye MECANICO y ASESOR
10. ✅ **Política RLS Usuarios** - Agregada política para ver usuarios de la misma organización
11. ✅ **Asignación de Empleados** - `assigned_to` ahora apunta a `users.id` (migración 024)
12. ✅ **Mecánicos con workshop_id NULL** - Incluidos en dropdown cuando hay múltiples workshops
13. ✅ **Lista Muestra "Sin asignar"** - Corregido para usar tabla `users` con `full_name`
14. ✅ **Estadísticas con Órdenes Eliminadas** - Filtro `deleted_at IS NULL` agregado
15. ✅ **Upload PDF Términos** - Bucket corregido de `documents` a `work-order-documents`

### **Pendientes:**
1. ⚠️ **Purchase Orders** - Usa datos mock (no crítico)
2. ⚠️ **Comercial/Leads** - Usa datos mock (no crítico)
3. ⚠️ **Invitaciones Email** - No se envían emails (funcionalidad parcial)

---

## 📝 CONVENCIONES DE CÓDIGO

### **Naming:**
- Componentes: PascalCase (`WorkOrderCard.tsx`)
- Hooks: camelCase con prefijo 'use' (`useWorkOrders.ts`)
- Utilities: camelCase (`queries/orders.ts`)
- Types: PascalCase (`WorkOrder`, `OrderStatus`)
- Pages: lowercase routes (`app/ordenes/page.tsx`)

### **Imports:**
```typescript
// ✅ ORDEN CORRECTO:
// 1. React y Next.js
import { useState, useEffect } from 'react'
import { NextRequest, NextResponse } from 'next/server'

// 2. Librerías externas
import { toast } from 'sonner'

// 3. Componentes UI
import { Button } from '@/components/ui/button'

// 4. Componentes propios
import { WorkOrderCard } from '@/components/ordenes/WorkOrderCard'

// 5. Hooks
import { useWorkOrders } from '@/hooks/useWorkOrders'

// 6. Utils y types
import { formatDate } from '@/lib/utils/date'
import type { WorkOrder } from '@/types/orders'
```

### **Error Handling:**
```typescript
// ✅ PATRÓN CORRECTO:
try {
  const result = await operation()
  return NextResponse.json({ success: true, data: result })
} catch (error) {
  console.error('Error:', error)
  return NextResponse.json(
    { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
    { status: 500 }
  )
}
```

---

## 📦 MIGRACIONES IMPORTANTES

### **Migraciones Recientes (2026-01-06):**

#### **023_add_soft_delete_work_orders.sql**
- ✅ Agrega columna `deleted_at` a tabla `work_orders`
- ✅ Índices para performance: `idx_work_orders_deleted_at`, `idx_work_orders_org_not_deleted`
- ✅ Permite soft delete (marcar como eliminado sin borrar físicamente)
- ✅ Todas las queries deben filtrar `deleted_at IS NULL`

#### **024_change_assigned_to_to_users.sql**
- ✅ Cambia foreign key de `work_orders.assigned_to` de `employees.id` a `users.id`
- ✅ Limpia referencias inválidas antes de cambiar constraint
- ✅ Actualiza comentarios de documentación
- ✅ **IMPORTANTE:** `assigned_to` ahora debe apuntar a `users.id` con rol `MECANICO` o `ASESOR`

#### **025_add_users_organization_view_policy.sql**
- ✅ Crea función `get_user_organization_id()` para obtener `organization_id` del usuario autenticado
- ✅ Agrega política RLS `"Users can view organization users"` en tabla `users`
- ✅ Permite ver usuarios de la misma organización (necesario para dropdowns de asignación)
- ✅ **CRÍTICO:** Sin esta política, el dropdown de mecánicos/asesores queda vacío

### **Verificación de Migraciones:**
```sql
-- Verificar soft delete
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'work_orders' AND column_name = 'deleted_at';

-- Verificar foreign key de assigned_to
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'work_orders' 
  AND kcu.column_name = 'assigned_to';

-- Verificar política RLS de usuarios
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND policyname = 'Users can view organization users';
```

---

## 🚀 DEPLOYMENT

### **Variables de Entorno Críticas:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# WhatsApp
WAHA_API_URL=
WAHA_API_KEY=

# Auth
NEXT_PUBLIC_APP_URL=
```

### **Build:**
```bash
npm run build
npm start
```

### **Migraciones:**
- ✅ Migraciones en `supabase/migrations/`
- ✅ Ejecutar en orden cronológico
- ✅ Verificar RLS policies después de migraciones
- ✅ **IMPORTANTE:** Ejecutar migraciones 023, 024 y 025 en orden

### **Configuración de Storage:**
- ✅ Bucket `work-order-documents` debe existir (crear con `setup-work-order-documents.sql`)
- ✅ Bucket debe ser público (`public = true`)
- ✅ Límite de tamaño: 50MB
- ✅ Políticas RLS configuradas para usuarios autenticados
- ✅ **Verificar bucket existe:**
  ```sql
  SELECT id, name, public, file_size_limit, allowed_mime_types
  FROM storage.buckets
  WHERE id = 'work-order-documents';
  ```

---

## 📚 RECURSOS Y DOCUMENTACIÓN

### **Documentación Interna:**
- `docs/MOBILE_PERFORMANCE_ANALYSIS.md` - Análisis de performance mobile
- `docs/PROJECT_STATUS.md` - Estado del proyecto
- `docs/PLACEHOLDERS_CLEANUP_REPORT.md` - Reporte de placeholders
- `docs/Confia Drive_ERP_DEVELOPER_SKILL.md` - Guía de desarrollo (alternativa)
- `docs/DEVELOPER_GUIDE.md` - Esta guía

### **APIs Documentadas:**
- `src/app/api/README-api-routes.md` - Documentación de API routes
- Swagger: `/api/swagger.json`

---

## ⚠️ ADVERTENCIAS FINALES

### **ANTES DE HACER CAMBIOS:**
1. ✅ Leer esta documentación completa
2. ✅ Verificar que no afecta funcionalidades críticas
3. ✅ Probar en desarrollo antes de merge
4. ✅ Verificar RLS policies si tocas queries
5. ✅ Medir impacto en performance si cambias polling

### **SI ROMPES ALGO:**
1. 🔴 Revertir cambios inmediatamente
2. 🔴 Revisar logs de error
3. 🔴 Consultar esta documentación
4. 🔴 Verificar variables de entorno
5. 🔴 Revisar RLS policies si es error de permisos

---

## 📋 CHECKLIST ANTES DE COMMIT

- [ ] ¿Afecta WhatsApp polling? → Verificar intervalos
- [ ] ¿Afecta RLS? → Verificar políticas multi-tenant
- [ ] ¿Afecta autenticación? → Verificar middleware order
- [ ] ¿Afecta work orders? → Verificar lógica de employee_id
- [ ] ¿Afecta performance mobile? → Medir impacto
- [ ] ¿Agrega dependencias a useEffect? → Verificar necesidad
- [ ] ¿Modifica queries? → Verificar límites y filtros
- [ ] ¿Cambia estructura de datos? → Verificar migraciones

---

**Última revisión:** 2026-01-05  
**Mantenido por:** Confia Drive ERP Development Team  
**Versión del documento:** 1.0.0


