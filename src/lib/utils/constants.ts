// ✅ CORRECTO: Utilidades para trabajar con constantes

import { 
  INVENTORY_CONSTANTS, 
  WORK_ORDER_CONSTANTS, 
  QUOTATION_CONSTANTS,
  INVOICE_CONSTANTS,
  WARRANTY_CONSTANTS,
  USER_CONSTANTS,
  CONFIG_CONSTANTS,
  PAGINATION_CONSTANTS,
  VALIDATION_CONSTANTS,
  ORGANIZATION_CONSTANTS,
  API_CONSTANTS,
  LOGGING_CONSTANTS,
  NOTIFICATION_CONSTANTS,
  REPORT_CONSTANTS,
  AUDIT_CONSTANTS,
  BUSINESS_HOURS_CONSTANTS,
  SECURITY_CONSTANTS
} from '@/lib/constants';

/**
 * Utilidades para inventario
 */
export const InventoryUtils = {
  /**
   * Verifica si el stock está bajo
   */
  isLowStock: (stock: number): boolean => {
    return stock <= INVENTORY_CONSTANTS.LOW_STOCK_THRESHOLD;
  },

  /**
   * Verifica si el stock está crítico
   */
  isCriticalStock: (stock: number): boolean => {
    return stock <= INVENTORY_CONSTANTS.CRITICAL_STOCK_THRESHOLD;
  },

  /**
   * Verifica si está fuera de stock
   */
  isOutOfStock: (stock: number): boolean => {
    return stock <= INVENTORY_CONSTANTS.OUT_OF_STOCK_THRESHOLD;
  },

  /**
   * Obtiene el estado del stock
   */
  getStockStatus: (stock: number): string => {
    if (stock <= INVENTORY_CONSTANTS.OUT_OF_STOCK_THRESHOLD) {
      return INVENTORY_CONSTANTS.STOCK_STATUS.OUT_OF_STOCK;
    }
    if (stock <= INVENTORY_CONSTANTS.CRITICAL_STOCK_THRESHOLD) {
      return INVENTORY_CONSTANTS.STOCK_STATUS.CRITICAL_STOCK;
    }
    if (stock <= INVENTORY_CONSTANTS.LOW_STOCK_THRESHOLD) {
      return INVENTORY_CONSTANTS.STOCK_STATUS.LOW_STOCK;
    }
    return INVENTORY_CONSTANTS.STOCK_STATUS.IN_STOCK;
  },

  /**
   * Obtiene el color del estado del stock
   */
  getStockStatusColor: (stock: number): string => {
    const status = InventoryUtils.getStockStatus(stock);
    switch (status) {
      case INVENTORY_CONSTANTS.STOCK_STATUS.OUT_OF_STOCK:
        return 'text-red-500';
      case INVENTORY_CONSTANTS.STOCK_STATUS.CRITICAL_STOCK:
        return 'text-orange-500';
      case INVENTORY_CONSTANTS.STOCK_STATUS.LOW_STOCK:
        return 'text-yellow-500';
      default:
        return 'text-green-500';
    }
  }
};

/**
 * Utilidades para órdenes de trabajo
 */
export const WorkOrderUtils = {
  /**
   * Verifica si la orden está pendiente
   */
  isPending: (status: string): boolean => {
    return status === WORK_ORDER_CONSTANTS.STATUS.PENDING;
  },

  /**
   * Verifica si la orden está en progreso
   */
  isInProgress: (status: string): boolean => {
    return status === WORK_ORDER_CONSTANTS.STATUS.IN_PROGRESS;
  },

  /**
   * Verifica si la orden está completada
   */
  isCompleted: (status: string): boolean => {
    return status === WORK_ORDER_CONSTANTS.STATUS.COMPLETED;
  },

  /**
   * Verifica si la orden está cancelada
   */
  isCancelled: (status: string): boolean => {
    return status === WORK_ORDER_CONSTANTS.STATUS.CANCELLED;
  },

  /**
   * Obtiene el color del estado
   */
  getStatusColor: (status: string): string => {
    switch (status) {
      case WORK_ORDER_CONSTANTS.STATUS.PENDING:
        return 'text-yellow-500';
      case WORK_ORDER_CONSTANTS.STATUS.IN_PROGRESS:
        return 'text-blue-500';
      case WORK_ORDER_CONSTANTS.STATUS.COMPLETED:
        return 'text-green-500';
      case WORK_ORDER_CONSTANTS.STATUS.CANCELLED:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }
};

/**
 * Utilidades para cotizaciones
 */
export const QuotationUtils = {
  /**
   * Verifica si la cotización está expirada
   */
  isExpired: (expiryDate: string): boolean => {
    return new Date(expiryDate) < new Date();
  },

  /**
   * Verifica si la cotización está activa
   */
  isActive: (status: string, expiryDate: string): boolean => {
    return status === QUOTATION_CONSTANTS.STATUS.SENT && !QuotationUtils.isExpired(expiryDate);
  },

  /**
   * Obtiene el color del estado
   */
  getStatusColor: (status: string, expiryDate: string): string => {
    if (QuotationUtils.isExpired(expiryDate)) {
      return 'text-red-500';
    }
    switch (status) {
      case QUOTATION_CONSTANTS.STATUS.DRAFT:
        return 'text-gray-500';
      case QUOTATION_CONSTANTS.STATUS.SENT:
        return 'text-blue-500';
      case QUOTATION_CONSTANTS.STATUS.ACCEPTED:
        return 'text-green-500';
      case QUOTATION_CONSTANTS.STATUS.REJECTED:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }
};

/**
 * Utilidades para facturas
 */
export const InvoiceUtils = {
  /**
   * Verifica si la factura está vencida
   */
  isOverdue: (dueDate: string): boolean => {
    return new Date(dueDate) < new Date();
  },

  /**
   * Verifica si la factura está pagada
   */
  isPaid: (status: string): boolean => {
    return status === INVOICE_CONSTANTS.STATUS.PAID;
  },

  /**
   * Obtiene el color del estado
   */
  getStatusColor: (status: string, dueDate: string): string => {
    if (InvoiceUtils.isOverdue(dueDate) && status !== INVOICE_CONSTANTS.STATUS.PAID) {
      return 'text-red-500';
    }
    switch (status) {
      case INVOICE_CONSTANTS.STATUS.DRAFT:
        return 'text-gray-500';
      case INVOICE_CONSTANTS.STATUS.SENT:
        return 'text-blue-500';
      case INVOICE_CONSTANTS.STATUS.PAID:
        return 'text-green-500';
      case INVOICE_CONSTANTS.STATUS.OVERDUE:
        return 'text-red-500';
      case INVOICE_CONSTANTS.STATUS.CANCELLED:
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  }
};

/**
 * Utilidades para garantías
 */
export const WarrantyUtils = {
  /**
   * Verifica si la garantía está activa
   */
  isActive: (status: string, endDate: string): boolean => {
    return status === WARRANTY_CONSTANTS.STATUS.ACTIVE && new Date(endDate) > new Date();
  },

  /**
   * Verifica si la garantía está expirada
   */
  isExpired: (endDate: string): boolean => {
    return new Date(endDate) < new Date();
  },

  /**
   * Obtiene el color del estado
   */
  getStatusColor: (status: string, endDate: string): string => {
    if (WarrantyUtils.isExpired(endDate)) {
      return 'text-red-500';
    }
    switch (status) {
      case WARRANTY_CONSTANTS.STATUS.ACTIVE:
        return 'text-green-500';
      case WARRANTY_CONSTANTS.STATUS.EXPIRED:
        return 'text-red-500';
      case WARRANTY_CONSTANTS.STATUS.CLAIMED:
        return 'text-blue-500';
      case WARRANTY_CONSTANTS.STATUS.VOID:
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  }
};

/**
 * Utilidades para usuarios
 */
export const UserUtils = {
  /**
   * Verifica si el usuario está activo
   */
  isActive: (status: string): boolean => {
    return status === USER_CONSTANTS.STATUS.ACTIVE;
  },

  /**
   * Obtiene el nivel de acceso como texto
   */
  getAccessLevelText: (level: number): string => {
    switch (level) {
      case USER_CONSTANTS.ACCESS_LEVELS.READ_ONLY:
        return 'Solo Lectura';
      case USER_CONSTANTS.ACCESS_LEVELS.BASIC:
        return 'Básico';
      case USER_CONSTANTS.ACCESS_LEVELS.STANDARD:
        return 'Estándar';
      case USER_CONSTANTS.ACCESS_LEVELS.ADVANCED:
        return 'Avanzado';
      case USER_CONSTANTS.ACCESS_LEVELS.ADMIN:
        return 'Administrador';
      case USER_CONSTANTS.ACCESS_LEVELS.SUPER_ADMIN:
        return 'Super Administrador';
      default:
        return 'Desconocido';
    }
  }
};

/**
 * Utilidades para validación
 */
export const ValidationUtils = {
  /**
   * Valida un email
   */
  isValidEmail: (email: string): boolean => {
    return VALIDATION_CONSTANTS.EMAIL_PATTERN.test(email);
  },

  /**
   * Valida un teléfono
   */
  isValidPhone: (phone: string): boolean => {
    return VALIDATION_CONSTANTS.PHONE_PATTERN.test(phone);
  },

  /**
   * Valida un VIN
   */
  isValidVIN: (vin: string): boolean => {
    return VALIDATION_CONSTANTS.VIN_PATTERN.test(vin);
  },

  /**
   * Valida un SKU
   */
  isValidSKU: (sku: string): boolean => {
    return VALIDATION_CONSTANTS.SKU_PATTERN.test(sku);
  },

  /**
   * Valida un año
   */
  isValidYear: (year: number): boolean => {
    return year >= VALIDATION_CONSTANTS.MIN_YEAR && year <= VALIDATION_CONSTANTS.MAX_YEAR;
  },

  /**
   * Valida un precio
   */
  isValidPrice: (price: number): boolean => {
    return price >= VALIDATION_CONSTANTS.MIN_PRICE && price <= VALIDATION_CONSTANTS.MAX_PRICE;
  }
};

/**
 * Utilidades para paginación
 */
export const PaginationUtils = {
  /**
   * Calcula el offset para la paginación
   */
  getOffset: (page: number, limit: number): number => {
    return (page - 1) * limit;
  },

  /**
   * Calcula el total de páginas
   */
  getTotalPages: (total: number, limit: number): number => {
    return Math.ceil(total / limit);
  },

  /**
   * Valida los parámetros de paginación
   */
  validatePagination: (page: number, limit: number): { page: number; limit: number } => {
    const validPage = Math.max(PAGINATION_CONSTANTS.DEFAULT_PAGE, page);
    const validLimit = Math.min(
      Math.max(PAGINATION_CONSTANTS.MIN_PAGE_SIZE, limit),
      PAGINATION_CONSTANTS.MAX_PAGE_SIZE
    );
    return { page: validPage, limit: validLimit };
  }
};

/**
 * Utilidades para fechas
 */
export const DateUtils = {
  /**
   * Formatea una fecha
   */
  formatDate: (date: string | Date, format: string = 'DD/MM/YYYY'): string => {
    const d = new Date(date);
    if (format === 'DD/MM/YYYY') {
      return d.toLocaleDateString('es-ES');
    }
    return d.toLocaleDateString();
  },

  /**
   * Formatea una fecha y hora
   */
  formatDateTime: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleString('es-ES');
  },

  /**
   * Obtiene la fecha relativa
   */
  getRelativeDate: (date: string | Date): string => {
    const d = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    if (diffInSeconds < 31536000) return `Hace ${Math.floor(diffInSeconds / 2592000)} meses`;
    return `Hace ${Math.floor(diffInSeconds / 31536000)} años`;
  }
};

/**
 * Utilidades para monedas
 */
export const CurrencyUtils = {
  /**
   * Formatea una cantidad como moneda
   */
  formatCurrency: (amount: number, currency: string = 'MXN'): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  /**
   * Formatea una cantidad sin símbolo de moneda
   */
  formatAmount: (amount: number): string => {
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }
};
















