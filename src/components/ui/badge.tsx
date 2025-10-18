'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({
  children,
  variant = 'primary',
  size = 'md',
  className,
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center rounded-full font-medium'
  
  const variants = {
    primary: 'bg-primary/10 text-primary border border-primary/20',
    secondary: 'bg-bg-tertiary text-text-secondary border border-border',
    success: 'bg-success/10 text-success border border-success/20',
    warning: 'bg-warning/10 text-warning border border-warning/20',
    error: 'bg-error/10 text-error border border-error/20',
    info: 'bg-info/10 text-info border border-info/20',
  }
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  }

  return (
    <span
      className={cn(
        baseClasses,
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'pending' | 'completed' | 'cancelled' | 'in_progress'
  children?: ReactNode
  showDot?: boolean
  className?: string
}

export function StatusBadge({
  status,
  children,
  showDot = true,
  className,
}: StatusBadgeProps) {
  const statusConfig = {
    online: { variant: 'success' as const, dot: 'bg-success' },
    offline: { variant: 'secondary' as const, dot: 'bg-text-muted' },
    busy: { variant: 'warning' as const, dot: 'bg-warning' },
    away: { variant: 'info' as const, dot: 'bg-info' },
    pending: { variant: 'warning' as const, dot: 'bg-warning' },
    completed: { variant: 'success' as const, dot: 'bg-success' },
    cancelled: { variant: 'error' as const, dot: 'bg-error' },
    in_progress: { variant: 'info' as const, dot: 'bg-info' },
  }

  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={className}>
      {showDot && (
        <div className={`w-2 h-2 rounded-full mr-2 ${config.dot}`} />
      )}
      {children || status}
    </Badge>
  )
}

interface NotificationBadgeProps {
  count: number
  max?: number
  className?: string
}

export function NotificationBadge({ count, max = 99, className }: NotificationBadgeProps) {
  const displayCount = count > max ? `${max}+` : count.toString()

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-error text-white text-xs font-medium min-w-[20px] h-5 px-1.5',
        className
      )}
    >
      {displayCount}
    </span>
  )
}
