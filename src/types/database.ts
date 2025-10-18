// ✅ CORRECTO: Tipos centralizados para toda la aplicación

/**
 * TIPOS DE CLIENTES
 */
export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  vehicles?: Vehicle[];
  total_spent?: number;
  last_order_date?: string;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  id: string;
}

/**
 * TIPOS DE VEHÍCULOS
 */
export interface Vehicle {
  id: string;
  organization_id: string;
  customer_id: string;
  brand: string;
  model: string;
  year: number;
  vin?: string;
  license_plate?: string;
  color?: string;
  mileage?: number;
  created_at: string;
  updated_at: string;
  // Relaciones
  customer?: Customer;
  customer_name?: string;
  last_service_date?: string;
}

export interface CreateVehicleData {
  customer_id: string;
  brand: string;
  model: string;
  year: number;
  vin?: string;
  license_plate?: string;
  color?: string;
  mileage?: number;
}

export interface UpdateVehicleData extends Partial<CreateVehicleData> {
  id: string;
}

/**
 * TIPOS DE INVENTARIO
 */
export interface InventoryCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  organization_id: string;
  category_id: string;
  name: string;
  description?: string;
  sku: string;
  quantity: number;
  minimum_stock: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
  // Relación con categoría
  category?: InventoryCategory;
}

export interface CreateInventoryItemData {
  category_id: string;
  name: string;
  description?: string;
  sku: string;
  quantity: number;
  minimum_stock: number;
  unit_price: number;
}

export interface UpdateInventoryItemData extends Partial<CreateInventoryItemData> {
  id: string;
}

export interface InventoryMovement {
  id: string;
  organization_id: string;
  inventory_id: string;
  movement_type: 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  reason: string;
  reference?: string;
  created_at: string;
  // Relación con item
  inventory_item?: {
    name: string;
    sku: string;
  };
}

export interface CreateInventoryMovementData {
  inventory_id: string;
  movement_type: 'entrada' | 'salida' | 'ajuste';
  quantity: number;
  reason: string;
  reference?: string;
}

/**
 * TIPOS DE ÓRDENES DE TRABAJO
 */
export interface WorkOrder {
  id: string;
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  order_number: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimated_hours?: number;
  actual_hours?: number;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  created_at: string;
  updated_at: string;
  // Relaciones
  customer?: Customer;
  vehicle?: Vehicle;
  customer_name?: string;
  vehicle_info?: string;
}

export interface CreateWorkOrderData {
  customer_id: string;
  vehicle_id: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  estimated_hours?: number;
}

export interface UpdateWorkOrderData extends Partial<CreateWorkOrderData> {
  id: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  actual_hours?: number;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
}

/**
 * TIPOS DE COTIZACIONES
 */
export interface Quotation {
  id: string;
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  quotation_number: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  issue_date: string;
  expiry_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  customer?: Customer;
  vehicle?: Vehicle;
  items?: QuotationItem[];
  customer_name?: string;
  vehicle_info?: string;
}

export interface QuotationItem {
  id: string;
  quotation_id: string;
  item_type: 'service' | 'part';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CreateQuotationData {
  customer_id: string;
  vehicle_id: string;
  issue_date: string;
  expiry_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
}

export interface UpdateQuotationData extends Partial<CreateQuotationData> {
  id: string;
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
}

/**
 * TIPOS DE FACTURAS
 */
export interface SalesInvoice {
  id: string;
  organization_id: string;
  customer_id: string;
  vehicle_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  balance: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  customer?: Customer;
  vehicle?: Vehicle;
  items?: InvoiceItem[];
  payments?: Payment[];
  customer_name?: string;
  vehicle_info?: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'part';
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface CreateInvoiceData {
  customer_id: string;
  vehicle_id: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  notes?: string;
}

export interface UpdateInvoiceData extends Partial<CreateInvoiceData> {
  id: string;
  status?: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paid_amount?: number;
  balance?: number;
}

/**
 * TIPOS DE PAGOS
 */
export interface Payment {
  id: string;
  organization_id: string;
  invoice_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'check';
  payment_date: string;
  reference?: string;
  notes?: string;
  created_at: string;
  // Relación con factura
  invoice?: {
    invoice_number: string;
    customer_name: string;
  };
}

export interface CreatePaymentData {
  invoice_id: string;
  amount: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'check';
  payment_date: string;
  reference?: string;
  notes?: string;
}

/**
 * TIPOS DE GARANTÍAS
 */
export interface Warranty {
  id: string;
  organization_id: string;
  work_order_id: string;
  customer_id: string;
  vehicle_id: string;
  warranty_number: string;
  item_type: 'service' | 'part';
  item_description: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'claimed' | 'void';
  terms: string;
  conditions: string;
  coverage_details: string;
  original_amount: number;
  created_at: string;
  updated_at: string;
  // Relaciones
  customer?: Customer;
  vehicle?: Vehicle;
  work_order?: WorkOrder;
  claims?: WarrantyClaim[];
  customer_name?: string;
  vehicle_info?: string;
}

export interface WarrantyClaim {
  id: string;
  organization_id: string;
  warranty_id: string;
  work_order_id: string;
  claim_number: string;
  claim_date: string;
  description: string;
  reported_issue: string;
  diagnosis?: string;
  root_cause?: string;
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  resolution_type?: 'repair' | 'replacement' | 'refund';
  resolution_description?: string;
  resolution_date?: string;
  labor_cost?: number;
  parts_cost?: number;
  total_cost?: number;
  is_valid: boolean;
  rejection_reason?: string;
  responsible_party?: string;
  created_at: string;
  updated_at: string;
}

export interface WarrantyPolicy {
  id: string;
  organization_id: string;
  policy_name: string;
  policy_code: string;
  applies_to: 'service' | 'part' | 'both';
  default_days: number;
  service_categories?: string[];
  part_categories?: string[];
  standard_terms: string;
  standard_conditions: string;
  coverage_details: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * TIPOS DE USUARIOS Y ROLES
 */
export interface User {
  id: string;
  organization_id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  employee_number?: string;
  position?: string;
  department?: string;
  hire_date?: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Relaciones
  roles?: Role[];
}

export interface Role {
  id: string;
  organization_id: string;
  role_name: string;
  role_code: string;
  description?: string;
  access_level: number;
  is_system_role: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relaciones
  permissions?: Permission[];
}

export interface Permission {
  id: string;
  permission_name: string;
  permission_code: string;
  description?: string;
  category: string;
  action: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  description: string;
  changes?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * TIPOS DE CONFIGURACIÓN
 */
export interface SystemSettings {
  id: string;
  organization_id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  business_city: string;
  business_state: string;
  business_zip: string;
  business_country: string;
  tax_id: string;
  currency: string;
  timezone: string;
  language: string;
  logo_url?: string;
  business_hours: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: 'light' | 'dark' | 'system';
  sidebar_collapsed: boolean;
  dashboard_layout: Record<string, any>;
  notification_preferences: Record<string, any>;
  default_page: string;
  items_per_page: number;
  created_at: string;
  updated_at: string;
}

/**
 * TIPOS DE REPORTES
 */
export interface SalesReport {
  period: string;
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  growth_rate: number;
}

export interface InventoryReport {
  total_items: number;
  total_value: number;
  low_stock_items: number;
  out_of_stock_items: number;
  top_categories: Array<{
    category: string;
    count: number;
    value: number;
  }>;
}

export interface WorkOrderReport {
  total_orders: number;
  completed_orders: number;
  pending_orders: number;
  average_completion_time: number;
  efficiency_score: number;
}

/**
 * TIPOS DE RESPUESTAS DE API
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface APIError {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  details?: any;
}

/**
 * TIPOS DE FILTROS Y BÚSQUEDA
 */
export interface SearchFilters {
  search?: string;
  category?: string;
  status?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * TIPOS DE ESTADÍSTICAS
 */
export interface DashboardStats {
  total_customers: number;
  total_vehicles: number;
  total_orders: number;
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  low_stock_items: number;
  recent_activity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

