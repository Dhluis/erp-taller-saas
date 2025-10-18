/**
 * Hooks de Validación
 * Proporciona hooks para validación de formularios y datos
 */

import { useForm, UseFormReturn, FieldValues, Path } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useCallback, useMemo } from 'react'
import { ValidationError } from '@/lib/errors'

/**
 * Hook principal para validación con Zod
 */
export function useValidation<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  defaultValues?: Partial<T>
): UseFormReturn<T> {
  return useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: defaultValues as T
  })
}

/**
 * Hook para validación de datos sin formulario
 */
export function useDataValidation<T>(schema: z.ZodSchema<T>) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  const validate = useCallback((data: unknown): { success: boolean; data?: T; errors?: Record<string, string> } => {
    try {
      const result = schema.safeParse(data)
      
      if (result.success) {
        setErrors({})
        setIsValid(true)
        return { success: true, data: result.data }
      } else {
        const fieldErrors: Record<string, string> = {}
        result.error.errors.forEach((error) => {
          const path = error.path.join('.')
          fieldErrors[path] = error.message
        })
        
        setErrors(fieldErrors)
        setIsValid(false)
        return { success: false, errors: fieldErrors }
      }
    } catch (error) {
      const appError = new ValidationError('Error de validación')
      setErrors({ general: appError.message })
      setIsValid(false)
      return { success: false, errors: { general: appError.message } }
    }
  }, [schema])

  const clearErrors = useCallback(() => {
    setErrors({})
    setIsValid(false)
  }, [])

  return {
    validate,
    errors,
    isValid,
    clearErrors
  }
}

/**
 * Hook para validación en tiempo real
 */
export function useRealtimeValidation<T extends FieldValues>(
  schema: z.ZodSchema<T>,
  defaultValues?: Partial<T>
) {
  const form = useValidation(schema, defaultValues)
  const [realtimeErrors, setRealtimeErrors] = useState<Record<string, string>>({})

  const validateField = useCallback(async (fieldName: Path<T>, value: any) => {
    try {
      // Crear un esquema parcial para el campo específico
      const fieldSchema = schema.pick({ [fieldName]: true } as any)
      const result = fieldSchema.safeParse({ [fieldName]: value })
      
      if (result.success) {
        setRealtimeErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[fieldName as string]
          return newErrors
        })
        return true
      } else {
        const error = result.error.errors[0]
        setRealtimeErrors(prev => ({
          ...prev,
          [fieldName as string]: error.message
        }))
        return false
      }
    } catch (error) {
      setRealtimeErrors(prev => ({
        ...prev,
        [fieldName as string]: 'Error de validación'
      }))
      return false
    }
  }, [schema])

  const validateAll = useCallback(async (data: T) => {
    try {
      const result = schema.safeParse(data)
      
      if (result.success) {
        setRealtimeErrors({})
        return { success: true, data: result.data }
      } else {
        const fieldErrors: Record<string, string> = {}
        result.error.errors.forEach((error) => {
          const path = error.path.join('.')
          fieldErrors[path] = error.message
        })
        
        setRealtimeErrors(fieldErrors)
        return { success: false, errors: fieldErrors }
      }
    } catch (error) {
      const appError = new ValidationError('Error de validación')
      setRealtimeErrors({ general: appError.message })
      return { success: false, errors: { general: appError.message } }
    }
  }, [schema])

  const clearRealtimeErrors = useCallback(() => {
    setRealtimeErrors({})
  }, [])

  return {
    ...form,
    validateField,
    validateAll,
    realtimeErrors,
    clearRealtimeErrors
  }
}

/**
 * Hook para validación de múltiples campos
 */
export function useMultiFieldValidation<T extends FieldValues>(
  schemas: Record<keyof T, z.ZodSchema<any>>,
  defaultValues?: Partial<T>
) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)

  const validateField = useCallback((fieldName: keyof T, value: any) => {
    const fieldSchema = schemas[fieldName]
    if (!fieldSchema) return true

    try {
      const result = fieldSchema.safeParse(value)
      
      if (result.success) {
        setFieldErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[fieldName as string]
          return newErrors
        })
        return true
      } else {
        const error = result.error.errors[0]
        setFieldErrors(prev => ({
          ...prev,
          [fieldName as string]: error.message
        }))
        return false
      }
    } catch (error) {
      setFieldErrors(prev => ({
        ...prev,
        [fieldName as string]: 'Error de validación'
      }))
      return false
    }
  }, [schemas])

  const validateAll = useCallback((data: T) => {
    const errors: Record<string, string> = {}
    let allValid = true

    Object.entries(schemas).forEach(([fieldName, fieldSchema]) => {
      const value = data[fieldName as keyof T]
      const result = fieldSchema.safeParse(value)
      
      if (!result.success) {
        const error = result.error.errors[0]
        errors[fieldName as string] = error.message
        allValid = false
      }
    })

    setFieldErrors(errors)
    setIsValid(allValid)
    
    return { success: allValid, errors }
  }, [schemas])

  const clearErrors = useCallback(() => {
    setFieldErrors({})
    setIsValid(false)
  }, [])

  return {
    validateField,
    validateAll,
    fieldErrors,
    isValid,
    clearErrors
  }
}

/**
 * Hook para validación de archivos
 */
export function useFileValidation(options: {
  maxSize?: number // en bytes
  allowedTypes?: string[]
  maxFiles?: number
}) {
  const [errors, setErrors] = useState<string[]>([])

  const validateFile = useCallback((file: File) => {
    const newErrors: string[] = []

    // Validar tamaño
    if (options.maxSize && file.size > options.maxSize) {
      newErrors.push(`El archivo es muy grande. Máximo ${Math.round(options.maxSize / 1024 / 1024)}MB`)
    }

    // Validar tipo
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      newErrors.push(`Tipo de archivo no permitido. Tipos permitidos: ${options.allowedTypes.join(', ')}`)
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }, [options])

  const validateFiles = useCallback((files: FileList) => {
    const newErrors: string[] = []

    // Validar cantidad
    if (options.maxFiles && files.length > options.maxFiles) {
      newErrors.push(`Máximo ${options.maxFiles} archivos permitidos`)
    }

    // Validar cada archivo
    Array.from(files).forEach((file, index) => {
      const fileErrors: string[] = []

      if (options.maxSize && file.size > options.maxSize) {
        fileErrors.push(`Archivo ${index + 1}: Muy grande`)
      }

      if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
        fileErrors.push(`Archivo ${index + 1}: Tipo no permitido`)
      }

      newErrors.push(...fileErrors)
    })

    setErrors(newErrors)
    return newErrors.length === 0
  }, [options])

  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])

  return {
    validateFile,
    validateFiles,
    errors,
    clearErrors
  }
}

/**
 * Hook para validación de fechas
 */
export function useDateValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateDate = useCallback((date: string, fieldName: string = 'date') => {
    const newErrors: Record<string, string> = { ...errors }
    
    // Validar formato
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(date)) {
      newErrors[fieldName] = 'Fecha debe estar en formato YYYY-MM-DD'
      setErrors(newErrors)
      return false
    }

    // Validar que sea una fecha válida
    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      newErrors[fieldName] = 'Fecha inválida'
      setErrors(newErrors)
      return false
    }

    // Validar que no sea futura (para fechas de nacimiento, etc.)
    if (parsedDate > new Date()) {
      newErrors[fieldName] = 'Fecha no puede ser futura'
      setErrors(newErrors)
      return false
    }

    delete newErrors[fieldName]
    setErrors(newErrors)
    return true
  }, [errors])

  const validateDateRange = useCallback((startDate: string, endDate: string) => {
    const newErrors: Record<string, string> = { ...errors }
    let isValid = true

    // Validar fecha de inicio
    if (!validateDate(startDate, 'startDate')) {
      isValid = false
    }

    // Validar fecha de fin
    if (!validateDate(endDate, 'endDate')) {
      isValid = false
    }

    // Validar que la fecha de inicio sea anterior a la de fin
    if (isValid) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      if (start >= end) {
        newErrors.dateRange = 'La fecha de inicio debe ser anterior a la fecha de fin'
        setErrors(newErrors)
        return false
      }
    }

    return isValid
  }, [errors, validateDate])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    validateDate,
    validateDateRange,
    errors,
    clearErrors
  }
}

/**
 * Hook para validación de emails
 */
export function useEmailValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateEmail = useCallback((email: string, fieldName: string = 'email') => {
    const newErrors: Record<string, string> = { ...errors }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      newErrors[fieldName] = 'Email inválido'
      setErrors(newErrors)
      return false
    }

    delete newErrors[fieldName]
    setErrors(newErrors)
    return true
  }, [errors])

  const validateEmails = useCallback((emails: string[], fieldName: string = 'emails') => {
    const newErrors: Record<string, string> = { ...errors }
    let allValid = true

    emails.forEach((email, index) => {
      if (!validateEmail(email, `${fieldName}[${index}]`)) {
        allValid = false
      }
    })

    return allValid
  }, [errors, validateEmail])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    validateEmail,
    validateEmails,
    errors,
    clearErrors
  }
}

/**
 * Hook para validación de teléfonos
 */
export function usePhoneValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validatePhone = useCallback((phone: string, fieldName: string = 'phone') => {
    const newErrors: Record<string, string> = { ...errors }
    
    // Remover espacios y caracteres especiales
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '')
    
    // Validar que solo contenga dígitos
    if (!/^\d+$/.test(cleanPhone)) {
      newErrors[fieldName] = 'Teléfono debe contener solo dígitos'
      setErrors(newErrors)
      return false
    }

    // Validar longitud
    if (cleanPhone.length < 10) {
      newErrors[fieldName] = 'Teléfono debe tener al menos 10 dígitos'
      setErrors(newErrors)
      return false
    }

    if (cleanPhone.length > 15) {
      newErrors[fieldName] = 'Teléfono no puede tener más de 15 dígitos'
      setErrors(newErrors)
      return false
    }

    delete newErrors[fieldName]
    setErrors(newErrors)
    return true
  }, [errors])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    validatePhone,
    errors,
    clearErrors
  }
}

/**
 * Hook para validación de RFC
 */
export function useRFCValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateRFC = useCallback((rfc: string, fieldName: string = 'rfc') => {
    const newErrors: Record<string, string> = { ...errors }
    
    // RFC persona física: 13 caracteres
    // RFC persona moral: 12 caracteres
    if (rfc.length < 12 || rfc.length > 13) {
      newErrors[fieldName] = 'RFC debe tener 12 o 13 caracteres'
      setErrors(newErrors)
      return false
    }

    // Validar formato básico
    const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/
    if (!rfcRegex.test(rfc.toUpperCase())) {
      newErrors[fieldName] = 'Formato de RFC inválido'
      setErrors(newErrors)
      return false
    }

    delete newErrors[fieldName]
    setErrors(newErrors)
    return true
  }, [errors])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    validateRFC,
    errors,
    clearErrors
  }
}
