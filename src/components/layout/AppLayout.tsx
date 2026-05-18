'use client'

import { ReactNode, useState, createContext, useContext, Suspense } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Breadcrumb } from './Breadcrumb'
import { FloatingAgentButton } from '@/components/agent/FloatingAgentButton'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'
import { FloatingAIAssistant } from '@/components/dashboard/FloatingAIAssistant'
import { usePermissions } from '@/hooks/usePermissions'
import { TrialBanner } from '@/components/billing/TrialBanner'
import { MobileBottomNav } from './MobileBottomNav'

// Prevents double-rendering when a page AND the root layout both wrap with AppLayout
const AppLayoutMountedCtx = createContext(false)

interface AppLayoutProps {
  children: ReactNode
  title?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
}

/**
 * =====================================================
 * LAYOUT PRINCIPAL DEL ERP CONFIA DRIVE
 * =====================================================
 * Layout base con sidebar, header y contenido principal
 * usando el tema oscuro moderno
 */
export function AppLayout({ children, title, breadcrumbs }: AppLayoutProps) {
  const alreadyMounted = useContext(AppLayoutMountedCtx)
  const { isDark } = useTheme()
  const { isCollapsed } = useSidebar()
  const permissions = usePermissions()
  const isMechanic = permissions.isMechanic
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // If a parent already rendered AppLayout (e.g. root GlobalLayoutWrapper), just pass through
  if (alreadyMounted) {
    return <>{children}</>
  }

  return (
    <AppLayoutMountedCtx.Provider value={true}>
      <div className={`min-h-screen ${isDark ? 'dark' : ''}`}>
        <div className="flex h-screen bg-bg-primary">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block shrink-0 relative z-20">
            <Suspense fallback={<div className="w-64 bg-bg-secondary h-full animate-pulse" />}>
              <Sidebar />
            </Suspense>
          </aside>

          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div className="fixed inset-0 z-[100] lg:hidden">
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="absolute left-0 top-0 h-full bg-bg-secondary shadow-2xl transition-transform transform translate-x-0">
                <Suspense fallback={<div className="w-64 bg-bg-secondary h-full animate-pulse" />}>
                  {/* Pasamos una clase adicional para forzar que en el drawer nunca parezca colapsado visualmente ocupe 64 */}
                  <Sidebar className="!w-64" />
                </Suspense>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 relative z-10">
            {/* TopBar */}
            <TopBar title={title} onMenuClick={() => setIsMobileMenuOpen(true)} />

            <TrialBanner />

            {/* Breadcrumb */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <div className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 border-b border-border bg-bg-secondary">
                <Breadcrumb items={breadcrumbs} />
              </div>
            )}

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-bg-primary">
              <div className="p-2 sm:p-4 md:p-6 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-6">
                {!isMechanic && (
                  <div className="max-w-5xl mx-auto mb-2 sm:mb-6">
                    <FloatingAIAssistant />
                  </div>
                )}
                {children}
              </div>
            </main>
          </div>
          <MobileBottomNav onMenuClick={() => setIsMobileMenuOpen(true)} />
          <FloatingAgentButton />
        </div>
      </div>
    </AppLayoutMountedCtx.Provider>
  )
}

/**
 * Layout para páginas sin sidebar (login, error, etc.)
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { isDark } = useTheme()

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}

/**
 * Layout para modales y overlays
 */
export function ModalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4">
        {children}
        </div>
    </div>
  )
}

/**
 * Layout para drawers (paneles laterales)
 */
export function DrawerLayout({ 
  children, 
  isOpen, 
  onClose 
}: { 
  children: ReactNode
  isOpen: boolean
  onClose: () => void 
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-bg-primary/50"
        onClick={onClose}
      />
      
      {/* Drawer Content */}
      <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-bg-secondary border-l border-border shadow-xl">
        {children}
      </div>
    </div>
  )
}

