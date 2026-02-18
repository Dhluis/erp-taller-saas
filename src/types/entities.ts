/**
 * Tipos Específicos por Entidad
 * Define interfaces específicas para cada entidad del sistema
 */

import { 
  BaseEntity, 
  BaseCreateData, 
  BaseUpdateData,
  EntityStatus,
  EntityPriority,
  PaymentMethod,
  PaymentStatus,
  OrderStatus,
  QuotationStatus,
  InvoiceStatus,
  ItemType,
  NotificationType,
  CampaignType,
  CampaignStatus,
  AppointmentStatus,
  LeadStatus,
  ContactData,
  LocationData,
  CurrencyData,
  DateData
} from './base'

/**
 * CLIENTES
 */
export interface Customer extends BaseEntity {
  name: string
  email?: string
  phone?: string
  address?: LocationData
  rfc?: string
  status: EntityStatus
  notes?: string
  total_orders?: number
  total_spent?: number
  last_order_date?: string
}

export interface CreateCustomerData extends BaseCreateData {
  name: string
  email?: string
  phone?: string
  address?: LocationData
  rfc?: string
  status?: EntityStatus
  notes?: string
}

export interface UpdateCustomerData extends BaseUpdateData {
  name?: string
  email?: string
  phone?: string
  address?: LocationData
  rfc?: string
  status?: EntityStatus
  notes?: string
}

/**
 * VEHÍCULOS
 */
export interface Vehicle extends BaseEntity {
  customer_id: string
  brand: string
  model: string
  year?: number
  license_plate?: string
  vin?: string
  color?: string
  mileage?: number
  status: EntityStatus
  notes?: string
  customer?: Customer
}

export interface CreateVehicleData extends BaseCreateData {
  customer_id: string
  brand: string
  model: string
  year?: number
  license_plate?: string
  vin?: string
  color?: string
  mileage?: number
  status?: EntityStatus
  notes?: string
}

export interface UpdateVehicleData extends BaseUpdateData {
  customer_id?: string
  brand?: string
  model?: string
  year?: number
  license_plate?: string
  vin?: string
  color?: string
  mileage?: number
  status?: EntityStatus
  notes?: string
}

/**
 * PROVEEDORES
 */
export interface Supplier extends BaseEntity {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: LocationData
  status: EntityStatus
  notes?: string
  total_orders?: number
  total_spent?: number
  last_order_date?: string
}

export interface CreateSupplierData extends BaseCreateData {
  name: string
  contact_person?: string
  email?: string
  phone?: string
  address?: LocationData
  status?: EntityStatus
  notes?: string
}

export interface UpdateSupplierData extends BaseUpdateData {
  name?: string
  contact_person?: string
  email?: string
  phone?: string
  address?: LocationData
  status?: EntityStatus
  notes?: string
}

/**
 * INVENTARIO
 */
export interface InventoryItem extends BaseEntity {
  code: string
  name: string
  description?: string
  quantity: number
  min_quantity: number
  unit_price: number
  category: string
  status: EntityStatus
  notes?: string
  total_value?: number
  last_movement_date?: string
}

export interface CreateInventoryItemData extends BaseCreateData {
  code: string
  name: string
  description?: string
  quantity: number
  min_quantity: number
  unit_price: number
  category: string
  status?: EntityStatus
  notes?: string
}

export interface UpdateInventoryItemData extends BaseUpdateData {
  code?: string
  name?: string
  description?: string
  quantity?: number
  min_quantity?: number
  unit_price?: number
  category?: string
  status?: EntityStatus
  notes?: string
}

/**
 * MOVIMIENTOS DE INVENTARIO
 */
export interface InventoryMovement extends BaseEntity {
  product_id: string
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number
  reference_type: string
  reference_id?: string
  notes?: string
  user_id?: string
  product?: InventoryItem
}

export interface CreateInventoryMovementData extends BaseCreateData {
  product_id: string
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number
  reference_type: string
  reference_id?: string
  notes?: string
  user_id?: string
}

export interface UpdateInventoryMovementData extends BaseUpdateData {
  product_id?: string
  movement_type?: 'in' | 'out' | 'adjustment'
  quantity?: number
  reference_type?: string
  reference_id?: string
  notes?: string
  user_id?: string
}

/**
 * ÓRDENES DE TRABAJO
 */
export interface WorkOrder extends BaseEntity {
  order_number: string
  customer_id: string
  vehicle_id?: string
  status: OrderStatus
  priority: EntityPriority
  estimated_hours?: number
  actual_hours?: number
  total_cost: number
  notes?: string
  customer?: Customer
  vehicle?: Vehicle
  items?: OrderItem[]
}

export interface CreateWorkOrderData extends BaseCreateData {
  order_number: string
  customer_id: string
  vehicle_id?: string
  status?: OrderStatus
  priority?: EntityPriority
  estimated_hours?: number
  actual_hours?: number
  total_cost?: number
  notes?: string
}

export interface UpdateWorkOrderData extends BaseUpdateData {
  order_number?: string
  customer_id?: string
  vehicle_id?: string
  status?: OrderStatus
  priority?: EntityPriority
  estimated_hours?: number
  actual_hours?: number
  total_cost?: number
  notes?: string
}

/**
 * ITEMS DE ÓRDENES
 */
export interface OrderItem extends BaseEntity {
  order_id: string
  item_type: ItemType
  item_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
}

export interface CreateOrderItemData extends BaseCreateData {
  order_id: string
  item_type: ItemType
  item_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
}

export interface UpdateOrderItemData extends BaseUpdateData {
  order_id?: string
  item_type?: ItemType
  item_id?: string
  description?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  notes?: string
}

/**
 * COTIZACIONES
 */
export interface Quotation extends BaseEntity {
  quotation_number: string
  client_id: string
  vehicle_id?: string
  status: QuotationStatus
  valid_until?: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  converted_to_order: boolean
  notes?: string
  client?: Customer
  vehicle?: Vehicle
  items?: QuotationItem[]
}

export interface CreateQuotationData extends BaseCreateData {
  quotation_number: string
  client_id: string
  vehicle_id?: string
  status?: QuotationStatus
  valid_until?: string
  subtotal?: number
  discount_amount?: number
  tax_amount?: number
  total_amount?: number
  converted_to_order?: boolean
  notes?: string
}

export interface UpdateQuotationData extends BaseUpdateData {
  quotation_number?: string
  client_id?: string
  vehicle_id?: string
  status?: QuotationStatus
  valid_until?: string
  subtotal?: number
  discount_amount?: number
  tax_amount?: number
  total_amount?: number
  converted_to_order?: boolean
  notes?: string
}

/**
 * ITEMS DE COTIZACIONES
 */
export interface QuotationItem extends BaseEntity {
  quotation_id: string
  item_type: ItemType
  item_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
}

export interface CreateQuotationItemData extends BaseCreateData {
  quotation_id: string
  item_type: ItemType
  item_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
}

export interface UpdateQuotationItemData extends BaseUpdateData {
  quotation_id?: string
  item_type?: ItemType
  item_id?: string
  description?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  notes?: string
}

/**
 * FACTURAS
 */
export interface Invoice extends BaseEntity {
  invoice_number: string
  customer_name: string
  customer_rfc: string
  vehicle_info: string
  service_description: string
  status: InvoiceStatus
  subtotal: number
  tax_amount: number
  total_amount: number
  due_date: string
  paid_date?: string
  payment_method?: PaymentMethod
  notes?: string
  items?: InvoiceItem[]
}

export interface CreateInvoiceData extends BaseCreateData {
  invoice_number: string
  customer_name: string
  customer_rfc: string
  vehicle_info: string
  service_description: string
  status?: InvoiceStatus
  subtotal?: number
  tax_amount?: number
  total_amount?: number
  due_date: string
  paid_date?: string
  payment_method?: PaymentMethod
  notes?: string
}

export interface UpdateInvoiceData extends BaseUpdateData {
  invoice_number?: string
  customer_name?: string
  customer_rfc?: string
  vehicle_info?: string
  service_description?: string
  status?: InvoiceStatus
  subtotal?: number
  tax_amount?: number
  total_amount?: number
  due_date?: string
  paid_date?: string
  payment_method?: PaymentMethod
  notes?: string
}

/**
 * ITEMS DE FACTURAS
 */
export interface InvoiceItem extends BaseEntity {
  invoice_id: string
  item_type: ItemType
  item_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
}

export interface CreateInvoiceItemData extends BaseCreateData {
  invoice_id: string
  item_type: ItemType
  item_id?: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  notes?: string
}

export interface UpdateInvoiceItemData extends BaseUpdateData {
  invoice_id?: string
  item_type?: ItemType
  item_id?: string
  description?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  notes?: string
}

/**
 * COBROS
 */
export interface Collection extends BaseEntity {
  client_id: string
  invoice_id: string
  amount: number
  collection_date: string
  payment_method: PaymentMethod
  reference?: string
  status: PaymentStatus
  notes?: string
}

export interface CreateCollectionData extends BaseCreateData {
  client_id: string
  invoice_id: string
  amount: number
  collection_date: string
  payment_method: PaymentMethod
  reference?: string
  status?: PaymentStatus
  notes?: string
}

export interface UpdateCollectionData extends BaseUpdateData {
  client_id?: string
  invoice_id?: string
  amount?: number
  collection_date?: string
  payment_method?: PaymentMethod
  reference?: string
  status?: PaymentStatus
  notes?: string
}

/**
 * PAGOS A PROVEEDORES
 */
export interface Payment extends BaseEntity {
  supplier_id: string
  invoice_number: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  reference?: string
  status: PaymentStatus
  notes?: string
  supplier?: Supplier
}

export interface CreatePaymentData extends BaseCreateData {
  supplier_id: string
  invoice_number: string
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  reference?: string
  status?: PaymentStatus
  notes?: string
}

export interface UpdatePaymentData extends BaseUpdateData {
  supplier_id?: string
  invoice_number?: string
  amount?: number
  payment_date?: string
  payment_method?: PaymentMethod
  reference?: string
  status?: PaymentStatus
  notes?: string
}

/**
 * ÓRDENES DE COMPRA
 */
export interface PurchaseOrder extends BaseEntity {
  supplier_id: string
  order_number: string
  order_date: string
  expected_delivery_date?: string
  status: OrderStatus
  subtotal: number
  tax_amount: number
  total_amount: number
  notes?: string
  supplier?: Supplier
}

export interface CreatePurchaseOrderData extends BaseCreateData {
  supplier_id: string
  order_number: string
  order_date: string
  expected_delivery_date?: string
  status?: OrderStatus
  subtotal?: number
  tax_amount?: number
  total_amount?: number
  notes?: string
}

export interface UpdatePurchaseOrderData extends BaseUpdateData {
  supplier_id?: string
  order_number?: string
  order_date?: string
  expected_delivery_date?: string
  status?: OrderStatus
  subtotal?: number
  tax_amount?: number
  total?: number
  notes?: string
}

/**
 * CITAS
 */
export interface Appointment extends BaseEntity {
  customer_name: string
  customer_phone: string
  customer_email?: string
  vehicle_info: string
  service_type: string
  appointment_date: string
  appointment_time: string
  status: AppointmentStatus
  notes?: string
  estimated_duration: number
}

export interface CreateAppointmentData extends BaseCreateData {
  customer_name: string
  customer_phone: string
  customer_email?: string
  vehicle_info: string
  service_type: string
  appointment_date: string
  appointment_time: string
  status?: AppointmentStatus
  notes?: string
  estimated_duration?: number
}

export interface UpdateAppointmentData extends BaseUpdateData {
  customer_name?: string
  customer_phone?: string
  customer_email?: string
  vehicle_info?: string
  service_type?: string
  appointment_date?: string
  appointment_time?: string
  status?: AppointmentStatus
  notes?: string
  estimated_duration?: number
}

/**
 * LEADS
 */
export interface Lead extends BaseEntity {
  name: string
  company?: string
  phone: string
  email: string
  source: string
  status: LeadStatus
  value: number
  notes?: string
  last_contact?: string
  assigned_to?: string
}

export interface CreateLeadData extends BaseCreateData {
  name: string
  company?: string
  phone: string
  email: string
  source: string
  status?: LeadStatus
  value: number
  notes?: string
  last_contact?: string
  assigned_to?: string
}

export interface UpdateLeadData extends BaseUpdateData {
  name?: string
  company?: string
  phone?: string
  email?: string
  source?: string
  status?: LeadStatus
  value?: number
  notes?: string
  last_contact?: string
  assigned_to?: string
}

/**
 * CAMPAÑAS
 */
export interface Campaign extends BaseEntity {
  name: string
  type: CampaignType
  status: CampaignStatus
  leads_generated: number
  conversion_rate: number
  budget: number
  spent: number
  start_date: string
  end_date: string
  notes?: string
}

export interface CreateCampaignData extends BaseCreateData {
  name: string
  type: CampaignType
  status?: CampaignStatus
  leads_generated?: number
  conversion_rate?: number
  budget: number
  spent?: number
  start_date: string
  end_date: string
  notes?: string
}

export interface UpdateCampaignData extends BaseUpdateData {
  name?: string
  type?: CampaignType
  status?: CampaignStatus
  leads_generated?: number
  conversion_rate?: number
  budget?: number
  spent?: number
  start_date?: string
  end_date?: string
  notes?: string
}

/**
 * NOTIFICACIONES
 */
export interface Notification extends BaseEntity {
  user_id?: string
  type: NotificationType
  title: string
  message: string
  data?: any
  read: boolean
  read_at?: string
  action_url?: string
}

export interface CreateNotificationData extends BaseCreateData {
  user_id?: string
  type: NotificationType
  title: string
  message: string
  data?: any
  read?: boolean
  action_url?: string
}

export interface UpdateNotificationData extends BaseUpdateData {
  user_id?: string
  type?: NotificationType
  title?: string
  message?: string
  data?: any
  read?: boolean
  action_url?: string
}







