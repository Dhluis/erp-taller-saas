# 🔒 Revisión Crítica de Arquitectura de Datos - ERP Multi-Tenant

## 📋 Contexto

Sistema ERP multi-tenant (múltiples organizaciones) usando Next.js 15 + Supabase. Evaluación de **API Routes (Serverless)** vs **Queries Directas (SDK Supabase)** para maximizar seguridad e integridad de datos.

---

## 🎯 Casos de Uso Evaluados

### **Caso 1: Búsqueda Global (GlobalSearch Component)**

**Enfoque Actual:** ✅ **API Route** (`/api/search/global`)

**Implementación:**
```typescript
// src/hooks/useGlobalSearch.ts
const response = await fetch('/api/search/global?q=${query}')
```

**Evaluación:** ✅ **CORRECTO**

**Justificación:**
- ✅ **RLS Bypass Controlado**: La API route usa `supabaseAdmin` con validación explícita de `organization_id` del usuario autenticado
- ✅ **Lógica de Negocio Compleja**: Búsqueda multi-entidad (órdenes, clientes, vehículos, productos) con scoring de relevancia
- ✅ **Seguridad Multi-Tenant**: Filtrado garantizado por `organization_id` antes de retornar resultados
- ✅ **Performance**: Una sola query optimizada en servidor vs múltiples queries desde cliente

**Riesgo si fuera Direct Query:**
- ❌ RLS podría permitir fuga de datos si políticas están mal configuradas
- ❌ Lógica de scoring y relevancia expuesta en cliente
- ❌ Múltiples round-trips innecesarios

---

### **Caso 2: Crear Orden de Trabajo (CreateWorkOrderModal)**

**Enfoque Actual:** ✅ **API Route** (`POST /api/work-orders`)

**Implementación:**
```typescript
// src/components/ordenes/CreateWorkOrderModal.tsx
const response = await fetch('/api/work-orders', {
  method: 'POST',
  body: JSON.stringify(orderData)
})
```

**Evaluación:** ✅ **CORRECTO**

**Justificación:**
- ✅ **Operación de ESCRITURA**: Crítica para integridad de datos
- ✅ **Validación de Negocio**: La API valida `organization_id`, calcula totales, crea relaciones (cliente, vehículo)
- ✅ **Seguridad**: `organization_id` se obtiene del usuario autenticado, no del request body (previene spoofing)
- ✅ **Transaccionalidad**: Si falla creación de vehículo/cliente, la orden no se crea (lógica centralizada)

**Riesgo si fuera Direct Query:**
- ❌ Usuario podría modificar `organization_id` en el request
- ❌ Lógica de negocio (cálculo de totales, validaciones) expuesta en cliente
- ❌ Sin garantía de atomicidad en operaciones relacionadas

---

### **Caso 3: Notificaciones (notifications-client.ts)**

**Enfoque Actual:** ❌ **Queries Directas** (SDK Supabase con RLS)

**Implementación:**
```typescript
// src/lib/supabase/notifications-client.ts
const supabase = createClient()
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('organization_id', organizationId)
```

**Evaluación:** 🔄 **DEBE SER REEMPLAZADO**

**Justificación para Cambio:**
- ⚠️ **Dependencia de RLS**: Si las políticas RLS fallan o tienen bugs, hay riesgo de fuga de datos
- ⚠️ **Lógica de Negocio**: Filtrado por `organization_id` en cliente es redundante y no garantiza seguridad
- ✅ **Mejor Enfoque**: API route `/api/notifications` que:
  - Obtiene `organization_id` del usuario autenticado (no del cliente)
  - Usa `supabaseAdmin` con validación explícita
  - Centraliza lógica de marcado como leído, filtrado por tipo, etc.

**Riesgo Actual:**
- ❌ Si RLS tiene bug, usuario podría ver notificaciones de otras organizaciones
- ❌ Lógica de negocio (marcar como leído, filtros) dispersa en cliente

---

### **Caso 4: Lectura de Clientes (useCustomers Hook)**

**Enfoque Actual:** ✅ **API Route** (`/api/customers`)

**Implementación:**
```typescript
// src/hooks/useCustomers.ts
const result = await safeFetch<CustomersResponse>(`/api/customers?_t=${Date.now()}`)
```

**Evaluación:** ✅ **CORRECTO**

**Justificación:**
- ✅ **Datos Sensibles Multi-Tenant**: Información de clientes es crítica
- ✅ **Validación Explícita**: API route valida `organization_id` del usuario autenticado antes de filtrar
- ✅ **Consistencia**: Mismo patrón que otras operaciones sensibles
- ✅ **Cache Control**: Timestamp en query string permite invalidación controlada

**Riesgo si fuera Direct Query:**
- ❌ Dependencia total de RLS para seguridad
- ❌ Si RLS falla, fuga masiva de datos de clientes entre organizaciones

---

### **Caso 5: Estadísticas del Dashboard (Dashboard Stats)**

**Enfoque Actual:** ✅ **API Route** (`/api/orders/stats`)

**Implementación:**
```typescript
// src/app/dashboard/page.tsx
const response = await fetch(`/api/orders/stats?timeFilter=${dateRange}`)
```

**Evaluación:** ✅ **CORRECTO**

**Justificación:**
- ✅ **Lógica de Negocio Compleja**: Agregaciones, filtros por fecha, cálculos de ingresos
- ✅ **Multi-Tenancy Crítico**: Estadísticas deben ser 100% aisladas por organización
- ✅ **Performance**: Agregaciones en servidor (PostgreSQL) son más eficientes
- ✅ **Validación de Fechas**: Lógica de rangos de fecha centralizada y validada

**Riesgo si fuera Direct Query:**
- ❌ Cálculos complejos en cliente (ineficiente)
- ❌ Riesgo de manipulación de filtros de fecha
- ❌ Dependencia de RLS para aislamiento de datos

---

### **Caso 6: Lectura de Inventario (Inventory List)**

**Enfoque Actual:** ✅ **API Route** (`/api/inventory`)

**Implementación:**
```typescript
// Verificado en código: usa /api/inventory
```

**Evaluación:** ✅ **CORRECTO**

**Justificación:**
- ✅ **Datos Sensibles**: Información de inventario es crítica para negocio
- ✅ **Lógica de Negocio**: Cálculo de `low_stock`, filtros por categoría, búsqueda
- ✅ **Multi-Tenancy**: Cada organización debe ver solo su inventario
- ✅ **Validación Explícita**: API route garantiza filtrado por `organization_id`

**Riesgo si fuera Direct Query:**
- ❌ Si RLS falla, organización A podría ver inventario de organización B
- ❌ Lógica de `low_stock` expuesta y manipulable en cliente

---

## 🔐 Respuesta a Pregunta Específica

### **¿Por qué usar JWT del usuario (en API Route) en lugar de Service Role Key para ESCRITURAS en multi-tenant?**

**Respuesta Técnica:**

#### **1. Principio de Menor Privilegio (Least Privilege)**

```typescript
// ❌ MAL: Service Role Key en cliente
const supabaseAdmin = getSupabaseServiceClient() // Clave de servicio
await supabaseAdmin.from('work_orders').insert(data) // Sin validación de usuario

// ✅ BIEN: JWT del usuario en API Route
const supabase = createClientFromRequest(request) // JWT del usuario
const { data: { user } } = await supabase.auth.getUser() // Usuario autenticado
const organizationId = await getUserOrganizationId(user.id) // Validación explícita
await supabaseAdmin.from('work_orders').insert({
  ...data,
  organization_id: organizationId // Garantizado por servidor
})
```

**Razón:** El Service Role Key **bypasa TODAS las políticas RLS**. Si se usa directamente en cliente:
- ❌ No hay forma de saber QUÉ usuario hizo la operación
- ❌ No hay forma de validar que el `organization_id` es correcto
- ❌ Cualquier usuario autenticado podría modificar datos de cualquier organización

#### **2. Auditoría y Trazabilidad**

```typescript
// ✅ Con JWT del usuario
const { data: { user } } = await supabase.auth.getUser()
console.log(`Usuario ${user.id} creó orden en organización ${organizationId}`)

// ❌ Con Service Role Key directo
// No hay forma de saber quién hizo qué
```

**Razón:** En sistemas multi-tenant, necesitas saber:
- ¿Quién hizo la operación?
- ¿A qué organización pertenece?
- ¿Cuándo se hizo?

El JWT del usuario proporciona esta información de forma confiable.

#### **3. Validación de Contexto**

```typescript
// ✅ Patrón Correcto (API Route con JWT)
export async function POST(request: NextRequest) {
  // 1. Obtener usuario del JWT
  const supabase = createClientFromRequest(request)
  const { data: { user } } = await supabase.auth.getUser()
  
  // 2. Validar que usuario existe y está autenticado
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  
  // 3. Obtener organization_id del perfil (validación explícita)
  const supabaseAdmin = getSupabaseServiceClient()
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('organization_id')
    .eq('auth_user_id', user.id)
    .single()
  
  // 4. Usar Service Role Key SOLO para la operación, con organization_id validado
  await supabaseAdmin.from('work_orders').insert({
    ...body,
    organization_id: profile.organization_id // ✅ Garantizado por servidor
  })
}
```

**Razón:** El Service Role Key se usa **DESPUÉS** de validar el contexto del usuario. Esto garantiza:
- ✅ El `organization_id` viene del perfil del usuario, no del request body
- ✅ No hay posibilidad de spoofing de `organization_id`
- ✅ La operación es trazable al usuario correcto

#### **4. Prevención de Ataques de Manipulación**

```typescript
// ❌ Si Service Role Key se usa directamente en cliente
// Usuario malicioso podría hacer:
fetch('/api/work-orders', {
  method: 'POST',
  body: JSON.stringify({
    organization_id: 'otra-organizacion-id', // ⚠️ SPOOFING
    // ... otros datos
  })
})

// ✅ Con validación de JWT en servidor
// El servidor IGNORA el organization_id del body y usa el del usuario:
const organizationId = userProfile.organization_id // ✅ Del perfil, no del body
```

**Razón:** El JWT del usuario es **cryptográficamente firmado** y no puede ser falsificado. El servidor puede confiar en él para determinar la organización correcta.

---

## 📊 Resumen de Evaluación

| Caso de Uso | Enfoque Actual | Evaluación | Acción Requerida |
|-------------|----------------|------------|------------------|
| 1. Búsqueda Global | ✅ API Route | ✅ CORRECTO | Ninguna |
| 2. Crear Orden | ✅ API Route | ✅ CORRECTO | Ninguna |
| 3. Notificaciones | ❌ Direct Query | 🔄 REEMPLAZAR | Migrar a API Route |
| 4. Lectura Clientes | ✅ API Route | ✅ CORRECTO | Ninguna |
| 5. Dashboard Stats | ✅ API Route | ✅ CORRECTO | Ninguna |
| 6. Inventario | ✅ API Route | ✅ CORRECTO | Ninguna |

---

## 🎯 Recomendaciones Finales

### **Principio General:**

**✅ USAR API ROUTES cuando:**
- Operaciones de **ESCRITURA** (CREATE, UPDATE, DELETE)
- Datos **sensibles multi-tenant**
- Lógica de **negocio compleja**
- Necesidad de **validación explícita** de `organization_id`
- Operaciones **transaccionales**

**✅ USAR QUERIES DIRECTAS cuando:**
- Datos **públicos/no sensibles**
- Operaciones de **solo lectura** con RLS perfectamente configurado
- **Performance crítica** (con precaución)
- Datos que **no requieren lógica de negocio**

### **Patrón Recomendado para API Routes:**

```typescript
// 1. Autenticación con JWT del usuario
const supabase = createClientFromRequest(request)
const { data: { user } } = await supabase.auth.getUser()

// 2. Validación explícita de organización
const supabaseAdmin = getSupabaseServiceClient()
const { data: profile } = await supabaseAdmin
  .from('users')
  .select('organization_id')
  .eq('auth_user_id', user.id)
  .single()

// 3. Usar Service Role Key SOLO para operación, con organization_id validado
await supabaseAdmin.from('table').insert({
  ...data,
  organization_id: profile.organization_id // ✅ Del perfil, nunca del body
})
```

---

## 🔒 Conclusión

Tu arquitectura actual es **mayoritariamente correcta** (5/6 casos). El único caso que requiere migración es **Notificaciones**, que actualmente usa queries directas con dependencia de RLS.

**La combinación de JWT del usuario + Service Role Key en servidor es el patrón correcto** porque:
1. ✅ Garantiza trazabilidad (sabes quién hizo qué)
2. ✅ Previene spoofing de `organization_id`
3. ✅ Permite validación explícita antes de operaciones críticas
4. ✅ Mantiene principio de menor privilegio (Service Role Key solo en servidor)

