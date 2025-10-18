// ✅ CORRECTO: Constantes centralizadas para toda la aplicación

/**
 * CONSTANTES DE INVENTARIO
 */
export const INVENTORY_CONSTANTS = {
  // ✅ CORRECTO: Constantes nombradas para umbrales de stock
  LOW_STOCK_THRESHOLD: 5,
  CRITICAL_STOCK_THRESHOLD: 2,
  OUT_OF_STOCK_THRESHOLD: 0,
  
  // Tipos de movimiento
  MOVEMENT_TYPES: {
    ENTRADA: 'entrada',
    SALIDA: 'salida',
    AJUSTE: 'ajuste'
  } as const,
  
  // Estados de stock
  STOCK_STATUS: {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    CRITICAL_STOCK: 'critical_stock',
    OUT_OF_STOCK: 'out_of_stock'
  } as const
} as const;

/**
 * CONSTANTES DE ÓRDENES DE TRABAJO
 */
export const WORK_ORDER_CONSTANTS = {
  // Estados
  STATUS: {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  } as const,
  
  // Prioridades
  PRIORITY: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high'
  } as const,
  
  // Tiempos estimados (en horas)
  ESTIMATED_HOURS: {
    MIN: 0.5,
    MAX: 24,
    DEFAULT: 2
  } as const
} as const;

/**
 * CONSTANTES DE COTIZACIONES
 */
export const QUOTATION_CONSTANTS = {
  // Estados
  STATUS: {
    DRAFT: 'draft',
    SENT: 'sent',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected',
    EXPIRED: 'expired'
  } as const,
  
  // Días de validez
  VALIDITY_DAYS: {
    DEFAULT: 30,
    MIN: 1,
    MAX: 365
  } as const,
  
  // Tipos de ítems
  ITEM_TYPES: {
    SERVICE: 'service',
    PART: 'part'
  } as const
} as const;

/**
 * CONSTANTES DE FACTURAS
 */
export const INVOICE_CONSTANTS = {
  // Estados
  STATUS: {
    DRAFT: 'draft',
    SENT: 'sent',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled'
  } as const,
  
  // Días de pago
  PAYMENT_DAYS: {
    DEFAULT: 30,
    MIN: 1,
    MAX: 365
  } as const,
  
  // Métodos de pago
  PAYMENT_METHODS: {
    CASH: 'cash',
    CARD: 'card',
    TRANSFER: 'transfer',
    CHECK: 'check'
  } as const
} as const;

/**
 * CONSTANTES DE GARANTÍAS
 */
export const WARRANTY_CONSTANTS = {
  // Estados
  STATUS: {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    CLAIMED: 'claimed',
    VOID: 'void'
  } as const,
  
  // Estados de reclamos
  CLAIM_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    RESOLVED: 'resolved'
  } as const,
  
  // Tipos de resolución
  RESOLUTION_TYPES: {
    REPAIR: 'repair',
    REPLACEMENT: 'replacement',
    REFUND: 'refund'
  } as const,
  
  // Días de garantía por defecto
  DEFAULT_WARRANTY_DAYS: {
    SERVICE: 90,
    PART: 365,
    LABOR: 30
  } as const
} as const;

/**
 * CONSTANTES DE USUARIOS Y ROLES
 */
export const USER_CONSTANTS = {
  // Niveles de acceso
  ACCESS_LEVELS: {
    READ_ONLY: 1,
    BASIC: 2,
    STANDARD: 3,
    ADVANCED: 4,
    ADMIN: 5,
    SUPER_ADMIN: 6
  } as const,
  
  // Estados de usuario
  STATUS: {
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    PENDING: 'pending',
    SUSPENDED: 'suspended'
  } as const,
  
  // Tipos de roles
  ROLE_TYPES: {
    SYSTEM: 'system',
    CUSTOM: 'custom'
  } as const
} as const;

/**
 * CONSTANTES DE CONFIGURACIÓN
 */
export const CONFIG_CONSTANTS = {
  // Temas
  THEMES: {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
  } as const,
  
  // Idiomas
  LANGUAGES: {
    ES: 'es',
    EN: 'en'
  } as const,
  
  // Monedas
  CURRENCIES: {
    USD: 'USD',
    EUR: 'EUR',
    MXN: 'MXN'
  } as const,
  
  // Zonas horarias
  TIMEZONES: {
    UTC: 'UTC',
    EST: 'America/New_York',
    PST: 'America/Los_Angeles',
    CST: 'America/Mexico_City'
  } as const
} as const;

/**
 * CONSTANTES DE PAGINACIÓN
 */
export const PAGINATION_CONSTANTS = {
  // Límites por defecto
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
  
  // Páginas
  DEFAULT_PAGE: 1,
  MIN_PAGE: 1
} as const;

/**
 * CONSTANTES DE VALIDACIÓN
 */
export const VALIDATION_CONSTANTS = {
  // Longitudes
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  
  // Patrones
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_PATTERN: /^[\+]?[1-9][\d]{0,15}$/,
  VIN_PATTERN: /^[A-HJ-NPR-Z0-9]{17}$/,
  SKU_PATTERN: /^[A-Z0-9-]+$/,
  
  // Rangos
  MIN_YEAR: 1900,
  MAX_YEAR: new Date().getFullYear() + 1,
  MIN_MILEAGE: 0,
  MAX_MILEAGE: 999999,
  MIN_PRICE: 0,
  MAX_PRICE: 999999.99
} as const;

/**
 * CONSTANTES DE ORGANIZACIÓN
 */
export const ORGANIZATION_CONSTANTS = {
  // ID temporal para desarrollo
  TEMP_ORG_ID: '00000000-0000-0000-0000-000000000001',
  
  // Configuración por defecto
  DEFAULT_SETTINGS: {
    CURRENCY: 'MXN',
    LANGUAGE: 'es',
    TIMEZONE: 'America/Mexico_City',
    DATE_FORMAT: 'DD/MM/YYYY',
    TIME_FORMAT: 'HH:mm'
  } as const
} as const;

/**
 * CONSTANTES DE API
 */
export const API_CONSTANTS = {
  // Códigos de estado HTTP
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500
  } as const,
  
  // Mensajes de error
  ERROR_MESSAGES: {
    VALIDATION_ERROR: 'Error de validación',
    NOT_FOUND: 'Recurso no encontrado',
    UNAUTHORIZED: 'No autorizado',
    FORBIDDEN: 'Acceso denegado',
    CONFLICT: 'Conflicto de datos',
    INTERNAL_ERROR: 'Error interno del servidor'
  } as const,
  
  // Timeouts
  TIMEOUTS: {
    DEFAULT: 30000,
    LONG: 60000,
    SHORT: 5000
  } as const
} as const;

/**
 * CONSTANTES DE LOGGING
 */
export const LOGGING_CONSTANTS = {
  // Niveles de log
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  } as const,
  
  // Contextos
  CONTEXTS: {
    API: 'api',
    DATABASE: 'database',
    AUTH: 'auth',
    BUSINESS: 'business'
  } as const
} as const;

/**
 * CONSTANTES DE NOTIFICACIONES
 */
export const NOTIFICATION_CONSTANTS = {
  // Tipos
  TYPES: {
    EMAIL: 'email',
    SMS: 'sms',
    BROWSER: 'browser',
    PUSH: 'push'
  } as const,
  
  // Prioridades
  PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  } as const,
  
  // Estados
  STATUS: {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    FAILED: 'failed'
  } as const
} as const;

/**
 * CONSTANTES DE REPORTES
 */
export const REPORT_CONSTANTS = {
  // Tipos de reporte
  TYPES: {
    SALES: 'sales',
    INVENTORY: 'inventory',
    WORK_ORDERS: 'work_orders',
    FINANCIAL: 'financial',
    CUSTOMERS: 'customers'
  } as const,
  
  // Períodos
  PERIODS: {
    DAILY: 'daily',
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    YEARLY: 'yearly',
    CUSTOM: 'custom'
  } as const,
  
  // Formatos de exportación
  EXPORT_FORMATS: {
    CSV: 'csv',
    PDF: 'pdf',
    EXCEL: 'excel',
    JSON: 'json'
  } as const
} as const;

/**
 * CONSTANTES DE AUDITORÍA
 */
export const AUDIT_CONSTANTS = {
  // Acciones
  ACTIONS: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    LOGOUT: 'logout'
  } as const,
  
  // Entidades
  ENTITIES: {
    CUSTOMER: 'customer',
    VEHICLE: 'vehicle',
    WORK_ORDER: 'work_order',
    INVENTORY: 'inventory',
    QUOTATION: 'quotation',
    INVOICE: 'invoice',
    USER: 'user',
    ROLE: 'role'
  } as const
} as const;

/**
 * CONSTANTES DE HORARIOS DE NEGOCIO
 */
export const BUSINESS_HOURS_CONSTANTS = {
  // Días de la semana
  DAYS: {
    MONDAY: 'monday',
    TUESDAY: 'tuesday',
    WEDNESDAY: 'wednesday',
    THURSDAY: 'thursday',
    FRIDAY: 'friday',
    SATURDAY: 'saturday',
    SUNDAY: 'sunday'
  } as const,
  
  // Horarios por defecto
  DEFAULT_HOURS: {
    OPEN: '09:00',
    CLOSE: '18:00',
    LUNCH_START: '13:00',
    LUNCH_END: '14:00'
  } as const
} as const;

/**
 * CONSTANTES DE SEGURIDAD
 */
export const SECURITY_CONSTANTS = {
  // Longitudes de contraseña
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: true
  } as const,
  
  // Intentos de login
  LOGIN_ATTEMPTS: {
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000 // 15 minutos
  } as const,
  
  // Tokens
  TOKEN: {
    EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 horas
    REFRESH_EXPIRY_TIME: 7 * 24 * 60 * 60 * 1000 // 7 días
  } as const
} as const;











