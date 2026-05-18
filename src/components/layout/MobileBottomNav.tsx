'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  UsersIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import CreateWorkOrderModal from '@/components/ordenes/CreateWorkOrderModal'

interface MobileBottomNavProps {
  onMenuClick: () => void
}

export function MobileBottomNav({ onMenuClick }: MobileBottomNavProps) {
  const pathname = usePathname()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const isActive = (path: string) =>
    path === '/dashboard' ? pathname === path : pathname.startsWith(path)

  const linkClass = (path: string) =>
    `flex flex-col items-center justify-center flex-1 h-full gap-0.5 touch-manipulation ${
      isActive(path) ? 'text-[#00D9FF]' : 'text-gray-400'
    }`

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0f1422] border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-16">
          <Link href="/dashboard" className={linkClass('/dashboard')}>
            <HomeIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium">Inicio</span>
          </Link>

          <Link href="/ordenes" className={linkClass('/ordenes')}>
            <ClipboardDocumentListIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium">Órdenes</span>
          </Link>

          <div className="flex-1 flex items-center justify-center">
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-12 h-12 rounded-full bg-[#00D9FF] flex items-center justify-center shadow-lg -mt-5 touch-manipulation"
              aria-label="Nueva orden de trabajo"
            >
              <PlusIcon className="h-6 w-6 text-black" strokeWidth={2.5} />
            </button>
          </div>

          <Link href="/clientes" className={linkClass('/clientes')}>
            <UsersIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium">Clientes</span>
          </Link>

          <button
            onClick={onMenuClick}
            className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 text-gray-400 touch-manipulation"
          >
            <Bars3Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menú</span>
          </button>
        </div>
      </nav>

      <CreateWorkOrderModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </>
  )
}
