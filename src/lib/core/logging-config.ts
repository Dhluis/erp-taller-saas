/**
 * Configuración del Sistema de Logging
 * Configuraciones específicas para diferentes entornos
 */

import { LoggingConfig } from './logging';

// =====================================================
// CONFIGURACIONES POR ENTORNO
// =====================================================

const developmentConfig: LoggingConfig = {
  level: 'debug',
  enableConsole: true,
  enableRemote: false,
  maxRetries: 1,
  batchSize: 5,
  flushInterval: 2000, // 2 segundos
};

const stagingConfig: LoggingConfig = {
  level: 'info',
  enableConsole: true,
  enableRemote: true,
  remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
  maxRetries: 2,
  batchSize: 10,
  flushInterval: 3000, // 3 segundos
};

const productionConfig: LoggingConfig = {
  level: 'warn',
  enableConsole: false,
  enableRemote: true,
  remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
  maxRetries: 3,
  batchSize: 20,
  flushInterval: 5000, // 5 segundos
};

// =====================================================
// FUNCIÓN DE CONFIGURACIÓN
// =====================================================

export function getLoggingConfig(): LoggingConfig {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'development':
      return developmentConfig;
    case 'staging':
      return stagingConfig;
    case 'production':
      return productionConfig;
    default:
      return developmentConfig;
  }
}

// =====================================================
// CONFIGURACIONES ESPECÍFICAS POR COMPONENTE
// =====================================================

export const componentLoggingConfig = {
  'quotations-invoices': {
    level: 'info' as const,
    enableBusinessEvents: true,
    enablePerformanceMetrics: true,
  },
  'customers': {
    level: 'info' as const,
    enableBusinessEvents: true,
    enablePerformanceMetrics: false,
  },
  'inventory': {
    level: 'warn' as const,
    enableBusinessEvents: true,
    enablePerformanceMetrics: true,
  },
  'auth': {
    level: 'error' as const,
    enableBusinessEvents: false,
    enablePerformanceMetrics: false,
  },
  'payments': {
    level: 'info' as const,
    enableBusinessEvents: true,
    enablePerformanceMetrics: true,
  },
};

// =====================================================
// CONFIGURACIONES DE SEGURIDAD
// =====================================================

export const securityLoggingConfig = {
  enableSecurityEvents: true,
  enableAuditTrail: true,
  sensitiveFields: ['password', 'token', 'secret', 'key', 'ssn', 'credit_card'],
  maxRetentionDays: 90,
  encryptionRequired: true,
};

// =====================================================
// CONFIGURACIONES DE RENDIMIENTO
// =====================================================

export const performanceLoggingConfig = {
  enablePerformanceMetrics: true,
  slowQueryThreshold: 1000, // 1 segundo
  slowApiThreshold: 2000, // 2 segundos
  memoryThreshold: 100 * 1024 * 1024, // 100MB
  cpuThreshold: 80, // 80%
};

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

/**
 * Verificar si un campo es sensible
 */
export function isSensitiveField(fieldName: string): boolean {
  return securityLoggingConfig.sensitiveFields.some(sensitive => 
    fieldName.toLowerCase().includes(sensitive.toLowerCase())
  );
}

/**
 * Sanitizar datos para logging
 */
export function sanitizeForLogging(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (isSensitiveField(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Obtener configuración para un componente específico
 */
export function getComponentLoggingConfig(component: string) {
  return componentLoggingConfig[component as keyof typeof componentLoggingConfig] || {
    level: 'info' as const,
    enableBusinessEvents: true,
    enablePerformanceMetrics: false,
  };
}

/**
 * Verificar si se deben registrar eventos de negocio
 */
export function shouldLogBusinessEvents(component: string): boolean {
  const config = getComponentLoggingConfig(component);
  return config.enableBusinessEvents;
}

/**
 * Verificar si se deben registrar métricas de rendimiento
 */
export function shouldLogPerformanceMetrics(component: string): boolean {
  const config = getComponentLoggingConfig(component);
  return config.enablePerformanceMetrics;
}

