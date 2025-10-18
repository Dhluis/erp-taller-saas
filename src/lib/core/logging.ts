/**
 * Sistema de Logging Robusto
 * Proporciona logging estructurado con diferentes niveles y contextos
 */

// =====================================================
// TIPOS E INTERFACES
// =====================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  organizationId?: string;
  userId?: string;
  requestId?: string;
  component?: string;
  function?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  data?: any;
}

// =====================================================
// CONFIGURACIÓN DE LOGGING
// =====================================================

interface LoggingConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
  maxRetries: number;
  batchSize: number;
  flushInterval: number;
}

const defaultConfig: LoggingConfig = {
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  enableConsole: true,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NEXT_PUBLIC_LOGGING_ENDPOINT,
  maxRetries: 3,
  batchSize: 10,
  flushInterval: 5000, // 5 segundos
};

// =====================================================
// CLASE LOGGER
// =====================================================

class Logger {
  private config: LoggingConfig;
  private logQueue: LogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<LoggingConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.startFlushTimer();
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext, error?: Error, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error,
      data,
    };
  }

  private logToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const { timestamp, level, message, context, error, data } = entry;
    const contextStr = context ? ` [${JSON.stringify(context)}]` : '';
    const errorStr = error ? `\nError: ${error.stack}` : '';
    const dataStr = data ? `\nData: ${JSON.stringify(data, null, 2)}` : '';

    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}${errorStr}${dataStr}`;

    switch (level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
      case 'fatal':
        console.error(logMessage);
        break;
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) return;

    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  private addToQueue(entry: LogEntry): void {
    this.logQueue.push(entry);

    if (this.logQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const entries = [...this.logQueue];
    this.logQueue = [];

    // Log to console
    entries.forEach(entry => this.logToConsole(entry));

    // Log to remote
    if (this.config.enableRemote) {
      try {
        await this.logToRemote({
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Batch log entries',
          data: entries,
        });
      } catch (error) {
        console.error('Failed to flush logs to remote:', error);
      }
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error, data?: any): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatMessage(level, message, context, error, data);
    this.addToQueue(entry);
  }

  // Métodos públicos
  debug(message: string, context?: LogContext, data?: any): void {
    this.log('debug', message, context, undefined, data);
  }

  info(message: string, context?: LogContext, data?: any): void {
    this.log('info', message, context, undefined, data);
  }

  warn(message: string, context?: LogContext, error?: Error, data?: any): void {
    this.log('warn', message, context, error, data);
  }

  error(message: string, context?: LogContext, error?: Error, data?: any): void {
    this.log('error', message, context, error, data);
  }

  fatal(message: string, context?: LogContext, error?: Error, data?: any): void {
    this.log('fatal', message, context, error, data);
  }

  // Métodos especializados
  apiCall(method: string, endpoint: string, status: number, duration: number, context?: LogContext): void {
    this.info(`API ${method} ${endpoint} - ${status} (${duration}ms)`, {
      ...context,
      apiMethod: method,
      apiEndpoint: endpoint,
      apiStatus: status,
      apiDuration: duration,
    });
  }

  databaseQuery(operation: string, table: string, duration: number, context?: LogContext): void {
    this.info(`DB ${operation} ${table} (${duration}ms)`, {
      ...context,
      dbOperation: operation,
      dbTable: table,
      dbDuration: duration,
    });
  }

  businessEvent(event: string, entity: string, entityId: string, context?: LogContext): void {
    this.info(`Business Event: ${event} on ${entity}`, {
      ...context,
      businessEvent: event,
      businessEntity: entity,
      businessEntityId: entityId,
    });
  }

  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    this.warn(`Security Event: ${event}`, undefined, undefined, {
      ...context,
      securityEvent: event,
      securitySeverity: severity,
    });
  }

  performanceMetric(metric: string, value: number, unit: string, context?: LogContext): void {
    this.info(`Performance: ${metric} = ${value}${unit}`, {
      ...context,
      performanceMetric: metric,
      performanceValue: value,
      performanceUnit: unit,
    });
  }

  // Limpiar recursos
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
  }
}

// =====================================================
// INSTANCIA GLOBAL
// =====================================================

export const logger = new Logger();

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

/**
 * Crear contexto de logging para una operación
 */
export function createLogContext(
  organizationId?: string,
  userId?: string,
  component?: string,
  functionName?: string,
  additionalData?: Record<string, any>
): LogContext {
  return {
    organizationId,
    userId,
    component,
    function: functionName,
    requestId: Math.random().toString(36).substring(2, 15),
    ...additionalData,
  };
}

/**
 * Medir tiempo de ejecución de una función
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  operation: string,
  context?: LogContext
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    logger.info(`Operation completed: ${operation}`, context, { duration });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    
    logger.error(`Operation failed: ${operation}`, context, error as Error, { duration });
    throw error;
  }
}

/**
 * Log de operaciones de base de datos
 */
export function logDatabaseOperation(
  operation: string,
  table: string,
  duration: number,
  context?: LogContext
): void {
  logger.databaseQuery(operation, table, duration, context);
}

/**
 * Log de eventos de negocio
 */
export function logBusinessEvent(
  event: string,
  entity: string,
  entityId: string,
  context?: LogContext
): void {
  logger.businessEvent(event, entity, entityId, context);
}

/**
 * Log de errores de Supabase
 */
export function logSupabaseError(
  operation: string,
  error: any,
  context?: LogContext
): void {
  const errorMessage = error?.message || 'Unknown Supabase error';
  const errorCode = error?.code || 'UNKNOWN';
  const errorDetails = error?.details || '';
  
  logger.error(`Supabase Error in ${operation}`, context, error, {
    supabaseError: errorMessage,
    supabaseCode: errorCode,
    supabaseDetails: errorDetails,
  });
}

/**
 * Log de validaciones
 */
export function logValidation(
  entity: string,
  field: string,
  value: any,
  isValid: boolean,
  context?: LogContext
): void {
  logger.info(`Validation: ${entity}.${field} = ${JSON.stringify(value)} (${isValid ? 'valid' : 'invalid'})`, {
    ...context,
    validationEntity: entity,
    validationField: field,
    validationValue: value,
    validationResult: isValid,
  });
}

// =====================================================
// EXPORTACIONES
// =====================================================

export default logger;

