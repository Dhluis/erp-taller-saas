"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Plus, Car, DollarSign, Calendar } from "lucide-react"

interface WorkOrder {
  id: string
  customer: string
  vehicle: string
  status: string
  cost: number
  date: string
}

export default function SimpleOrdenesPage() {
  const [orders] = useState<WorkOrder[]>([
    {
      id: "1",
      customer: "Juan Pérez",
      vehicle: "Toyota Corolla 2020",
      status: "En Proceso",
      cost: 500,
      date: "2024-01-15"
    },
    {
      id: "2", 
      customer: "María García",
      vehicle: "Honda Civic 2019",
      status: "Completada",
      cost: 1200,
      date: "2024-01-14"
    },
    {
      id: "3",
      customer: "Carlos López", 
      vehicle: "Ford Focus 2021",
      status: "Pendiente",
      cost: 800,
      date: "2024-01-13"
    }
  ])

  const getStatusBadge = (status: string) => {
    const statusMap = {
      "En Proceso": { label: "En Proceso", className: "bg-blue-500" },
      "Completada": { label: "Completada", className: "bg-green-500" },
      "Pendiente": { label: "Pendiente", className: "bg-yellow-500" }
    }
    
    const statusInfo = statusMap[status as keyof typeof statusMap] || { label: status, className: "bg-gray-500" }
    return <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Órdenes de Trabajo</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              Órdenes registradas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === "En Proceso").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Órdenes activas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {orders.filter(o => o.status === "Completada").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Órdenes finalizadas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${orders.reduce((sum, order) => sum + order.cost, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Órdenes */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Trabajo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{order.customer}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {order.vehicle}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">${order.cost.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{new Date(order.date).toLocaleDateString()}</span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

