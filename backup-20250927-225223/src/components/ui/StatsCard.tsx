/**
 * Componente StatsCard Reutilizable
 * Tarjeta de estadísticas con métricas y gráficos
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ArrowUpRight, 
  ArrowDownRight,
  MoreHorizontal,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease' | 'neutral'
  changeLabel?: string
  icon?: React.ReactNode
  description?: string
  loading?: boolean
  error?: string | null
  onRefresh?: () => void
  onExport?: () => void
  onView?: () => void
  className?: string
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  showTrend?: boolean
  showActions?: boolean
  actions?: React.ReactNode
  footer?: React.ReactNode
}

export function StatsCard({
  title,
  value,
  change,
  changeType = 'neutral',
  changeLabel,
  icon,
  description,
  loading = false,
  error = null,
  onRefresh,
  onExport,
  onView,
  className = '',
  variant = 'default',
  size = 'md',
  showTrend = true,
  showActions = true,
  actions,
  footer
}: StatsCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-900'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 text-yellow-900'
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-900'
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-900'
      default:
        return 'border-gray-200 bg-white text-gray-900'
    }
  }
  
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'p-4'
      case 'md':
        return 'p-6'
      case 'lg':
        return 'p-8'
      default:
        return 'p-6'
    }
  }
  
  const getTrendIcon = () => {
    if (!showTrend || change === undefined) return null
    
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }
  
  const getTrendColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }
  
  const getTrendArrow = () => {
    if (!showTrend || change === undefined) return null
    
    switch (changeType) {
      case 'increase':
        return <ArrowUpRight className="h-3 w-3" />
      case 'decrease':
        return <ArrowDownRight className="h-3 w-3" />
      default:
        return null
    }
  }
  
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1)}M`
      } else if (val >= 1000) {
        return `${(val / 1000).toFixed(1)}K`
      }
      return val.toLocaleString()
    }
    return val
  }
  
  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }
  
  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50', className)}>
        <CardContent className={getSizeStyles()}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-red-800">{title}</h3>
              <p className="text-sm text-red-600">Error al cargar</p>
            </div>
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="text-red-600 hover:text-red-800"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className={cn(getVariantStyles(), className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {showActions && (
          <div className="flex items-center gap-2">
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            )}
            {onExport && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExport}
                className="h-8 w-8 p-0"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            {onView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onView}
                className="h-8 w-8 p-0"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {actions}
          </div>
        )}
      </CardHeader>
      
      <CardContent className={getSizeStyles()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <div className="text-2xl font-bold">
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                ) : (
                  formatValue(value)
                )}
              </div>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {description}
                </p>
              )}
            </div>
          </div>
          
          {showTrend && change !== undefined && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={cn('text-sm font-medium', getTrendColor())}>
                {formatChange(change)}
              </span>
              {getTrendArrow()}
            </div>
          )}
        </div>
        
        {changeLabel && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              {changeLabel}
            </Badge>
          </div>
        )}
        
        {footer}
      </CardContent>
    </Card>
  )
}

export default StatsCard
