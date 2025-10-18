type RevenuePoint = { month: string; total: number }

export function Overview({ data }: { data: RevenuePoint[] }) {
  return (
    <div className="text-sm text-muted-foreground">
      {/* Placeholder del gráfico: lista simple */}
      <ul className="space-y-1">
        {data.map((p) => (
          <li key={p.month} className="flex justify-between">
            <span>{p.month}</span>
            <span>${p.total.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}



