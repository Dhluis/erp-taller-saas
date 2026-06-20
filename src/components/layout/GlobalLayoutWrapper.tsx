'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { AppLayout } from './AppLayout'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'

// Paths that should NOT show the sidebar/app layout
const PUBLIC_PREFIXES = [
  '/auth/',
  '/auth',
  '/onboarding',
  '/tracking',
  '/tracking/',
]

/**
 * Applied in the root layout to ensure every authenticated page
 * has the Sidebar + TopBar, even if the page doesn't explicitly
 * wrap itself with <AppLayout>.
 *
 * Pages that already call <AppLayout> are safe: AppLayout detects
 * it's already mounted and renders children only (no double sidebar).
 */
export function GlobalLayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const isPublic =
    pathname === '/' ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  return (
    <>
      <OfflineIndicator />
      {isPublic ? <>{children}</> : <AppLayout>{children}</AppLayout>}
    </>
  )
}
