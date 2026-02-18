/**
 * Types para Purchase Orders Module
 * Eagles System - Tipos TypeScript para órdenes de compra
 */

export interface Supplier {
  id: string
  organization_id: string
  name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  tax_id?: string
  company_name?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  organization_id: string
  order_number: string
  supplier_id: string
  status: 'draft' | 'sent' | 'in_transit' | 'partial' | 'received' | 'cancelled'
  order_date: string
  expected_delivery_date?: string
  received_date?: string
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string
  payment_method?: string
  payment_status: 'pending' | 'partial' | 'paid'
  received_by?: string
  created_by?: string
  created_at: string
  updated_at: string
  
  // Relations (opcionales, se agregan con JOIN)
  supplier?: Supplier
  items?: PurchaseOrderItem[]
  created_by_user?: { id: string; email: string }
  received_by_user?: { id: string; email: string }
}

export interface PurchaseOrderItem {
  id: string
  organization_id: string
  purchase_order_id: string
  product_id: string // ✅ Solo referencia a inventory(id)
  quantity_ordered: number
  quantity_received: number
  unit_cost: number
  subtotal: number
  notes?: string
  created_at: string
  updated_at: string
  
  // Relations (opcionales, se agregan con JOIN)
  product?: {
    id: string
    name: string
    sku?: string
    current_stock: number
    unit_price?: number
  }
}

export interface CreateSupplierData {
  name: string
  company_name?: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  postal_code?: string
  country?: string
  tax_id?: string
  payment_terms?: string
  credit_limit?: number
  notes?: string
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {
  is_active?: boolean
}

export interface CreatePurchaseOrderData {
  supplier_id: string
  expected_delivery_date?: string
  notes?: string
  payment_method?: string
  items: Array<{
    product_id: string // ✅ ID de producto existente en inventory
    quantity_ordered: number
    unit_cost: number
    notes?: string
  }>
}

export interface UpdatePurchaseOrderData {
  expected_delivery_date?: string
  notes?: string
  payment_method?: string
  status?: PurchaseOrder['status']
}

export interface ReceiveOrderData {
  items: Array<{
    item_id: string // ID de purchase_order_items
    quantity_received: number
    notes?: string
  }>
  notes?: string
}

export interface PurchaseOrderStats {
  total_orders: number
  by_status: {
    draft: number
    sent: number
    in_transit: number
    partial: number
    received: number
    cancelled: number
  }
  total_amount: number
  pending_amount: number
  this_month: number
  pending_delivery: number
}
