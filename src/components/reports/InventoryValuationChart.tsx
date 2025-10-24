'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Package } from 'lucide-react';
import { InventoryValuation } from '@/hooks/useReports';

interface InventoryValuationChartProps {
  data: InventoryValuation | null;
  loading: boolean;
}

const COLORS = [
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#6366f1',
  '#14b8a6',
  '#f97316',
];

export function InventoryValuationChart({ data, loading }: InventoryValuationChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Valorización del Inventario
          </CardTitle>
          <CardDescription>
            Distribución del valor por categorías
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No hay datos disponibles</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-1">{data.category}</p>
          <p className="text-sm text-cyan-600">
            Valor: ${data.total_value.toFixed(2)}
          </p>
          <p className="text-sm text-muted-foreground">
            Items: {data.total_items}
          </p>
          <p className="text-sm text-muted-foreground">
            Cantidad: {data.total_quantity}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // No mostrar etiquetas para porcentajes muy pequeños
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Valorización del Inventario
            </CardTitle>
            <CardDescription>
              Distribución del valor por categorías
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-cyan-600">
              ${data.total_value.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.total_items} items
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico de pie */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.by_category}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomizedLabel}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="total_value"
                  nameKey="category"
                >
                  {data.by_category.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Tabla de resumen */}
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Resumen por Categoría</h4>
            <div className="space-y-3">
              {data.by_category.map((category, index) => (
                <div key={category.category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div>
                      <p className="font-medium">{category.category}</p>
                      <p className="text-sm text-muted-foreground">
                        {category.total_items} items • {category.total_quantity} unidades
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-cyan-600">
                      ${category.total_value.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {((category.total_value / data.total_value) * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
















