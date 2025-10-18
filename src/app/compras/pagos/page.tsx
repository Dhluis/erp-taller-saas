"use client"

import { MainLayout } from "@/components/main-layout"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export default function PagosPage() {
  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm">
          <Link href="/" className="flex items-center text-muted-foreground hover:text-primary">
            <Home className="h-4 w-4 mr-1" />
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Link href="/compras" className="text-muted-foreground hover:text-primary">
            Compras
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-primary">Gestión de Pagos</span>
        </nav>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Pagos</h1>
            <p className="text-muted-foreground">Administra los pagos a proveedores del taller</p>
          </div>
        </div>

        {/* Contenido básico */}
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4">Página de Gestión de Pagos</h2>
          <p className="text-muted-foreground">
            Esta página permite gestionar los pagos a proveedores.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}