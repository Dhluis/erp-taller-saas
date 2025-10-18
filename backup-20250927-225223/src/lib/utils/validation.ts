/**
 * Utilidades de Validación
 * Funciones auxiliares para validación de datos
 */

import { z } from 'zod'
import { ValidationError } from '@/lib/errors'

/**
 * Valida datos con un esquema Zod
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((error) => {
        const path = error.path.join('.')
        fieldErrors[path] = error.message
      })
      
      return { success: false, errors: fieldErrors }
    }
  } catch (error) {
    const appError = new ValidationError('Error de validación')
    return { success: false, errors: { general: appError.message } }
  }
}

/**
 * Valida datos de forma asíncrona
 */
export async function validateDataAsync<T>(schema: z.ZodSchema<T>, data: unknown): Promise<{ success: boolean; data?: T; errors?: Record<string, string> }> {
  try {
    const result = await schema.safeParseAsync(data)
    
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((error) => {
        const path = error.path.join('.')
        fieldErrors[path] = error.message
      })
      
      return { success: false, errors: fieldErrors }
    }
  } catch (error) {
    const appError = new ValidationError('Error de validación asíncrona')
    return { success: false, errors: { general: appError.message } }
  }
}

/**
 * Valida un campo específico
 */
export function validateField<T>(schema: z.ZodSchema<T>, fieldName: string, value: any): { success: boolean; error?: string } {
  try {
    const fieldSchema = schema.pick({ [fieldName]: true } as any)
    const result = fieldSchema.safeParse({ [fieldName]: value })
    
    if (result.success) {
      return { success: true }
    } else {
      const error = result.error.errors[0]
      return { success: false, error: error.message }
    }
  } catch (error) {
    return { success: false, error: 'Error de validación' }
  }
}

/**
 * Sanitiza datos antes de la validación
 */
export function sanitizeData(data: any): any {
  if (typeof data === 'string') {
    return data.trim()
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeData)
  }
  
  if (data && typeof data === 'object') {
    const sanitized: any = {}
    Object.keys(data).forEach(key => {
      sanitized[key] = sanitizeData(data[key])
    })
    return sanitized
  }
  
  return data
}

/**
 * Valida y sanitiza datos
 */
export function validateAndSanitize<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } {
  const sanitizedData = sanitizeData(data)
  return validateData(schema, sanitizedData)
}

/**
 * Valida un array de datos
 */
export function validateArray<T>(schema: z.ZodSchema<T>, data: unknown[]): { success: boolean; data?: T[]; errors?: Record<string, string> } {
  const errors: Record<string, string> = {}
  const validData: T[] = []
  
  data.forEach((item, index) => {
    const result = validateData(schema, item)
    if (result.success && result.data) {
      validData.push(result.data)
    } else if (result.errors) {
      Object.keys(result.errors).forEach(key => {
        errors[`${index}.${key}`] = result.errors![key]
      })
    }
  })
  
  return {
    success: Object.keys(errors).length === 0,
    data: validData,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  }
}

/**
 * Valida datos de formulario
 */
export function validateFormData<T>(schema: z.ZodSchema<T>, formData: FormData): { success: boolean; data?: T; errors?: Record<string, string> } {
  const data: any = {}
  
  // Convertir FormData a objeto
  for (const [key, value] of formData.entries()) {
    data[key] = value
  }
  
  return validateData(schema, data)
}

/**
 * Valida datos de URL search params
 */
export function validateSearchParams<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): { success: boolean; data?: T; errors?: Record<string, string> } {
  const data: any = {}
  
  // Convertir URLSearchParams a objeto
  for (const [key, value] of searchParams.entries()) {
    data[key] = value
  }
  
  return validateData(schema, data)
}

/**
 * Valida datos de query string
 */
export function validateQueryString<T>(schema: z.ZodSchema<T>, queryString: string): { success: boolean; data?: T; errors?: Record<string, string> } {
  const searchParams = new URLSearchParams(queryString)
  return validateSearchParams(schema, searchParams)
}

/**
 * Valida datos de JSON
 */
export function validateJSON<T>(schema: z.ZodSchema<T>, jsonString: string): { success: boolean; data?: T; errors?: Record<string, string> } {
  try {
    const data = JSON.parse(jsonString)
    return validateData(schema, data)
  } catch (error) {
    return { success: false, errors: { general: 'JSON inválido' } }
  }
}

/**
 * Valida datos de CSV
 */
export function validateCSV<T>(schema: z.ZodSchema<T>, csvString: string, headers: string[]): { success: boolean; data?: T[]; errors?: Record<string, string> } {
  const lines = csvString.split('\n').filter(line => line.trim())
  const data: any[] = []
  const errors: Record<string, string> = {}
  
  lines.forEach((line, index) => {
    const values = line.split(',').map(value => value.trim())
    const row: any = {}
    
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] || ''
    })
    
    const result = validateData(schema, row)
    if (result.success && result.data) {
      data.push(result.data)
    } else if (result.errors) {
      Object.keys(result.errors).forEach(key => {
        errors[`${index}.${key}`] = result.errors![key]
      })
    }
  })
  
  return {
    success: Object.keys(errors).length === 0,
    data: data,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  }
}

/**
 * Valida datos de Excel (simulado)
 */
export function validateExcel<T>(schema: z.ZodSchema<T>, excelData: any[][]): { success: boolean; data?: T[]; errors?: Record<string, string> } {
  const errors: Record<string, string> = {}
  const validData: T[] = []
  
  excelData.forEach((row, index) => {
    if (index === 0) return // Skip header row
    
    const rowData: any = {}
    row.forEach((cell, cellIndex) => {
      rowData[`column_${cellIndex}`] = cell
    })
    
    const result = validateData(schema, rowData)
    if (result.success && result.data) {
      validData.push(result.data)
    } else if (result.errors) {
      Object.keys(result.errors).forEach(key => {
        errors[`${index}.${key}`] = result.errors![key]
      })
    }
  })
  
  return {
    success: Object.keys(errors).length === 0,
    data: validData,
    errors: Object.keys(errors).length > 0 ? errors : undefined
  }
}

/**
 * Valida datos de base de datos
 */
export function validateDatabaseData<T>(schema: z.ZodSchema<T>, dbData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Convertir datos de base de datos a formato esperado
  const convertedData = convertDatabaseData(dbData)
  return validateData(schema, convertedData)
}

/**
 * Convierte datos de base de datos a formato esperado
 */
function convertDatabaseData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(convertDatabaseData)
  }
  
  if (data && typeof data === 'object') {
    const converted: any = {}
    Object.keys(data).forEach(key => {
      // Convertir snake_case a camelCase
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      converted[camelKey] = convertDatabaseData(data[key])
    })
    return converted
  }
  
  return data
}

/**
 * Valida datos de API
 */
export function validateAPIData<T>(schema: z.ZodSchema<T>, apiData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Convertir datos de API a formato esperado
  const convertedData = convertAPIData(apiData)
  return validateData(schema, convertedData)
}

/**
 * Convierte datos de API a formato esperado
 */
function convertAPIData(data: any): any {
  if (Array.isArray(data)) {
    return data.map(convertAPIData)
  }
  
  if (data && typeof data === 'object') {
    const converted: any = {}
    Object.keys(data).forEach(key => {
      converted[key] = convertAPIData(data[key])
    })
    return converted
  }
  
  return data
}

/**
 * Valida datos de usuario
 */
export function validateUserData<T>(schema: z.ZodSchema<T>, userData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Sanitizar datos de usuario
  const sanitizedData = sanitizeData(userData)
  return validateData(schema, sanitizedData)
}

/**
 * Valida datos de configuración
 */
export function validateConfigData<T>(schema: z.ZodSchema<T>, configData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de configuración
  return validateData(schema, configData)
}

/**
 * Valida datos de entorno
 */
export function validateEnvData<T>(schema: z.ZodSchema<T>, envData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de entorno
  return validateData(schema, envData)
}

/**
 * Valida datos de sesión
 */
export function validateSessionData<T>(schema: z.ZodSchema<T>, sessionData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de sesión
  return validateData(schema, sessionData)
}

/**
 * Valida datos de cookies
 */
export function validateCookieData<T>(schema: z.ZodSchema<T>, cookieData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de cookies
  return validateData(schema, cookieData)
}

/**
 * Valida datos de local storage
 */
export function validateLocalStorageData<T>(schema: z.ZodSchema<T>, localStorageData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de local storage
  return validateData(schema, localStorageData)
}

/**
 * Valida datos de session storage
 */
export function validateSessionStorageData<T>(schema: z.ZodSchema<T>, sessionStorageData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de session storage
  return validateData(schema, sessionStorageData)
}

/**
 * Valida datos de indexedDB
 */
export function validateIndexedDBData<T>(schema: z.ZodSchema<T>, indexedDBData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de indexedDB
  return validateData(schema, indexedDBData)
}

/**
 * Valida datos de WebSocket
 */
export function validateWebSocketData<T>(schema: z.ZodSchema<T>, webSocketData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de WebSocket
  return validateData(schema, webSocketData)
}

/**
 * Valida datos de Server-Sent Events
 */
export function validateSSEData<T>(schema: z.ZodSchema<T>, sseData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de Server-Sent Events
  return validateData(schema, sseData)
}

/**
 * Valida datos de GraphQL
 */
export function validateGraphQLData<T>(schema: z.ZodSchema<T>, graphQLData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de GraphQL
  return validateData(schema, graphQLData)
}

/**
 * Valida datos de REST API
 */
export function validateRESTData<T>(schema: z.ZodSchema<T>, restData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de REST API
  return validateData(schema, restData)
}

/**
 * Valida datos de gRPC
 */
export function validateGRPCData<T>(schema: z.ZodSchema<T>, grpcData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de gRPC
  return validateData(schema, grpcData)
}

/**
 * Valida datos de tRPC
 */
export function validateTRPCData<T>(schema: z.ZodSchema<T>, trpcData: any): { success: boolean; data?: T; errors?: Record<string, string> } {
  // Validar datos de tRPC
  return validateData(schema, trpcData)
}
