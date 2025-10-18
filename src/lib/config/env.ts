// ✅ CORRECTO: Configuración centralizada de variables de entorno

/**
 * Configuración centralizada de variables de entorno
 * Todas las variables de entorno se validan y tipan aquí
 */

// =====================================================
// CONFIGURACIÓN DE SUPABASE
// =====================================================
export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
} as const;

// =====================================================
// CONFIGURACIÓN DE LA APLICACIÓN
// =====================================================
export const APP_CONFIG = {
  url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  environment: process.env.NODE_ENV || 'development',
  version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  port: parseInt(process.env.DEV_PORT || '3000'),
} as const;

// =====================================================
// CONFIGURACIÓN DE LOGGING
// =====================================================
export const LOGGING_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  debugQueries: process.env.DEBUG_QUERIES === 'true',
  detailedLogging: process.env.ENABLE_DETAILED_LOGGING === 'true',
} as const;

// =====================================================
// CONFIGURACIÓN DE BASE DE DATOS
// =====================================================
export const DATABASE_CONFIG = {
  url: process.env.DATABASE_URL || '',
} as const;

// =====================================================
// CONFIGURACIÓN DE AUTENTICACIÓN
// =====================================================
export const AUTH_CONFIG = {
  redirectUrl: process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL || 'http://localhost:3000/auth/callback',
  logoutRedirectUrl: process.env.NEXT_PUBLIC_LOGOUT_REDIRECT_URL || 'http://localhost:3000/login',
  jwtSecret: process.env.JWT_SECRET || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
} as const;

// =====================================================
// CONFIGURACIÓN DE RATE LIMITING
// =====================================================
export const RATE_LIMIT_CONFIG = {
  requestsPerMinute: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100'),
  requestsPerHour: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_HOUR || '1000'),
} as const;

// =====================================================
// CONFIGURACIÓN DE CACHE
// =====================================================
export const CACHE_CONFIG = {
  ttl: parseInt(process.env.CACHE_TTL || '300'),
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '100'),
} as const;

// =====================================================
// CONFIGURACIÓN DE UPLOADS
// =====================================================
export const UPLOAD_CONFIG = {
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '10'),
  allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
} as const;

// =====================================================
// CONFIGURACIÓN DE DESARROLLO
// =====================================================
export const DEVELOPMENT_CONFIG = {
  debugMode: process.env.DEBUG_MODE === 'true',
  hotReload: process.env.HOT_RELOAD === 'true',
  enableDebugToolbar: process.env.ENABLE_DEBUG_TOOLBAR === 'true',
  enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
  enableSlowQueryLogging: process.env.ENABLE_SLOW_QUERY_LOGGING === 'true',
  slowQueryThresholdMs: parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '500'),
} as const;

// =====================================================
// CONFIGURACIÓN DE TESTING
// =====================================================
export const TESTING_CONFIG = {
  enableAutoTests: process.env.ENABLE_AUTO_TESTS === 'true',
  minTestCoverage: parseInt(process.env.MIN_TEST_COVERAGE || '80'),
  testTimeout: parseInt(process.env.TEST_TIMEOUT || '30'),
} as const;

// =====================================================
// CONFIGURACIÓN ESPECÍFICA DEL ERP
// =====================================================
export const ERP_CONFIG = {
  // Organización por defecto
  defaultOrganizationId: process.env.DEFAULT_ORGANIZATION_ID || '00000000-0000-0000-0000-000000000001',
  
  // Configuración de moneda
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'MXN',
  defaultTaxRate: parseFloat(process.env.DEFAULT_TAX_RATE || '16.0'),
  
  // Configuración de paginación
  defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '10'),
  maxPageSize: parseInt(process.env.MAX_PAGE_SIZE || '100'),
  
  // Configuración de notificaciones
  enableEmailNotifications: process.env.ENABLE_EMAIL_NOTIFICATIONS === 'true',
  enableSmsNotifications: process.env.ENABLE_SMS_NOTIFICATIONS === 'true',
  
  // Configuración de backup
  enableAutoBackup: process.env.ENABLE_AUTO_BACKUP === 'true',
  backupIntervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS || '24'),
  
  // Configuración de reportes
  reportCacheTtl: parseInt(process.env.REPORT_CACHE_TTL || '3600'),
  maxReportRows: parseInt(process.env.MAX_REPORT_ROWS || '10000'),
  
  // Configuración de inventario
  lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD || '5'),
  enableStockAlerts: process.env.ENABLE_STOCK_ALERTS === 'true',
  
  // Configuración de facturación
  invoiceNumberPrefix: process.env.INVOICE_NUMBER_PREFIX || 'FAC',
  quotationNumberPrefix: process.env.QUOTATION_NUMBER_PREFIX || 'COT',
  paymentNumberPrefix: process.env.PAYMENT_NUMBER_PREFIX || 'PAG',
  
  // Configuración de órdenes de trabajo
  workOrderNumberPrefix: process.env.WORK_ORDER_NUMBER_PREFIX || 'WO',
  estimatedHoursDefault: parseFloat(process.env.ESTIMATED_HOURS_DEFAULT || '2.0'),
  
  // Configuración de vehículos
  vehicleVinValidation: process.env.VEHICLE_VIN_VALIDATION === 'true',
  vehicleLicensePlateValidation: process.env.VEHICLE_LICENSE_PLATE_VALIDATION === 'true',
  
  // Configuración de clientes
  customerEmailValidation: process.env.CUSTOMER_EMAIL_VALIDATION === 'true',
  customerPhoneValidation: process.env.CUSTOMER_PHONE_VALIDATION === 'true',
  
  // Configuración de usuarios
  userPasswordMinLength: parseInt(process.env.USER_PASSWORD_MIN_LENGTH || '8'),
  userSessionTimeout: parseInt(process.env.USER_SESSION_TIMEOUT || '3600'),
  
  // Configuración de roles
  defaultUserRole: process.env.DEFAULT_USER_ROLE || 'user',
  adminRole: process.env.ADMIN_ROLE || 'admin',
  managerRole: process.env.MANAGER_ROLE || 'manager',
  
  // Configuración de permisos
  enableRoleBasedAccess: process.env.ENABLE_ROLE_BASED_ACCESS === 'true',
  enablePermissionChecks: process.env.ENABLE_PERMISSION_CHECKS === 'true',
  
  // Configuración de auditoría
  enableAuditLogs: process.env.ENABLE_AUDIT_LOGS === 'true',
  auditLogRetentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365'),
  
  // Configuración de sistema
  systemMaintenanceMode: process.env.SYSTEM_MAINTENANCE_MODE === 'true',
  systemMaintenanceMessage: process.env.SYSTEM_MAINTENANCE_MESSAGE || 'El sistema está en mantenimiento',
  
  // Configuración de integración
  enableApiIntegration: process.env.ENABLE_API_INTEGRATION === 'true',
  apiRateLimit: parseInt(process.env.API_RATE_LIMIT || '1000'),
  
  // Configuración de monitoreo
  enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  performanceThresholdMs: parseInt(process.env.PERFORMANCE_THRESHOLD_MS || '1000'),
  
  // Configuración de errores
  enableErrorReporting: process.env.ENABLE_ERROR_REPORTING === 'true',
  errorReportingEmail: process.env.ERROR_REPORTING_EMAIL || 'admin@example.com',
} as const;

// =====================================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// =====================================================
export function validateEnvironmentVariables() {
  const errors: string[] = [];
  
  // Validar variables críticas de Supabase
  if (!SUPABASE_CONFIG.url) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL es requerida');
  }
  
  if (!SUPABASE_CONFIG.anonKey) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY es requerida');
  }
  
  if (!SUPABASE_CONFIG.serviceRoleKey) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY es requerida');
  }
  
  // Validar configuración de autenticación
  if (!AUTH_CONFIG.jwtSecret) {
    errors.push('JWT_SECRET es requerida');
  }
  
  if (!AUTH_CONFIG.encryptionKey) {
    errors.push('ENCRYPTION_KEY es requerida');
  }
  
  // Validar configuración de base de datos
  if (!DATABASE_CONFIG.url) {
    errors.push('DATABASE_URL es requerida');
  }
  
  if (errors.length > 0) {
    throw new Error(`Variables de entorno faltantes: ${errors.join(', ')}`);
  }
  
  return true;
}

// =====================================================
// CONFIGURACIÓN POR AMBIENTE
// =====================================================
export function getEnvironmentConfig() {
  const env = APP_CONFIG.environment;
  
  switch (env) {
    case 'development':
      return {
        ...APP_CONFIG,
        ...LOGGING_CONFIG,
        ...DEVELOPMENT_CONFIG,
        debugMode: true,
        detailedLogging: true,
        enableQueryLogging: true,
      };
      
    case 'production':
      return {
        ...APP_CONFIG,
        ...LOGGING_CONFIG,
        debugMode: false,
        detailedLogging: false,
        enableQueryLogging: false,
      };
      
    case 'test':
      return {
        ...APP_CONFIG,
        ...TESTING_CONFIG,
        debugMode: true,
        detailedLogging: false,
        enableQueryLogging: false,
      };
      
    default:
      return {
        ...APP_CONFIG,
        ...LOGGING_CONFIG,
        ...DEVELOPMENT_CONFIG,
      };
  }
}

// =====================================================
// CONFIGURACIÓN COMPLETA
// =====================================================
export const CONFIG = {
  supabase: SUPABASE_CONFIG,
  app: APP_CONFIG,
  logging: LOGGING_CONFIG,
  database: DATABASE_CONFIG,
  auth: AUTH_CONFIG,
  rateLimit: RATE_LIMIT_CONFIG,
  cache: CACHE_CONFIG,
  upload: UPLOAD_CONFIG,
  development: DEVELOPMENT_CONFIG,
  testing: TESTING_CONFIG,
  erp: ERP_CONFIG,
} as const;

// =====================================================
// EXPORTAR CONFIGURACIÓN POR DEFECTO
// =====================================================
export default CONFIG;











