// ✅ CORRECTO: Esquemas de validación con Zod
import { z } from 'zod';

/**
 * ESQUEMAS DE VALIDACIÓN PARA CLIENTES
 */
export const CustomerSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre no puede exceder 100 caracteres'),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Teléfono inválido').optional(),
  address: z.string().max(200, 'La dirección no puede exceder 200 caracteres').optional(),
  city: z.string().max(50, 'La ciudad no puede exceder 50 caracteres').optional(),
  state: z.string().max(50, 'El estado no puede exceder 50 caracteres').optional(),
  zip_code: z.string().max(10, 'El código postal no puede exceder 10 caracteres').optional()
});

export const CreateCustomerSchema = CustomerSchema;
export const UpdateCustomerSchema = CustomerSchema.partial().extend({
  id: z.string().uuid('ID de cliente inválido')
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA VEHÍCULOS
 */
export const VehicleSchema = z.object({
  customer_id: z.string().uuid('ID de cliente inválido'),
  make: z.string().min(2, 'La marca debe tener al menos 2 caracteres').max(50, 'La marca no puede exceder 50 caracteres'),
  model: z.string().min(2, 'El modelo debe tener al menos 2 caracteres').max(50, 'El modelo no puede exceder 50 caracteres'),
  year: z.number().int().min(1900, 'El año debe ser mayor a 1900').max(new Date().getFullYear() + 1, 'El año no puede ser futuro'),
  vin: z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/, 'VIN inválido').optional(),
  license_plate: z.string().max(20, 'La placa no puede exceder 20 caracteres').optional(),
  color: z.string().max(30, 'El color no puede exceder 30 caracteres').optional(),
  mileage: z.number().int().min(0, 'El kilometraje no puede ser negativo').max(999999, 'El kilometraje no puede exceder 999,999').optional()
});

export const CreateVehicleSchema = VehicleSchema;
export const UpdateVehicleSchema = VehicleSchema.partial().extend({
  id: z.string().uuid('ID de vehículo inválido')
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA INVENTARIO
 */
export const InventoryItemSchema = z.object({
  category_id: z.string().uuid('ID de categoría inválido'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional(),
  sku: z.string().regex(/^[A-Z0-9-]+$/, 'SKU inválido').max(50, 'El SKU no puede exceder 50 caracteres'),
  quantity: z.number().int().min(0, 'La cantidad no puede ser negativa').max(999999, 'La cantidad no puede exceder 999,999'),
  minimum_stock: z.number().int().min(0, 'El stock mínimo no puede ser negativo').max(999999, 'El stock mínimo no puede exceder 999,999'),
  unit_price: z.number().min(0, 'El precio no puede ser negativo').max(999999.99, 'El precio no puede exceder 999,999.99')
});

export const CreateInventoryItemSchema = InventoryItemSchema;
export const UpdateInventoryItemSchema = InventoryItemSchema.partial().extend({
  id: z.string().uuid('ID de artículo inválido')
});

export const InventoryCategorySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string().max(500, 'La descripción no puede exceder 500 caracteres').optional()
});

export const CreateInventoryCategorySchema = InventoryCategorySchema;
export const UpdateInventoryCategorySchema = InventoryCategorySchema.partial().extend({
  id: z.string().uuid('ID de categoría inválido')
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA ÓRDENES DE TRABAJO
 */
export const WorkOrderSchema = z.object({
  customer_id: z.string().uuid('ID de cliente inválido'),
  vehicle_id: z.string().uuid('ID de vehículo inválido'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(1000, 'La descripción no puede exceder 1000 caracteres'),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'La prioridad debe ser low, medium o high' })
  }).optional(),
  estimated_hours: z.number().min(0.5, 'Las horas estimadas deben ser al menos 0.5').max(24, 'Las horas estimadas no pueden exceder 24').optional()
});

export const CreateWorkOrderSchema = WorkOrderSchema;
export const UpdateWorkOrderSchema = WorkOrderSchema.partial().extend({
  id: z.string().uuid('ID de orden inválido'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  actual_hours: z.number().min(0, 'Las horas reales no pueden ser negativas').max(24, 'Las horas reales no pueden exceder 24').optional(),
  labor_cost: z.number().min(0, 'El costo de mano de obra no puede ser negativo').max(999999.99, 'El costo de mano de obra no puede exceder 999,999.99').optional(),
  parts_cost: z.number().min(0, 'El costo de partes no puede ser negativo').max(999999.99, 'El costo de partes no puede exceder 999,999.99').optional(),
  total_cost: z.number().min(0, 'El costo total no puede ser negativo').max(999999.99, 'El costo total no puede exceder 999,999.99').optional()
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA COTIZACIONES
 */
export const QuotationSchema = z.object({
  customer_id: z.string().uuid('ID de cliente inválido'),
  vehicle_id: z.string().uuid('ID de vehículo inválido'),
  issue_date: z.string().datetime('Fecha de emisión inválida'),
  expiry_date: z.string().datetime('Fecha de vencimiento inválida'),
  subtotal: z.number().min(0, 'El subtotal no puede ser negativo').max(999999.99, 'El subtotal no puede exceder 999,999.99'),
  tax_rate: z.number().min(0, 'La tasa de impuestos no puede ser negativa').max(100, 'La tasa de impuestos no puede exceder 100%'),
  tax_amount: z.number().min(0, 'El monto de impuestos no puede ser negativo').max(999999.99, 'El monto de impuestos no puede exceder 999,999.99'),
  discount_amount: z.number().min(0, 'El descuento no puede ser negativo').max(999999.99, 'El descuento no puede exceder 999,999.99'),
  total_amount: z.number().min(0, 'El total no puede ser negativo').max(999999.99, 'El total no puede exceder 999,999.99'),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional()
});

export const CreateQuotationSchema = QuotationSchema;
export const UpdateQuotationSchema = QuotationSchema.partial().extend({
  id: z.string().uuid('ID de cotización inválido'),
  status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired']).optional()
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA FACTURAS
 */
export const InvoiceSchema = z.object({
  customer_id: z.string().uuid('ID de cliente inválido'),
  vehicle_id: z.string().uuid('ID de vehículo inválido'),
  issue_date: z.string().datetime('Fecha de emisión inválida'),
  due_date: z.string().datetime('Fecha de vencimiento inválida'),
  subtotal: z.number().min(0, 'El subtotal no puede ser negativo').max(999999.99, 'El subtotal no puede exceder 999,999.99'),
  tax_rate: z.number().min(0, 'La tasa de impuestos no puede ser negativa').max(100, 'La tasa de impuestos no puede exceder 100%'),
  tax_amount: z.number().min(0, 'El monto de impuestos no puede ser negativo').max(999999.99, 'El monto de impuestos no puede exceder 999,999.99'),
  discount_amount: z.number().min(0, 'El descuento no puede ser negativo').max(999999.99, 'El descuento no puede exceder 999,999.99'),
  total_amount: z.number().min(0, 'El total no puede ser negativo').max(999999.99, 'El total no puede exceder 999,999.99'),
  notes: z.string().max(1000, 'Las notas no pueden exceder 1000 caracteres').optional()
});

export const CreateInvoiceSchema = InvoiceSchema;
export const UpdateInvoiceSchema = InvoiceSchema.partial().extend({
  id: z.string().uuid('ID de factura inválido'),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  paid_amount: z.number().min(0, 'El monto pagado no puede ser negativo').max(999999.99, 'El monto pagado no puede exceder 999,999.99').optional(),
  balance: z.number().min(0, 'El saldo no puede ser negativo').max(999999.99, 'El saldo no puede exceder 999,999.99').optional()
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA PAGOS
 */
export const PaymentSchema = z.object({
  invoice_id: z.string().uuid('ID de factura inválido'),
  amount: z.number().min(0.01, 'El monto debe ser mayor a 0').max(999999.99, 'El monto no puede exceder 999,999.99'),
  payment_method: z.enum(['cash', 'card', 'transfer', 'check'], {
    errorMap: () => ({ message: 'El método de pago debe ser cash, card, transfer o check' })
  }),
  payment_date: z.string().datetime('Fecha de pago inválida'),
  reference: z.string().max(100, 'La referencia no puede exceder 100 caracteres').optional(),
  notes: z.string().max(500, 'Las notas no pueden exceder 500 caracteres').optional()
});

export const CreatePaymentSchema = PaymentSchema;
export const UpdatePaymentSchema = PaymentSchema.partial().extend({
  id: z.string().uuid('ID de pago inválido')
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA GARANTÍAS
 */
export const WarrantySchema = z.object({
  work_order_id: z.string().uuid('ID de orden inválido'),
  customer_id: z.string().uuid('ID de cliente inválido'),
  vehicle_id: z.string().uuid('ID de vehículo inválido'),
  item_type: z.enum(['service', 'part'], {
    errorMap: () => ({ message: 'El tipo de ítem debe ser service o part' })
  }),
  item_description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(500, 'La descripción no puede exceder 500 caracteres'),
  start_date: z.string().datetime('Fecha de inicio inválida'),
  end_date: z.string().datetime('Fecha de fin inválida'),
  terms: z.string().min(10, 'Los términos deben tener al menos 10 caracteres').max(1000, 'Los términos no pueden exceder 1000 caracteres'),
  conditions: z.string().min(10, 'Las condiciones deben tener al menos 10 caracteres').max(1000, 'Las condiciones no pueden exceder 1000 caracteres'),
  coverage_details: z.string().min(10, 'Los detalles de cobertura deben tener al menos 10 caracteres').max(1000, 'Los detalles de cobertura no pueden exceder 1000 caracteres'),
  original_amount: z.number().min(0, 'El monto original no puede ser negativo').max(999999.99, 'El monto original no puede exceder 999,999.99')
});

export const CreateWarrantySchema = WarrantySchema;
export const UpdateWarrantySchema = WarrantySchema.partial().extend({
  id: z.string().uuid('ID de garantía inválido'),
  status: z.enum(['active', 'expired', 'claimed', 'void']).optional()
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA USUARIOS
 */
export const UserSchema = z.object({
  email: z.string().email('Email inválido'),
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'El nombre no puede exceder 50 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(50, 'El apellido no puede exceder 50 caracteres'),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Teléfono inválido').optional(),
  employee_number: z.string().max(20, 'El número de empleado no puede exceder 20 caracteres').optional(),
  position: z.string().max(100, 'El puesto no puede exceder 100 caracteres').optional(),
  department: z.string().max(100, 'El departamento no puede exceder 100 caracteres').optional(),
  hire_date: z.string().datetime('Fecha de contratación inválida').optional(),
  avatar_url: z.string().url('URL de avatar inválida').optional()
});

export const CreateUserSchema = UserSchema;
export const UpdateUserSchema = UserSchema.partial().extend({
  id: z.string().uuid('ID de usuario inválido'),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional()
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA ROLES
 */
export const RoleSchema = z.object({
  role_name: z.string().min(2, 'El nombre del rol debe tener al menos 2 caracteres').max(50, 'El nombre del rol no puede exceder 50 caracteres'),
  role_code: z.string().min(2, 'El código del rol debe tener al menos 2 caracteres').max(20, 'El código del rol no puede exceder 20 caracteres'),
  description: z.string().max(200, 'La descripción no puede exceder 200 caracteres').optional(),
  access_level: z.number().int().min(1, 'El nivel de acceso debe ser al menos 1').max(6, 'El nivel de acceso no puede exceder 6'),
  is_system_role: z.boolean().optional(),
  is_active: z.boolean().optional()
});

export const CreateRoleSchema = RoleSchema;
export const UpdateRoleSchema = RoleSchema.partial().extend({
  id: z.string().uuid('ID de rol inválido')
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA CONFIGURACIÓN
 */
export const SystemSettingsSchema = z.object({
  business_name: z.string().min(2, 'El nombre del negocio debe tener al menos 2 caracteres').max(100, 'El nombre del negocio no puede exceder 100 caracteres'),
  business_email: z.string().email('Email del negocio inválido'),
  business_phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Teléfono del negocio inválido'),
  business_address: z.string().max(200, 'La dirección no puede exceder 200 caracteres'),
  business_city: z.string().max(50, 'La ciudad no puede exceder 50 caracteres'),
  business_state: z.string().max(50, 'El estado no puede exceder 50 caracteres'),
  business_zip: z.string().max(10, 'El código postal no puede exceder 10 caracteres'),
  business_country: z.string().max(50, 'El país no puede exceder 50 caracteres'),
  tax_id: z.string().max(20, 'El ID fiscal no puede exceder 20 caracteres'),
  currency: z.string().length(3, 'La moneda debe tener 3 caracteres'),
  timezone: z.string().max(50, 'La zona horaria no puede exceder 50 caracteres'),
  language: z.string().length(2, 'El idioma debe tener 2 caracteres'),
  logo_url: z.string().url('URL del logo inválida').optional()
});

export const CreateSystemSettingsSchema = SystemSettingsSchema;
export const UpdateSystemSettingsSchema = SystemSettingsSchema.partial().extend({
  id: z.string().uuid('ID de configuración inválido')
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA PAGINACIÓN
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1, 'La página debe ser al menos 1').max(1000, 'La página no puede exceder 1000').optional(),
  limit: z.number().int().min(1, 'El límite debe ser al menos 1').max(100, 'El límite no puede exceder 100').optional(),
  search: z.string().max(100, 'La búsqueda no puede exceder 100 caracteres').optional(),
  sort_by: z.string().max(50, 'El campo de ordenamiento no puede exceder 50 caracteres').optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA FILTROS
 */
export const FilterSchema = z.object({
  status: z.string().max(50, 'El estado no puede exceder 50 caracteres').optional(),
  category: z.string().uuid('ID de categoría inválido').optional(),
  date_from: z.string().datetime('Fecha de inicio inválida').optional(),
  date_to: z.string().datetime('Fecha de fin inválida').optional(),
  customer_id: z.string().uuid('ID de cliente inválido').optional(),
  vehicle_id: z.string().uuid('ID de vehículo inválido').optional()
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA AUTENTICACIÓN
 */
export const LoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128, 'La contraseña no puede exceder 128 caracteres')
});

export const RegisterSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128, 'La contraseña no puede exceder 128 caracteres'),
  first_name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'El nombre no puede exceder 50 caracteres'),
  last_name: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(50, 'El apellido no puede exceder 50 caracteres')
});

/**
 * ESQUEMAS DE VALIDACIÓN PARA AUDITORÍA
 */
export const AuditLogSchema = z.object({
  action: z.string().min(2, 'La acción debe tener al menos 2 caracteres').max(50, 'La acción no puede exceder 50 caracteres'),
  entity_type: z.string().min(2, 'El tipo de entidad debe tener al menos 2 caracteres').max(50, 'El tipo de entidad no puede exceder 50 caracteres'),
  entity_id: z.string().uuid('ID de entidad inválido'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres').max(500, 'La descripción no puede exceder 500 caracteres'),
  changes: z.record(z.any()).optional()
});

export const CreateAuditLogSchema = AuditLogSchema;
export const UpdateAuditLogSchema = AuditLogSchema.partial().extend({
  id: z.string().uuid('ID de log inválido')
});
















