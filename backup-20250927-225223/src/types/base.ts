/**
 * Tipos Base Centralizados
 * Define interfaces y tipos comunes para toda la aplicación
 */

/**
 * Entidad base que todas las entidades de la base de datos deben implementar
 */
export interface BaseEntity {
  id: string
  organization_id: string
  created_at: string
  updated_at: string
}

/**
 * Datos base para crear entidades
 */
export interface BaseCreateData {
  organization_id?: string
}

/**
 * Datos base para actualizar entidades
 */
export interface BaseUpdateData {
  updated_at?: string
}

/**
 * Estado común para entidades que pueden estar activas/inactivas
 */
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled'

/**
 * Prioridad común para entidades que pueden tener prioridad
 */
export type EntityPriority = 'low' | 'medium' | 'high' | 'urgent'

/**
 * Métodos de pago comunes
 */
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'check'

/**
 * Estados de pago comunes
 */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded'

/**
 * Estados de órdenes comunes
 */
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'

/**
 * Estados de cotizaciones comunes
 */
export type QuotationStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted'

/**
 * Estados de facturas comunes
 */
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

/**
 * Tipos de items en órdenes/cotizaciones
 */
export type ItemType = 'service' | 'product'

/**
 * Tipos de notificaciones
 */
export type NotificationType = 
  | 'info' 
  | 'warning' 
  | 'success' 
  | 'error' 
  | 'stock_low' 
  | 'order_completed' 
  | 'quotation_created'
  | 'payment_received'
  | 'appointment_reminder'

/**
 * Tipos de campañas
 */
export type CampaignType = 'email' | 'phone' | 'social' | 'event'

/**
 * Estados de campañas
 */
export type CampaignStatus = 'active' | 'paused' | 'completed' | 'cancelled'

/**
 * Estados de citas
 */
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

/**
 * Estados de leads
 */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'

/**
 * Interfaz para estadísticas base
 */
export interface BaseStats {
  total: number
  created_today: number
  created_this_week: number
  created_this_month: number
}

/**
 * Interfaz para paginación
 */
export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

/**
 * Interfaz para respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Interfaz para filtros de búsqueda
 */
export interface SearchFilters {
  search?: string
  status?: string
  date_from?: string
  date_to?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
}

/**
 * Interfaz para opciones de select
 */
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

/**
 * Interfaz para datos de formulario base
 */
export interface BaseFormData {
  id?: string
  isDirty?: boolean
  isValid?: boolean
  errors?: Record<string, string>
}

/**
 * Interfaz para respuesta de API
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

/**
 * Interfaz para datos de usuario
 */
export interface User {
  id: string
  email: string
  name: string
  role: string
  organization_id: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

/**
 * Interfaz para datos de organización
 */
export interface Organization {
  id: string
  name: string
  description?: string
  logo_url?: string
  settings: OrganizationSettings
  created_at: string
  updated_at: string
}

/**
 * Configuración de organización
 */
export interface OrganizationSettings {
  timezone: string
  currency: string
  language: string
  features: {
    multi_tenancy: boolean
    analytics: boolean
    notifications: boolean
  }
}

/**
 * Interfaz para datos de archivo
 */
export interface FileData {
  id: string
  name: string
  url: string
  size: number
  type: string
  uploaded_at: string
  uploaded_by: string
}

/**
 * Interfaz para datos de auditoría
 */
export interface AuditData {
  created_by?: string
  updated_by?: string
  deleted_by?: string
  created_at: string
  updated_at: string
  deleted_at?: string
}

/**
 * Interfaz para datos de ubicación
 */
export interface LocationData {
  address: string
  city: string
  state: string
  country: string
  postal_code: string
  coordinates?: {
    lat: number
    lng: number
  }
}

/**
 * Interfaz para datos de contacto
 */
export interface ContactData {
  name: string
  email?: string
  phone?: string
  address?: LocationData
}

/**
 * Interfaz para datos de moneda
 */
export interface CurrencyData {
  amount: number
  currency: string
  formatted?: string
}

/**
 * Interfaz para datos de fecha
 */
export interface DateData {
  date: string
  time?: string
  timezone?: string
  formatted?: string
}

/**
 * Interfaz para datos de rango de fechas
 */
export interface DateRange {
  from: string
  to: string
}

/**
 * Interfaz para datos de métricas
 */
export interface MetricData {
  label: string
  value: number
  change?: number
  change_type?: 'increase' | 'decrease' | 'neutral'
  format?: 'number' | 'currency' | 'percentage'
}

/**
 * Interfaz para datos de gráfico
 */
export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string[]
    borderColor?: string[]
  }[]
}

/**
 * Interfaz para datos de tabla
 */
export interface TableData<T = any> {
  columns: {
    key: string
    label: string
    sortable?: boolean
    filterable?: boolean
    width?: string
  }[]
  rows: T[]
  pagination?: PaginatedResponse<T>['pagination']
}

/**
 * Interfaz para datos de formulario
 */
export interface FormData<T = any> {
  values: T
  errors: Record<keyof T, string>
  touched: Record<keyof T, boolean>
  isSubmitting: boolean
  isValid: boolean
}

/**
 * Interfaz para datos de modal
 */
export interface ModalData {
  isOpen: boolean
  title: string
  content?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onClose?: () => void
}

/**
 * Interfaz para datos de notificación
 */
export interface NotificationData {
  id: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  created_at: string
  action_url?: string
}

/**
 * Interfaz para datos de breadcrumb
 */
export interface BreadcrumbData {
  label: string
  href?: string
  current?: boolean
}

/**
 * Interfaz para datos de navegación
 */
export interface NavigationData {
  label: string
  href: string
  icon?: string
  badge?: string | number
  children?: NavigationData[]
}

/**
 * Interfaz para datos de configuración
 */
export interface ConfigData {
  key: string
  value: any
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  description?: string
  required?: boolean
}

/**
 * Interfaz para datos de permisos
 */
export interface PermissionData {
  resource: string
  action: string
  allowed: boolean
}

/**
 * Interfaz para datos de roles
 */
export interface RoleData {
  id: string
  name: string
  description?: string
  permissions: PermissionData[]
  created_at: string
  updated_at: string
}
