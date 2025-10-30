"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  customItems?: BreadcrumbItem[] // For backward compatibility or alternative structure
  className?: string
}

export function Breadcrumbs({ items, customItems, className }: BreadcrumbsProps) {
  const breadcrumbItems = items || customItems

  if (!breadcrumbItems || breadcrumbItems.length === 0) {
    return null
  }

  return (
    <nav className={cn("flex items-center space-x-2 text-sm text-muted-foreground", className)}>
      {breadcrumbItems.map((item, index) => (
        <div key={item.label} className="flex items-center">
          {item.icon && <span className="mr-1">{item.icon}</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {index < breadcrumbItems.length - 1 && (
            <ChevronRight className="h-4 w-4 mx-2" />
          )}
        </div>
      ))}
    </nav>
  )
}

interface StandardBreadcrumbsProps {
  currentPage: string
  parentPages?: { label: string; href: string }[]
  className?: string
}

export function StandardBreadcrumbs({ currentPage, parentPages, className }: StandardBreadcrumbsProps) {
  const items: BreadcrumbItem[] = [
    { label: 'Inicio', href: '/dashboard', icon: <Home className="h-4 w-4" /> },
    ...(parentPages || []).map(page => ({ label: page.label, href: page.href })),
    { label: currentPage }
  ]

  return <Breadcrumbs items={items} className={className} />
}