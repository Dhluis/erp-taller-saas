'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { IngresoDiario } from '@/lib/database/queries/dashboard';

interface IngresosChartProps {
  data: IngresoDiario[];
}

export function IngresosChart({ data }: IngresosChartProps) {
  // Formato de moneda para tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Componente personalizado para tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-medium text-white mb-2">{payload[0].payload.fecha}</p>
          <div className="space-y-1">
            <p className="text-sm text-cyan-400">
              Ingresos: <span className="font-bold">{formatCurrency(payload[0].value)}</span>
            </p>
            <p className="text-sm text-blue-400">
              Órdenes: <span className="font-bold">{payload[1].value}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Ingresos de los Últimos 7 Días</h3>
        <p className="text-sm text-gray-400 mt-1">Tendencia de ingresos y órdenes procesadas</p>
      </div>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="fecha" 
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            yAxisId="left"
            stroke="#06b6d4"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            stroke="#3b82f6"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="ingresos" 
            stroke="#06b6d4" 
            strokeWidth={3}
            dot={{ fill: '#06b6d4', r: 4 }}
            activeDot={{ r: 6 }}
            name="Ingresos"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="ordenes" 
            stroke="#3b82f6" 
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 3 }}
            activeDot={{ r: 5 }}
            name="Órdenes"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
