"use client"

import { DashboardMetrics } from "@/components/dashboard-metrics"
import { TestInventoryFunctions } from "@/components/test-inventory-functions"

export default function Home() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <DashboardMetrics />
      <TestInventoryFunctions />
    </div>
  )
}