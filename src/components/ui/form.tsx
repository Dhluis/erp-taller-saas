/**
 * Componente Form Reutilizable
 * Formulario completo con validación y manejo de errores
 */

"use client"

import { useState, useCallback, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField, FormFieldProps } from './FormField'
import { useValidation } from '@/hooks/useValidation'
import { z } from 'zod'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface FormFieldConfig extends Omit<FormFieldProps, 'value' | 'onChange' | 'onBlur'> {
  key: string
  gridCols?: number
  hidden?: boolean
  conditional?: {
    field: string
    value: any
    operator?: 'equals' | 'not_equals' | 'contains' | 'not_contains'
  }
}

export interface FormProps {
  title?: string
  description?: string
  fields: FormFieldConfig[]
  schema: z.ZodSchema<any>
  defaultValues?: Record<string, any>
  onSubmit: (data: any) => Promise<void> | void
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  loading?: boolean
  disabled?: boolean
  className?: string
  cardClassName?: string
  headerClassName?: string
  contentClassName?: string
  footerClassName?: string
  gridCols?: number
  spacing?: 'sm' | 'md' | 'lg'
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
  showSuccessMessage?: boolean
  successMessage?: string
  showErrorMessage?: boolean
  errorMessage?: string
  actions?: ReactNode
  footer?: ReactNode
}

export function Form({
  title,
  description,
  fields,
  schema,
  defaultValues = {},
  onSubmit,
  onCancel,
  submitText = 'Guardar',
  cancelText = 'Cancelar',
  loading = false,
  disabled = false,
  className = '',
  cardClassName = '',
  headerClassName = '',
  contentClassName = '',
  footerClassName = '',
  gridCols = 1,
  spacing = 'md',
  size = 'md',
  variant = 'default',
  showSuccessMessage = false,
  successMessage = 'Formulario enviado correctamente',
  showErrorMessage = false,
  errorMessage = 'Error al enviar el formulario',
  actions,
  footer
}: FormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  
  const form = useValidation(schema, defaultValues)
  
  const { values, errors, touched, isValid, setValue, setTouched, reset } = form
  
  const handleFieldChange = useCallback((fieldKey: string, value: any) => {
    setValue(fieldKey, value)
    setTouched(fieldKey, true)
  }, [setValue, setTouched])
  
  const handleFieldBlur = useCallback((fieldKey: string) => {
    setTouched(fieldKey, true)
  }, [setTouched])
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isValid || isSubmitting) return
    
    setIsSubmitting(true)
    setSubmitError(null)
    setSubmitSuccess(false)
    
    try {
      await onSubmit(values)
      setSubmitSuccess(true)
      reset()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Error desconocido')
    } finally {
      setIsSubmitting(false)
    }
  }, [isValid, isSubmitting, values, onSubmit, reset])
  
  const handleCancel = useCallback(() => {
    reset()
    onCancel?.()
  }, [reset, onCancel])
  
  const getVisibleFields = useCallback(() => {
    return fields.filter(field => {
      if (field.hidden) return false
      
      if (field.conditional) {
        const { field: conditionalField, value: conditionalValue, operator = 'equals' } = field.conditional
        const fieldValue = values[conditionalField]
        
        switch (operator) {
          case 'equals':
            return fieldValue === conditionalValue
          case 'not_equals':
            return fieldValue !== conditionalValue
          case 'contains':
            return fieldValue?.toString().includes(conditionalValue?.toString())
          case 'not_contains':
            return !fieldValue?.toString().includes(conditionalValue?.toString())
          default:
            return true
        }
      }
      
      return true
    })
  }, [fields, values])
  
  const visibleFields = getVisibleFields()
  
  const getGridClassName = (field: FormFieldConfig) => {
    const cols = field.gridCols || gridCols
    return cn(
      'col-span-1',
      cols === 1 && 'col-span-1',
      cols === 2 && 'col-span-2',
      cols === 3 && 'col-span-3',
      cols === 4 && 'col-span-4',
      cols === 6 && 'col-span-6',
      cols === 12 && 'col-span-12'
    )
  }
  
  const getSpacingClassName = () => {
    switch (spacing) {
      case 'sm': return 'gap-2'
      case 'md': return 'gap-4'
      case 'lg': return 'gap-6'
      default: return 'gap-4'
    }
  }
  
  return (
    <Card className={cn('w-full', cardClassName, className)}>
      {(title || description) && (
        <CardHeader className={headerClassName}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </CardHeader>
      )}
      
      <CardContent className={contentClassName}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mensajes de estado */}
          {submitSuccess && showSuccessMessage && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}
          
          {submitError && showErrorMessage && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errorMessage}: {submitError}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Campos del formulario */}
          <div className={cn('grid grid-cols-12', getSpacingClassName())}>
            {visibleFields.map((field) => (
              <div key={field.key} className={getGridClassName(field)}>
                <FormField
                  {...field}
                  value={values[field.key]}
                  onChange={(value) => handleFieldChange(field.key, value)}
                  onBlur={() => handleFieldBlur(field.key)}
                  error={touched[field.key] ? errors[field.key]?.message : undefined}
                  disabled={disabled || loading}
                  size={size}
                  variant={variant}
                />
              </div>
            ))}
          </div>
          
          {/* Acciones del formulario */}
          <div className={cn('flex items-center justify-end gap-4', footerClassName)}>
            {actions}
            
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={disabled || loading}
                size={size}
              >
                {cancelText}
              </Button>
            )}
            
            <Button
              type="submit"
              disabled={!isValid || disabled || loading || isSubmitting}
              size={size}
              variant={variant}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                submitText
              )}
            </Button>
          </div>
          
          {footer}
        </form>
      </CardContent>
    </Card>
  )
}

export default Form
