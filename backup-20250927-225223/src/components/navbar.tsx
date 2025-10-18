"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Home, Users, Car, FileText, Package, Receipt } from "lucide-react"

export function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/vehiculos", label: "Vehículos", icon: Car },
    { href: "/cotizaciones", label: "Cotizaciones", icon: Receipt },
    { href: "/ordenes", label: "Órdenes", icon: FileText },
    { href: "/inventario", label: "Inventario", icon: Package },
  ]

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <h2 className="text-xl font-bold">ERP Taller</h2>
          <div className="flex space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.href} href={item.href}>
                  <Button 
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}
