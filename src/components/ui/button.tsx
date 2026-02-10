'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// Función buttonVariants para compatibilidad con otros componentes
export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md font-medium transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-bg-primary hover:bg-primary-dark shadow-primary",
        primary: "bg-primary text-bg-primary hover:bg-primary-dark shadow-primary",
        secondary: "bg-bg-tertiary text-text-primary border border-border hover:bg-bg-quaternary hover:border-primary/50",
        ghost: "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary",
        danger: "bg-error text-white hover:bg-error-dark",
        success: "bg-success text-white hover:bg-success-dark",
        warning: "bg-warning text-white hover:bg-warning-dark",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  
  const variants = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm',
    secondary: 'bg-bg-tertiary text-text-primary border border-border hover:bg-bg-quaternary hover:border-primary/50',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
    danger: 'bg-error text-white hover:bg-error-dark',
    success: 'bg-success text-white hover:bg-success-dark',
    warning: 'bg-warning text-white hover:bg-warning-dark',
    outline: 'border border-primary/50 bg-transparent text-primary hover:bg-primary/10 hover:border-primary',
  }
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      
      {children}
      
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </button>
  )
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: IconButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'
  
  const variants = {
    primary: 'bg-primary text-bg-primary hover:bg-primary-dark shadow-primary',
    secondary: 'bg-bg-tertiary text-text-primary border border-border hover:bg-bg-quaternary hover:border-primary/50',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
    danger: 'bg-error text-white hover:bg-error-dark',
  }
  
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  }

  return (
    <button
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
    </button>
  )
}
