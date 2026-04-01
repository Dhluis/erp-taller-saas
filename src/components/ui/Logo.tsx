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
        src="/eagles-logo-square.png"
        alt="EAGLES Logo"
        width={64}
        height={64}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  )
}

interface LogoWithTextProps extends LogoProps {
  companyName?: string
}

export function LogoWithText({ size = 'md', variant = 'default', className, companyName }: LogoWithTextProps) {
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
        <span className={cn('font-bold text-text-primary uppercase tracking-tight', textSizes[size])}>
          {companyName || 'EAGLES SYSTEM'}
        </span>
        <span className={cn('text-[10px] text-text-secondary leading-none mt-0.5 font-medium tracking-wider uppercase opacity-70', size === 'sm' ? 'hidden' : 'block')}>
          Sistema de Gestión
        </span>
      </div>
    </div>
  )
}
