'use client'

import { cn } from '@/lib/utils'
import Image from 'next/image'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'white' | 'dark'
  className?: string
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
}

export function Logo({ size = 'md', variant = 'default', className }: LogoProps) {
  return (
    <div className={cn('flex items-center justify-center', sizeClasses[size], className)}>
      <Image
        src="/logo-icon.svg"
        alt="EAGLES Logo"
        width={64}
        height={64}
        className="w-full h-full"
        priority
      />
    </div>
  )
}

export function LogoWithText({ size = 'md', variant = 'default', className }: LogoProps) {
  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Logo size={size} variant={variant} />
      <div className="flex flex-col">
        <span className={cn('font-bold text-text-primary', textSizes[size])}>
          EAGLES
        </span>
        <span className={cn('text-xs text-text-secondary', size === 'sm' ? 'text-xs' : 'text-xs')}>
          ERP Taller SaaS
        </span>
      </div>
    </div>
  )
}
