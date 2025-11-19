'use client'

import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { OrganizationProvider } from '@/contexts/OrganizationContext'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <SidebarProvider>
          {children}
          <Toaster 
            position="top-right"
            richColors
            closeButton
            duration={5000}
          />
        </SidebarProvider>
      </OrganizationProvider>
    </AuthProvider>
  )
}
