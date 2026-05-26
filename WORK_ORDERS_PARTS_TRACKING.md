# Work Orders Parts/Refacciones Tracking Analysis

## Summary
The project **ALREADY HAS** a fully implemented system for tracking parts/refacciones (items) used in work orders. This is handled through the `order_items` table and integrated throughout the codebase.

---

## 1. Database Table Structure

### Table Name: `order_items`
**Location**: `supabase/migrations/002_add_new_features.sql`

### Exact Columns:
```sql
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id),
    inventory_id UUID REFERENCES public.inventory(id),
    item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product')),
    description TEXT NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    tax_percent DECIMAL(5,2) DEFAULT 16.00,  -- IVA México
    subtotal DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    total DECIMAL(10,2) DEFAULT 0.00,
    mechanic_id UUID REFERENCES public.employees(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Fields for Parts Tracking:
- **item_type**: Either `'service'` or `'product'` (products are parts/refacciones)
- **inventory_id**: Links to `inventory` table for actual parts/products
- **service_id**: Links to `services` table for service items
- **quantity**: How many units of the part were used
- **unit_price**: Cost per unit
- **total_price** → Calculated as: `quantity * unit_price` + tax/discount adjustments
- **mechanic_id**: Which mechanic used/installed the part
- **status**: Tracks if the part/service is pending/in_progress/completed
- **description**: Free-text description of what was used
- **tax_amount**, **subtotal**, **total**: Full pricing breakdown

---

## 2. API Routes for Items Management

### GET /api/work-orders/[id]/items
**File**: `src/app/api/work-orders/[id]/items/route.ts` (lines 72-94)

Returns all items (parts/services) for a work order with related data:
- Service details (name, category)
- Product/inventory details (code, name)  
- Assigned mechanic info

### POST /api/work-orders/[id]/items
**File**: `src/app/api/work-orders/[id]/items/route.ts` (lines 96-173)

Creates a new item with validation:
```typescript
// Required fields:
- item_type: 'service' | 'part' | 'labor'
- item_name: string
- quantity: number > 0
- unit_price: number >= 0

// Calculates automatically:
- total_price = quantity * unit_price
```

### GET /api/orders/[id]/items
**File**: `src/app/api/orders/[id]/items/route.ts` (lines 4-90)

Alternative endpoint (same functionality) that fetches items with:
- Service relations (id, name, category)
- Product relations from inventory (id, name, code)
- Mechanic relations (id, name)

### POST /api/orders/[id]/items
**File**: `src/app/api/orders/[id]/items/route.ts` (lines 92-220)

Creates items with full calculation of:
- Subtotal
- Discount amount (from discount_percent)
- Tax amount (IVA Mexico 16%)
- Total amount
- Automatically updates the parent work_order totals

---

## 3. TypeScript Types

### OrderItem Type
**File**: `src/lib/database/queries/work-orders.ts` (lines 39-49)

```typescript
export interface OrderItem {
  id: string;
  work_order_id: string;
  item_type: 'service' | 'part' | 'labor';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}
```

### CreateOrderItemData Type
**File**: `src/lib/database/queries/work-orders.ts` (lines 119-126)

```typescript
export interface CreateOrderItemData {
  work_order_id: string;
  item_type: 'service' | 'part' | 'labor';
  item_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
}
```

### WorkOrderItem Hook Type
**File**: `src/hooks/useWorkOrders.ts` (lines 18-28)

```typescript
export interface WorkOrderItem {
  id: string;
  work_order_id: string;
  item_type: 'service' | 'part';
  item_name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}
```

### WorkOrder Relation
**File**: `src/lib/database/queries/work-orders.ts` (line 81)

```typescript
order_items?: OrderItem[];  // Array of items in the work order
```

---

## 4. UI Components for Items Management

### WorkOrderItems Component
**File**: `src/components/work-orders/WorkOrderItems.tsx`

**Functionality**:
- Displays all items (parts/services) in a work order
- Add/Edit/Delete items with modal dialog
- Shows item type (service = wrench icon, product = package icon)
- Calculates and displays:
  - Quantity × Unit Price
  - Discount percentages and amounts
  - Tax (IVA)
  - Item total
  - Grand totals for all items
- Tracks item status: pending → in_progress → completed
- Assigns items to mechanics
- Read-only for mechanics (hide pricing if isMechanic)

**Key Features**:
```typescript
// Item form accepts:
interface OrderItem {
  item_type: 'service' | 'product'     // Part type
  service_id?: string                   // Link to service catalog
  inventory_id?: string                 // Link to parts/products
  description: string                   // Name/description
  quantity: number                      // How many units
  unit_price: number                    // Cost per unit
  discount_percent: number              // Discount %
  discount_amount: number               // Calculated discount
  tax_percent: number                   // IVA (default 16%)
  mechanic_id?: string                  // Assigned mechanic
  status: 'pending'|'in_progress'|'completed'
  notes?: string                        // Additional notes
}
```

### OrderItemsManager Component
**File**: `src/components/work-orders/OrderItemsManager.tsx` (partial)

Alternative simpler component for managing items with:
- Add/Edit/Delete functionality
- Item type selection (service/part)
- Inline form for quick item addition

---

## 5. Database Query Functions

### getOrderItemsByWorkOrder()
**File**: `src/lib/database/queries/work-orders.ts` (lines 822-845)

Fetches all items for a work order with service relations.

### createOrderItem()
**File**: `src/lib/database/queries/work-orders.ts` (lines 621-644)

Creates a new item and automatically recalculates work order totals.

### updateOrderItem()
**File**: `src/lib/database/queries/work-orders.ts` (lines 646-693)

Updates item quantity/price and recalculates totals.

### deleteOrderItem()
**File**: `src/lib/database/queries/work-orders.ts` (lines 695-718)

Deletes item and recalculates work order totals.

### recalculateWorkOrderTotals()
**File**: `src/lib/database/queries/work-orders.ts` (lines 724-759)

Core function that:
1. Sums all item subtotals
2. Calculates tax (16% IVA Mexico)
3. Applies discount
4. Updates work_order record with totals

---

## 6. Work Order UI Pages

### Main Work Orders Page
**Location**: `src/app/ordenes/page.tsx`

Displays list of all work orders with status.

### Work Order Details Page
**Location**: `src/app/ordenes/[id]/`

Shows detailed work order with:
- Customer and vehicle info
- Work order status
- **Items/Parts section** (using WorkOrderItems component)
- Images/documents
- Notes and history
- Services assigned

---

## 7. Database Relationships

```
work_orders (1) ──── (N) order_items
    │
    ├── customer_id → customers
    ├── vehicle_id → vehicles
    └── order_items[]:
        ├── service_id → services (optional)
        ├── inventory_id → inventory/products
        └── mechanic_id → employees
```

---

## 8. Total Calculation Flow

When an item is added/updated:

```
1. Item created with:
   - quantity
   - unit_price
   - discount_percent
   - tax_percent

2. Automatically calculated:
   - subtotal = quantity × unit_price
   - discount_amount = subtotal × (discount_percent / 100)
   - subtotal_after_discount = subtotal - discount_amount
   - tax_amount = subtotal_after_discount × (tax_percent / 100)
   - item_total = subtotal_after_discount + tax_amount

3. Work order totals recalculated:
   - order_subtotal = SUM(all items.subtotal)
   - order_tax_amount = SUM(all items.tax_amount)
   - order_discount_amount = SUM(all items.discount_amount)
   - order_total_amount = order_subtotal + order_tax_amount - order_discount_amount

4. Updated in work_orders table:
   - subtotal
   - tax_amount
   - discount_amount
   - total_amount
```

---

## 9. Current Status - FULLY IMPLEMENTED

**What exists**:
✅ Database table: `order_items`
✅ CRUD APIs: `/api/work-orders/[id]/items` and `/api/orders/[id]/items`
✅ UI components: `WorkOrderItems` with full CRUD functionality
✅ TypeScript types: `OrderItem`, `CreateOrderItemData`
✅ Auto-calculation of totals with tax/discount
✅ Mechanic assignment per item
✅ Item status tracking
✅ Service vs Product (part) distinction
✅ Integration with inventory system (inventory_id)
✅ Integration with services catalog (service_id)

**What can be enhanced**:
- Barcode scanning for quick part entry
- Batch operations (add multiple parts at once)
- Part templates/presets
- Part serial number tracking
- Warranty tracking per part
- Part return/RMA management
- Advanced reports on most-used parts

---

## 10. Code Entry Points for Development

If you need to:

### Add/Edit/Delete Parts:
→ Start at: `src/components/work-orders/WorkOrderItems.tsx`
→ API: `src/app/api/work-orders/[id]/items/route.ts`
→ DB: `src/lib/database/queries/work-orders.ts`

### Query Parts for a Work Order:
```typescript
const items = await getOrderItemsByWorkOrder(workOrderId);
```

### Create a Part/Item:
```typescript
await createOrderItem({
  work_order_id: 'xxx',
  item_type: 'part',
  item_name: 'Oil Filter',
  description: 'OEM Filter',
  quantity: 1,
  unit_price: 25.50
});
```

### View in Work Order:
→ Go to: `src/app/ordenes/[id]/` → Scroll to "Servicios y Productos" section

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Table Name** | `order_items` |
| **Key Columns** | order_id, item_type, inventory_id, quantity, unit_price, total, mechanic_id, status |
| **Item Types** | 'service' or 'product' (parts/refacciones are 'product') |
| **API Endpoints** | GET/POST `/api/work-orders/[id]/items` or `/api/orders/[id]/items` |
| **UI Component** | `WorkOrderItems.tsx` (full-featured), `OrderItemsManager.tsx` (simplified) |
| **Status Tracking** | pending → in_progress → completed |
| **Pricing** | Includes quantity, unit_price, discount%, tax%, automatic totals |
| **Mechanic Link** | Via mechanic_id field in order_items |
| **Inventory Link** | Via inventory_id for parts/products |
| **Auto-Calculate** | Yes - totals, taxes, discounts all calculated server-side |
