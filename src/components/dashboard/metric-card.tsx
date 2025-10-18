import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type MetricCardProps = {
  title: string
  value: string | number
  change?: string
  icon?: React.ReactNode
}

export function MetricCard({ title, value, change, icon }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change ? (
          <p className="text-xs text-muted-foreground">{change} respecto al mes pasado</p>
        ) : null}
      </CardContent>
    </Card>
  )
}



