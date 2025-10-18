"use client"

import { Button } from "@/components/ui/button"

export function CalendarDateRangePicker() {
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline">Últimos 7 días</Button>
      <Button size="sm" variant="outline">Últimos 30 días</Button>
    </div>
  )
}



