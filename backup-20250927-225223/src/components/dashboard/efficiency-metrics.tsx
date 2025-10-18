"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Trophy, Users, Star } from "lucide-react"

interface Employee {
  name: string
  role: string
}

interface TopPerformer {
  count: number
  employee: Employee
}

interface EfficiencyMetricsProps {
  avgCompletionTime: number
  topPerformers: TopPerformer[]
}

export function EfficiencyMetrics({ avgCompletionTime, topPerformers }: EfficiencyMetricsProps) {
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'mechanic':
        return 'Mecánico'
      case 'supervisor':
        return 'Supervisor'
      case 'admin':
        return 'Administrador'
      case 'receptionist':
        return 'Recepcionista'
      default:
        return role
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'mechanic':
        return 'bg-blue-100 text-blue-800'
      case 'supervisor':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'receptionist':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} min`
    } else if (hours < 24) {
      return `${hours.toFixed(1)} hrs`
    } else {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}d ${remainingHours.toFixed(1)}h`
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Tiempo Promedio de Completado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tiempo Promedio de Completado
          </CardTitle>
          <CardDescription>
            Tiempo promedio para completar una orden de trabajo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {formatTime(avgCompletionTime)}
            </div>
            <p className="text-sm text-muted-foreground">
              Basado en órdenes completadas en los últimos 30 días
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Empleados Más Productivos
          </CardTitle>
          <CardDescription>
            Empleados con más trabajos completados en los últimos 30 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topPerformers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                No hay datos de productividad
              </p>
            ) : (
              topPerformers.map((performer, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Trophy className="h-4 w-4 text-yellow-500" />}
                      {index === 1 && <Star className="h-4 w-4 text-gray-400" />}
                      {index === 2 && <Star className="h-4 w-4 text-orange-500" />}
                      <span className="text-lg font-bold text-primary">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium">{performer.employee.name}</p>
                      <Badge variant="secondary" className={getRoleColor(performer.employee.role)}>
                        {getRoleLabel(performer.employee.role)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-primary">{performer.count}</span>
                      <span className="text-sm text-muted-foreground">trabajos</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

