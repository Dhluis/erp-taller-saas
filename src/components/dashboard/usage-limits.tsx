"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Users, 
  User, 
  HardDrive, 
  Activity,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

interface UsageLimit {
  current: number
  limit: number
  percentage: number
}

interface UsageLimitsProps {
  orders: UsageLimit
  clients: UsageLimit
  users: UsageLimit
  storage: UsageLimit
  api_calls: UsageLimit
}

export function UsageLimits({ orders, clients, users, storage, api_calls }: UsageLimitsProps) {
  const getLimitColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90) return <AlertTriangle className="h-4 w-4 text-red-600" />
    if (percentage >= 75) return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    return <CheckCircle className="h-4 w-4 text-green-600" />
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toString()
  }

  const limits = [
    {
      key: 'orders',
      label: 'Órdenes',
      icon: <FileText className="h-4 w-4" />,
      data: orders
    },
    {
      key: 'clients',
      label: 'Clientes',
      icon: <Users className="h-4 w-4" />,
      data: clients
    },
    {
      key: 'users',
      label: 'Usuarios',
      icon: <User className="h-4 w-4" />,
      data: users
    },
    {
      key: 'storage',
      label: 'Almacenamiento',
      icon: <HardDrive className="h-4 w-4" />,
      data: storage
    },
    {
      key: 'api_calls',
      label: 'Llamadas API',
      icon: <Activity className="h-4 w-4" />,
      data: api_calls
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Límites de Uso del Plan
        </CardTitle>
        <CardDescription>
          Uso actual vs límites de tu plan de suscripción
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {limits.map((limit) => (
            <div key={limit.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {limit.icon}
                  <span className="font-medium">{limit.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(limit.data.percentage)}
                  <span className={`text-sm font-medium ${getLimitColor(limit.data.percentage)}`}>
                    {limit.data.percentage}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{formatNumber(limit.data.current)}</span>
                  <span className="text-muted-foreground">/ {formatNumber(limit.data.limit)}</span>
                </div>
                <Progress 
                  value={limit.data.percentage} 
                  className="h-2"
                />
              </div>
              
              {limit.data.percentage >= 75 && (
                <div className="flex items-center gap-2 text-sm">
                  {limit.data.percentage >= 90 ? (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Límite crítico
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Acercándose al límite
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

