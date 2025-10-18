"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell } from "lucide-react"
import { useNotifications } from "@/hooks/use-notifications"
import { Notifications } from "@/components/notifications"

export function HeaderNotifications() {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount, isLoading } = useNotifications()

  return (
    <>
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative" 
        onClick={() => setIsOpen(true)}
        disabled={isLoading}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
          >
            {unreadCount}
          </Badge>
        )}
      </Button>
      
      <Notifications 
        open={isOpen} 
        onOpenChange={setIsOpen} 
      />
    </>
  )
}
