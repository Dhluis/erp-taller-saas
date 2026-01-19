/**
 * Reglas de Validación - Sistema de Órdenes
 * Centraliza todas las validaciones en un solo lugar
 */

export const VALIDATION_RULES = {
  // Cliente
  customerName: {
    minLength: 3,
    maxLength: 100,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
    messages: {
      required: 'El nombre es requerido',
      minLength: 'Mínimo 3 caracteres',
      maxLength: 'Máximo 100 caracteres',
      pattern: 'Solo letras y espacios permitidos'
    }
  },
  
  customerPhone: {
    minLength: 10,
    maxLength: 13,
    pattern: /^\+?\d{10,13}$/,
    messages: {
      required: 'El teléfono es requerido',
      minLength: 'Mínimo 10 dígitos',
      maxLength: 'Máximo 13 dígitos',
      pattern: 'Formato: +52 444 123 4567 o 4441234567'
    }
  },
  
  customerEmail: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    messages: {
      pattern: 'Email inválido'
    }
  },
  
  // Vehículo
  vehicleBrand: {
    minLength: 2,
    maxLength: 50,
    messages: {
      required: 'La marca es requerida',
      minLength: 'Mínimo 2 caracteres',
      maxLength: 'Máximo 50 caracteres'
    }
  },
  
  vehicleModel: {
    minLength: 2,
    maxLength: 50,
    messages: {
      required: 'El modelo es requerido',
      minLength: 'Mínimo 2 caracteres',
      maxLength: 'Máximo 50 caracteres'
    }
  },
  
  vehicleYear: {
    min: 1900,
    max: new Date().getFullYear() + 1,
    messages: {
      required: 'El año es requerido',
      min: 'Año muy antiguo',
      max: 'Año inválido',
      invalid: 'Debe ser un año válido'
    }
  },
  
  vehiclePlate: {
    minLength: 5,
    maxLength: 15,
    pattern: /^[A-Z0-9\-]+$/i,
    messages: {
      required: 'La placa es requerida',
      minLength: 'Mínimo 5 caracteres',
      maxLength: 'Máximo 15 caracteres',
      pattern: 'Solo letras, números y guiones'
    }
  },
  
  vehicleColor: {
    minLength: 3,
    maxLength: 30,
    messages: {
      minLength: 'Mínimo 3 caracteres',
      maxLength: 'Máximo 30 caracteres'
    }
  },
  
  vehicleMileage: {
    min: 0,
    max: 999999,
    messages: {
      required: 'El kilometraje es requerido',
      min: 'El kilometraje no puede ser negativo',
      max: 'Kilometraje muy alto',
      invalid: 'Debe ser un número válido'
    }
  },
  
  // Orden
  description: {
    minLength: 10,
    maxLength: 500,
    messages: {
      required: 'La descripción es requerida',
      minLength: 'Mínimo 10 caracteres',
      maxLength: 'Máximo 500 caracteres'
    }
  },
  
  estimatedCost: {
    min: 0,
    max: 9999999,
    messages: {
      min: 'El costo no puede ser negativo',
      max: 'Costo muy alto',
      invalid: 'Debe ser un número válido'
    }
  }
} as const

/**
 * Helper para validar un campo
 */
export const validateField = (
  fieldName: keyof typeof VALIDATION_RULES,
  value: string | number
): string => {
  const rules = VALIDATION_RULES[fieldName]
  if (!rules) return ''
  
  const stringValue = String(value).trim()
  const numberValue = typeof value === 'number' ? value : parseFloat(stringValue)
  
  // Required
  if ('messages' in rules && 'required' in rules.messages) {
    if (!stringValue) return rules.messages.required
  }
  
  // MinLength
  if ('minLength' in rules && stringValue.length < rules.minLength) {
    return rules.messages.minLength
  }
  
  // MaxLength
  if ('maxLength' in rules && stringValue.length > rules.maxLength) {
    return rules.messages.maxLength
  }
  
  // Pattern
  if ('pattern' in rules && stringValue && !rules.pattern.test(stringValue)) {
    return rules.messages.pattern
  }
  
  // Min (números)
  if ('min' in rules && !isNaN(numberValue) && numberValue < rules.min) {
    return rules.messages.min
  }
  
  // Max (números)
  if ('max' in rules && !isNaN(numberValue) && numberValue > rules.max) {
    return rules.messages.max
  }
  
  return ''
}

/**
 * Validar múltiples campos a la vez
 */
export const validateFields = (
  fields: Record<string, string | number>
): Record<string, string> => {
  const errors: Record<string, string> = {}
  
  Object.entries(fields).forEach(([fieldName, value]) => {
    if (fieldName in VALIDATION_RULES) {
      const error = validateField(fieldName as keyof typeof VALIDATION_RULES, value)
      if (error) {
        errors[fieldName] = error
      }
    }
  })
  
  return errors
}


















