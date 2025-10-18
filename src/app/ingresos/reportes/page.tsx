"use client"

import { MainLayout } from "@/components/main-layout"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export default function ReportesPage() {
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
          <Link href="/ingresos" className="text-muted-foreground hover:text-primary">
            Ingresos
          </Link>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-primary">Reportes</span>
        </nav>
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reportes</h1>
            <p className="text-muted-foreground">Análisis detallado de ingresos y transacciones del taller</p>
          </div>
        </div>

        {/* Contenido básico */}
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4">Página de Reportes</h2>
          <p className="text-muted-foreground">
            Esta página muestra los reportes de ingresos del taller.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}