// ✅ CORRECTO: Utilidades de validación con Zod

import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from '@/lib/errors/APIError';

/**
 * Utilidades para validación con Zod
 */
export class ValidationUtils {
  /**
   * Valida datos con un esquema de Zod
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        throw new ValidationError('Error de validación', {
          errors: errorMessages,
          fieldErrors: error.errors
        });
      }
      throw error;
    }
  }

  /**
   * Valida datos de forma segura (no lanza excepción)
   */
  static safeValidate<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: z.ZodError } {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error };
    }
  }

  /**
   * Valida query parameters
   */
  static validateQueryParams<T>(schema: z.ZodSchema<T>, request: NextRequest): T {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    // Convertir strings a números donde sea necesario
    const processedParams = this.processQueryParams(params);
    
    return this.validate(schema, processedParams);
  }

  /**
   * Valida body de request
   */
  static async validateBody<T>(schema: z.ZodSchema<T>, request: NextRequest): Promise<T> {
    try {
      const body = await request.json();
      return this.validate(schema, body);
    } catch (error) {
      throw new ValidationError('Error al parsear el body del request');
    }
  }

  /**
   * Procesa query parameters para conversión de tipos
   */
  private static processQueryParams(params: Record<string, string>): Record<string, any> {
    const processed: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      // Intentar convertir a número
      if (!isNaN(Number(value)) && value !== '') {
        processed[key] = Number(value);
      }
      // Intentar convertir a booleano
      else if (value === 'true') {
        processed[key] = true;
      } else if (value === 'false') {
        processed[key] = false;
      }
      // Mantener como string
      else {
        processed[key] = value;
      }
    }
    
    return processed;
  }

  /**
   * Crea una respuesta de error de validación
   */
  static createValidationErrorResponse(error: z.ZodError): NextResponse {
    const errorMessages = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return NextResponse.json(
      {
        success: false,
        error: 'Error de validación',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: {
          errors: errorMessages,
          fieldErrors: error.errors
        }
      },
      { status: 400 }
    );
  }

  /**
   * Valida UUID
   */
  static validateUUID(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  }

  /**
   * Valida email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida teléfono
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Valida VIN
   */
  static validateVIN(vin: string): boolean {
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(vin);
  }

  /**
   * Valida SKU
   */
  static validateSKU(sku: string): boolean {
    const skuRegex = /^[A-Z0-9-]+$/;
    return skuRegex.test(sku);
  }

  /**
   * Sanitiza string
   */
  static sanitizeString(value: string): string {
    return value
      .trim()
      .replace(/[<>]/g, '') // Remover caracteres peligrosos
      .replace(/\s+/g, ' '); // Normalizar espacios
  }

  /**
   * Sanitiza HTML
   */
  static sanitizeHTML(value: string): string {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remover scripts
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remover iframes
      .replace(/on\w+="[^"]*"/gi, '') // Remover event handlers
      .replace(/javascript:/gi, ''); // Remover javascript: URLs
  }

  /**
   * Valida fecha
   */
  static validateDate(dateString: string): boolean {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  }

  /**
   * Valida rango de fechas
   */
  static validateDateRange(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    return start <= end;
  }

  /**
   * Valida paginación
   */
  static validatePagination(page?: number, limit?: number): { page: number; limit: number } {
    const validPage = Math.max(1, page || 1);
    const validLimit = Math.min(Math.max(1, limit || 10), 100);
    
    return { page: validPage, limit: validLimit };
  }

  /**
   * Valida ordenamiento
   */
  static validateSorting(sortBy?: string, sortOrder?: string): { sortBy: string; sortOrder: 'asc' | 'desc' } {
    const validSortBy = sortBy || 'created_at';
    const validSortOrder = (sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc';
    
    return { sortBy: validSortBy, sortOrder: validSortOrder };
  }

  /**
   * Valida búsqueda
   */
  static validateSearch(search?: string): string {
    if (!search) return '';
    
    return this.sanitizeString(search)
      .substring(0, 100) // Limitar longitud
      .replace(/[^\w\s-]/g, ''); // Solo caracteres alfanuméricos, espacios y guiones
  }

  /**
   * Valida filtros
   */
  static validateFilters(filters: Record<string, any>): Record<string, any> {
    const validFilters: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        // Sanitizar strings
        if (typeof value === 'string') {
          validFilters[key] = this.sanitizeString(value);
        }
        // Validar UUIDs
        else if (key.includes('_id') && typeof value === 'string') {
          if (this.validateUUID(value)) {
            validFilters[key] = value;
          }
        }
        // Mantener otros tipos
        else {
          validFilters[key] = value;
        }
      }
    }
    
    return validFilters;
  }

  /**
   * Crea esquema de validación dinámico
   */
  static createDynamicSchema<T>(baseSchema: z.ZodSchema<T>, overrides: Partial<z.ZodSchema<T>>): z.ZodSchema<T> {
    return baseSchema.merge(z.object(overrides as any));
  }

  /**
   * Valida archivo
   */
  static validateFile(file: File, maxSize: number = 5 * 1024 * 1024, allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/gif']): boolean {
    if (file.size > maxSize) {
      return false;
    }
    
    if (!allowedTypes.includes(file.type)) {
      return false;
    }
    
    return true;
  }

  /**
   * Valida tamaño de archivo
   */
  static validateFileSize(file: File, maxSize: number): boolean {
    return file.size <= maxSize;
  }

  /**
   * Valida tipo de archivo
   */
  static validateFileType(file: File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.type);
  }

  /**
   * Crea mensaje de error personalizado
   */
  static createErrorMessage(field: string, message: string): string {
    return `${field}: ${message}`;
  }

  /**
   * Valida organización
   */
  static validateOrganization(organizationId: string): boolean {
    if (!organizationId) return false;
    // ❌ NO aceptar IDs hardcodeados - solo UUIDs válidos
    return this.validateUUID(organizationId);
  }

  /**
   * Obtiene organización del request
   * ❌ NO usar fallbacks hardcodeados - siempre debe venir del usuario autenticado
   */
  static getOrganizationFromRequest(request: NextRequest): string | null {
    // Intentar obtener de headers
    const orgHeader = request.headers.get('x-organization-id');
    if (orgHeader && this.validateOrganization(orgHeader)) {
      return orgHeader;
    }
    
    // Intentar obtener de query params
    const url = new URL(request.url);
    const orgParam = url.searchParams.get('organization_id');
    if (orgParam && this.validateOrganization(orgParam)) {
      return orgParam;
    }
    
    // ❌ NO usar fallback - retornar null para que el código que llama maneje el error
    return null;
  }
}

