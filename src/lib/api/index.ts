/**
 * API Utilities - Exportaciones centralizadas
 * 
 * Este archivo exporta todas las utilidades de API de forma organizada
 */

// Utilidades de fetch seguras
export {
  safeFetch,
  safeGet,
  safePost,
  safePut,
  safeDelete,
  safePatch,
  handleApiError,
  useSafeFetch,
  type SafeFetchOptions,
  type SafeFetchResponse,
  type ApiError,
} from './fetch-utils';

// Re-exportar como default para importación fácil
export { default as fetchUtils } from './fetch-utils';

// Configuraciones por defecto
export const DEFAULT_FETCH_CONFIG = {
  timeout: 10000,
  retries: 2,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

// URLs base de la API
export const API_BASE_URLS = {
  CUSTOMERS: '/api/customers',
  VEHICLES: '/api/vehicles',
  INVENTORY: '/api/inventory',
  ORDERS: '/api/orders',
  QUOTATIONS: '/api/quotations',
  INVOICES: '/api/invoices',
  PAYMENTS: '/api/payments',
} as const;

// Tipos comunes de la API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Funciones de conveniencia para endpoints específicos
export async function fetchCustomers() {
  const { safeGet } = await import('./fetch-utils');
  return safeGet(API_BASE_URLS.CUSTOMERS);
}

export async function fetchVehicles() {
  const { safeGet } = await import('./fetch-utils');
  return safeGet(API_BASE_URLS.VEHICLES);
}

export async function fetchInventory() {
  const { safeGet } = await import('./fetch-utils');
  return safeGet(API_BASE_URLS.INVENTORY);
}

export async function fetchOrders() {
  const { safeGet } = await import('./fetch-utils');
  return safeGet(API_BASE_URLS.ORDERS);
}

export async function fetchQuotations() {
  const { safeGet } = await import('./fetch-utils');
  return safeGet(API_BASE_URLS.QUOTATIONS);
}

export async function fetchInvoices() {
  const { safeGet } = await import('./fetch-utils');
  return safeGet(API_BASE_URLS.INVOICES);
}

export async function fetchPayments() {
  const { safeGet } = await import('./fetch-utils');
  return safeGet(API_BASE_URLS.PAYMENTS);
}


















