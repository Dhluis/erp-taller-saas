"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Wrench, Package, Settings, Car, Zap } from "lucide-react"
import { useOrgCurrency } from '@/lib/context/CurrencyContext'

interface Service {
  name: string
  category: string
  base_price: number
}

interface PopularService {
  count: number
  service: Service
}

interface PopularServicesProps {
  services: PopularService[]
}

export function PopularServices({ services }: PopularServicesProps) {
  const { currency } = useOrgCurrency();
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'maintenance':
        return <Settings className="h-4 w-4" />
      case 'repair':
        return <Wrench className="h-4 w-4" />
      case 'diagnostic':
        return <Zap className="h-4 w-4" />
      case 'bodywork':
        return <Car className="h-4 w-4" />
      default:
        return <Package className="h-4 w-4" />
    }
  }

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'Mantenimiento'
      case 'repair':
        return 'Reparación'
      case 'diagnostic':
        return 'Diagnóstico'
      case 'bodywork':
        return 'Carrocería'
      case 'electrical':
        return 'Eléctrico'
      case 'suspension':
        return 'Suspensión'
      default:
        return category
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'maintenance':
        return 'bg-blue-100 text-blue-800'
      case 'repair':
        return 'bg-red-100 text-red-800'
      case 'diagnostic':
        return 'bg-yellow-100 text-yellow-800'
      case 'bodywork':
        return 'bg-purple-100 text-purple-800'
      case 'electrical':
        return 'bg-green-100 text-green-800'
      case 'suspension':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Servicios Más Populares
        </CardTitle>
        <CardDescription>
          Servicios más solicitados en los últimos 30 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay datos de servicios</p>
          ) : (
            services.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-primary">#{index + 1}</span>
                    {getCategoryIcon(item.service.category)}
                  </div>
                  <div>
                    <p className="font-medium">{item.service.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={getCategoryColor(item.service.category)}>
                        {getCategoryLabel(item.service.category)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(item.service.base_price)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">{item.count}</span>
                    <span className="text-sm text-muted-foreground">veces</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

