type Order = {
  id: string
  customer: string
  vehicle: string
  status: string
  amount: number
}

export function RecentOrders({ orders }: { orders: any[] }) {
  return (
    <div className="text-sm">
      <div className="grid grid-cols-5 gap-2 text-muted-foreground mb-2">
        <span>ID</span>
        <span>Cliente</span>
        <span>Vehículo</span>
        <span>Estado</span>
        <span className="text-right">Monto</span>
      </div>
      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="grid grid-cols-5 gap-2 items-center">
            <span className="font-mono text-xs">{o.id}</span>
            <span>{o.customer}</span>
            <span className="truncate" title={o.vehicle}>{o.vehicle}</span>
            <span className="uppercase text-xs tracking-wide">
              {o.status === "pending"
                ? "Pendiente"
                : o.status === "in_progress"
                ? "En proceso"
                : "Completada"}
            </span>
            <span className="text-right">${o.amount.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


