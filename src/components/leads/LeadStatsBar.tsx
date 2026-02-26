'use client'

import { useMemo } from 'react'
import { Users, DollarSign, TrendingUp, Trophy } from 'lucide-react'
import type { CRMLead } from './types'

interface LeadStatsBarProps {
  leads: CRMLead[]
}

export function LeadStatsBar({ leads }: LeadStatsBarProps) {
  const stats = useMemo(() => {
    const total = leads.length
    const won = leads.filter((l) => l.status === 'won').length
    const active = leads.filter(
      (l) => !['won', 'lost'].includes(l.status)
    ).length
    const totalValue = leads
      .filter((l) => l.status !== 'lost')
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0)
    const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0

    return { total, won, active, totalValue, conversionRate }
  }, [leads])

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
    }).format(v)

  const items = [
    {
      label: 'Total Leads',
      value: stats.total.toString(),
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Activos',
      value: stats.active.toString(),
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Valor Pipeline',
      value: formatCurrency(stats.totalValue),
      icon: DollarSign,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Conversión',
      value: `${stats.conversionRate}%`,
      icon: Trophy,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className={`${bg} rounded-lg p-3 flex items-center gap-3 border border-slate-700/50`}
        >
          <div className={`p-2 rounded-lg bg-slate-800/50`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">{label}</p>
            <p className={`text-sm font-bold ${color} truncate`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
