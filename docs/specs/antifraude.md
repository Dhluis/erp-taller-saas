# Spec: Sistema Antifraude

**Última actualización:** Mayo 2026
**Migraciones relacionadas:** `supabase/migrations/053_anti_fraud_controls.sql`, `20260519120000_anti_fraud_controls.sql`

---

## Propósito

Detectar patrones anómalos en operaciones del taller para alertar a administradores sobre posibles fraudes internos o errores de registro.

---

## Módulos de Detección

### 1. Detección en Inventario

**Qué hace hoy (AI agent, consulta bajo demanda):**
- `getInventoryMarginsTool()` en `src/lib/agent/erp-tools.ts` — compara `unit_price` vs `purchase_price`
- Devuelve: `items_with_margin`, `avg_margin_pct`, `low_margin_items`, `high_margin_items`, `no_cost_items`
- Expuesto como herramienta #23 en `src/app/api/agent/query/route.ts` (líneas 701-709)

**Columna clave:** `inventory.quantity` (no `current_stock`) y `inventory.min_quantity` (no `min_stock`)

**Implementación:** `src/lib/agent/erp-tools.ts` + `src/app/api/ai-assistant/route.ts` (línea 412)

### 2. Detección en Recetas de Servicio

**Disparadores de alerta:**
- Paquetes de servicio con costo inusualmente alto vs. precio de venta
- Items de orden que no corresponden al servicio declarado
- Servicios completados sin consumo de inventario esperado

**Implementación:** `src/app/api/service-packages/route.ts` + `WorkOrderServices.tsx`

### 3. Alertas en Dashboard

**Estado actual:** No hay alertas automáticas en el dashboard. La detección es 100% bajo demanda vía el chat del asistente AI.
**Idea futura (sin fecha ni dueño):** Panel de anomalías en dashboard para admins (`role = 'admin'`). No está en roadmap activo — si se decide implementar, priorizar antes de activar.

---

## Tablas BD

No existe tabla `fraud_alerts`. La detección es 100% por consulta (pull), no por alertas persistentes.

Tablas que participan del sistema antifraude:
- `inventory` — columna `purchase_price` para calcular márgenes
- `cash_advances` — anticipos a empleados/proveedores (mig 053)
- `purchase_orders` — campos `approved_by`, `approved_at`, `rejected_by`, `rejection_note`, `estimated_amount` (mig 053)
- `expenses` — columnas `advance_id`, `receipt_image_url` (mig 053)
- `service_packages` — columna `labor_cost` (mig 20260519140000)

---

## AI Agent Integration

El agente ERP (`src/lib/agent/erp-tools.ts`) incluye herramientas de análisis antifraude que pueden ser consultadas via chat del asistente AI.

---

## Escáner de Tickets con IA (Mayo 2026)

### Propósito
Detectar cifras reales de refacciones usando fotos de tickets/notas. Solo para plan Premium/Trial.

### Flujo
1. Staff sube foto de un ticket de refacciones en la OT → botón "Escanear Ticket"
2. API llama OpenAI GPT-4o vision → extrae lista de partes con cantidad y precio
3. Usuario revisa y confirma → partes se agregan automáticamente a `order_items`
4. Foto queda guardada en `work_orders.documents` (categoría `receipt`)

### Archivos
- `src/app/api/work-orders/[id]/analyze-receipt/route.ts` — API route (POST)
- `src/components/work-orders/ReceiptAnalyzer.tsx` — componente React
- `src/components/work-orders/WorkOrderItems.tsx` — integra el botón

### Gate de plan
- Server: `checkAIAgentEnabled(organizationId)` → 403 si plan free
- Client: `useBilling().canUseAI` → oculta el botón en plan free

---

## Notas de Implementación

- Sistema agregado en Mayo 2026 (commits `a3c3d659`, `da0b8897`)
- `purchase_price` en `inventory` (migración `20260519130000`) es necesario para calcular márgenes y detectar anomalías
- `labor_cost` en `service_packages` (migración `20260519140000`) usado para análisis de rentabilidad
