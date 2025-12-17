/**
 * Componente FormField Reutilizable
 * Campo de formulario con validación y manejo de errores
 */

"use client"

import { forwardRef } from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { CalendarIcon, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'switch' | 'date' | 'datetime' | 'time'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  options?: { value: string; label: string; disabled?: boolean }[]
  value?: any
  onChange?: (value: any) => void
  onBlur?: () => void
  className?: string
  inputClassName?: string
  labelClassName?: string
  errorClassName?: string
  helperClassName?: string
  rows?: number
  min?: number
  max?: number
  step?: number
  pattern?: string
  autoComplete?: string
  autoFocus?: boolean
  readOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'ghost'
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(({
  label,
  name,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
  error,
  helperText,
  options = [],
  value,
  onChange,
  onBlur,
  className = '',
  inputClassName = '',
  labelClassName = '',
  errorClassName = '',
  helperClassName = '',
  rows = 3,
  min,
  max,
  step,
  pattern,
  autoComplete,
  autoFocus = false,
  readOnly = false,
  size = 'md',
  variant = 'default'
}, ref) => {
  const handleChange = (newValue: any) => {
    onChange?.(newValue)
  }

  const handleBlur = () => {
    onBlur?.()
  }

  const renderInput = () => {
    const baseProps = {
      id: name,
      name,
      value: value || '',
      onChange: (e: any) => handleChange(e.target.value),
      onBlur: handleBlur,
      disabled,
      required,
      autoFocus,
      readOnly,
      className: cn(
        'w-full',
        size === 'sm' && 'h-8 text-sm',
        size === 'md' && 'h-10',
        size === 'lg' && 'h-12 text-lg',
        error && 'border-red-500 focus:border-red-500',
        inputClassName
      )
    }

    switch (type) {
      case 'textarea':
        return (
          <Textarea
            {...baseProps}
            placeholder={placeholder}
            rows={rows}
            className={cn(baseProps.className, 'resize-none')}
          />
        )

      case 'select':
        // ✅ FIX: Convertir value vacío a undefined y filtrar options con value vacío
        const selectValue = value === '' ? undefined : value;
        const validOptions = options.filter(opt => opt.value !== '');
        
        return (
          <Select value={selectValue} onValueChange={handleChange} disabled={disabled}>
            <SelectTrigger className={baseProps.className}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {validOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={name}
              checked={value || false}
              onCheckedChange={handleChange}
              disabled={disabled}
            />
            <Label htmlFor={name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </Label>
          </div>
        )

      case 'radio':
        return (
          <RadioGroup value={value} onValueChange={handleChange} disabled={disabled}>
            {options.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${name}-${option.value}`} />
                <Label htmlFor={`${name}-${option.value}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )

      case 'switch':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              id={name}
              checked={value || false}
              onCheckedChange={handleChange}
              disabled={disabled}
            />
            <Label htmlFor={name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
            </Label>
          </div>
        )

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !value && 'text-muted-foreground',
                  baseProps.className
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : <span>{placeholder || 'Seleccionar fecha'}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => handleChange(date?.toISOString().split('T')[0])}
                disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )

      case 'datetime':
        return (
          <Input
            {...baseProps}
            type="datetime-local"
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
          />
        )

      case 'time':
        return (
          <Input
            {...baseProps}
            type="time"
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
          />
        )

      default:
        return (
          <Input
            {...baseProps}
            type={type}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
            autoComplete={autoComplete}
            ref={ref}
          />
        )
    }
  }

  if (type === 'checkbox' || type === 'switch') {
    return (
      <div className={cn('space-y-2', className)}>
        {renderInput()}
        {error && (
          <div className={cn('flex items-center gap-2 text-sm text-red-500', errorClassName)}>
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        {helperText && !error && (
          <div className={cn('text-sm text-muted-foreground', helperClassName)}>
            {helperText}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label
        htmlFor={name}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          required && 'after:content-["*"] after:ml-0.5 after:text-red-500',
          labelClassName
        )}
      >
        {label}
      </Label>
      
      {renderInput()}
      
      {error && (
        <div className={cn('flex items-center gap-2 text-sm text-red-500', errorClassName)}>
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div className={cn('text-sm text-muted-foreground', helperClassName)}>
          {helperText}
        </div>
      )}
    </div>
  )
})

FormField.displayName = 'FormField'







