'use client'

import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AuthProvider } from '@/contexts/AuthContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <SidebarProvider>
        {children}
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={5000}
        />
      </SidebarProvider>
    </AuthProvider>
  )
}
