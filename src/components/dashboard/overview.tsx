'use client'

import { useOrgCurrency } from '@/lib/context/CurrencyContext'

type RevenuePoint = { month: string; total: number }

export function Overview({ data }: { data: RevenuePoint[] }) {
  const { formatMoney } = useOrgCurrency()
  return (
    <div className="text-sm text-muted-foreground">
      {/* Placeholder del gráfico: lista simple */}
      <ul className="space-y-1">
        {data.map((p) => (
          <li key={p.month} className="flex justify-between">
            <span>{p.month}</span>
            <span>{formatMoney(p.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}



