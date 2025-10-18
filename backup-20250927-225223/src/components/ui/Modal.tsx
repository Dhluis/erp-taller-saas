/**
 * Componente Modal Reutilizable
 * Modal con diferentes tamaños y funcionalidades
 */

"use client"

import { useState, useEffect, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  showCloseButton?: boolean
  showHeader?: boolean
  showFooter?: boolean
  footer?: ReactNode
  actions?: ReactNode
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  loading?: boolean
  disabled?: boolean
  className?: string
  overlayClassName?: string
  contentClassName?: string
  headerClassName?: string
  footerClassName?: string
  closeOnOverlayClick?: boolean
  closeOnEscape?: boolean
  preventScroll?: boolean
  zIndex?: number
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  variant = 'default',
  showCloseButton = true,
  showHeader = true,
  showFooter = true,
  footer,
  actions,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  loading = false,
  disabled = false,
  className = '',
  overlayClassName = '',
  contentClassName = '',
  headerClassName = '',
  footerClassName = '',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  preventScroll = true,
  zIndex = 50
}: ModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimating(true)
      
      if (preventScroll) {
        document.body.style.overflow = 'hidden'
      }
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => {
        setIsVisible(false)
        if (preventScroll) {
          document.body.style.overflow = 'unset'
        }
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, preventScroll])
  
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, closeOnEscape, onClose])
  
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose()
    }
  }
  
  const handleConfirm = () => {
    if (onConfirm && !loading && !disabled) {
      onConfirm()
    }
  }
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onClose()
    }
  }
  
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'max-w-sm'
      case 'md':
        return 'max-w-md'
      case 'lg':
        return 'max-w-lg'
      case 'xl':
        return 'max-w-xl'
      case 'full':
        return 'max-w-full mx-4'
      default:
        return 'max-w-md'
    }
  }
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'info':
        return 'border-blue-200 bg-blue-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }
  
  const getVariantIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      default:
        return null
    }
  }
  
  const getVariantTitleColor = () => {
    switch (variant) {
      case 'success':
        return 'text-green-900'
      case 'warning':
        return 'text-yellow-900'
      case 'error':
        return 'text-red-900'
      case 'info':
        return 'text-blue-900'
      default:
        return 'text-gray-900'
    }
  }
  
  if (!isVisible) return null
  
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        overlayClassName
      )}
      style={{ zIndex }}
      onClick={handleOverlayClick}
    >
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
      />
      
      {/* Modal */}
      <div
        className={cn(
          'relative w-full transform transition-all duration-300',
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
          getSizeStyles(),
          className
        )}
      >
        <Card className={cn(getVariantStyles(), contentClassName)}>
          {/* Header */}
          {showHeader && (title || description || showCloseButton) && (
            <CardHeader className={cn('flex flex-row items-center justify-between space-y-0 pb-4', headerClassName)}>
              <div className="flex items-center gap-3">
                {getVariantIcon()}
                <div>
                  {title && (
                    <CardTitle className={cn('text-lg font-semibold', getVariantTitleColor())}>
                      {title}
                    </CardTitle>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {description}
                    </p>
                  )}
                </div>
              </div>
              
              {showCloseButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
          )}
          
          {/* Content */}
          <CardContent className="space-y-4">
            {children}
          </CardContent>
          
          {/* Footer */}
          {showFooter && (actions || onConfirm || onCancel) && (
            <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200', footerClassName)}>
              {actions}
              
              {onCancel && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={loading || disabled}
                >
                  {cancelText}
                </Button>
              )}
              
              {onConfirm && (
                <Button
                  onClick={handleConfirm}
                  disabled={loading || disabled}
                  variant={variant === 'error' ? 'destructive' : 'default'}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Cargando...
                    </>
                  ) : (
                    confirmText
                  )}
                </Button>
              )}
            </div>
          )}
          
          {footer}
        </Card>
      </div>
    </div>
  )
}

export default Modal
