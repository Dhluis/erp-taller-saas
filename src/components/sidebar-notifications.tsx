"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"

export function SidebarNotifications() {
  const { unreadCount, isLoading } = useNotifications()

  return (
    <Link href="/notificaciones" className="w-full">
      <Button 
        variant="ghost" 
        className="w-full justify-between gap-3" 
        disabled={isLoading}
      >
        <div className="flex items-center gap-3">
          <Bell className="h-4 w-4" />
          Notificaciones
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-auto">
            {unreadCount}
          </Badge>
        )}
      </Button>
    </Link>
  )
}
