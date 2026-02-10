'use client'

import { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { SidebarProvider } from '@/contexts/SidebarContext'
import { SessionProvider } from '@/lib/context/SessionContext'
import { CurrencyProvider } from '@/lib/context/CurrencyContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <SessionProvider>
        <CurrencyProvider>
          <SidebarProvider>
            {children}
            <Toaster 
              position="top-right"
              richColors
              closeButton
              duration={5000}
            />
          </SidebarProvider>
        </CurrencyProvider>
      </SessionProvider>
    </ErrorBoundary>
  )
}
