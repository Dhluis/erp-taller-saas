'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Breadcrumb } from './Breadcrumb'
import { useSidebar } from '@/contexts/SidebarContext'
import { cn } from '@/lib/utils'

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
 * LAYOUT PRINCIPAL DEL ERP EAGLES
 * =====================================================
 * Layout base con sidebar, header y contenido principal
 * usando el tema oscuro moderno
 */
export function AppLayout({ children, title, breadcrumbs }: AppLayoutProps) {
  const { isDark } = useTheme()
  const { isCollapsed } = useSidebar()

  return (
    <div className={`min-h-screen ${isDark ? 'dark' : ''}`}>
      <div className="flex h-screen bg-bg-primary">
        {/* Sidebar */}
        <aside>
          <Sidebar />
        </aside>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300 relative z-20">
          {/* TopBar */}
          <TopBar title={title} />
          
          {/* Breadcrumb */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 border-b border-border bg-bg-secondary">
              <Breadcrumb items={breadcrumbs} />
            </div>
          )}
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-bg-primary">
            <div className="p-2 sm:p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
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
