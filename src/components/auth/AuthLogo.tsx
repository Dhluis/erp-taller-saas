'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AuthLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function AuthLogo({ size = 'lg', showText = true }: AuthLogoProps) {
  const sizeClasses = {
    sm: 'h-12 w-auto',
    md: 'h-16 w-auto',
    lg: 'h-20 w-auto'
  }

  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center mb-4">
        <Image
          src="/eagles-logo-new.png"
          alt="EAGLES SYSTEM"
          width={200}
          height={100}
          className={cn(sizeClasses[size], "object-contain")}
          priority
        />
      </div>
      {showText && (
        <>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-gray-100">
            EAGLES SYSTEM
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sistema de Gestión de Talleres
          </p>
        </>
      )}
    </div>
  )
}







