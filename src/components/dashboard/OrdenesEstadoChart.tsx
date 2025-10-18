'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { OrdenPorEstado } from '@/lib/database/queries/dashboard';

interface OrdenesEstadoChartProps {
  data: OrdenPorEstado[];
}

export function OrdenesEstadoChart({ data }: OrdenesEstadoChartProps) {
  // Componente personalizado para tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 shadow-xl">
          <p className="text-sm font-medium text-white mb-2">{data.estado}</p>
          <div className="space-y-1">
            <p className="text-sm text-gray-300">
              Cantidad: <span className="font-bold">{data.cantidad}</span>
            </p>
            <p className="text-sm text-gray-300">
              Porcentaje: <span className="font-bold">{data.porcentaje}%</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Label personalizado para mostrar porcentajes en la gráfica
  const renderLabel = (entry: OrdenPorEstado) => {
    return `${entry.porcentaje}%`;
  };

  return (
    <div className="bg-slate-800/50 border border-gray-700/50 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white">Órdenes por Estado</h3>
        <p className="text-sm text-gray-400 mt-1">Distribución de órdenes en el flujo de trabajo</p>
      </div>
      
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500">No hay órdenes registradas</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={100}
              innerRadius={60}
              fill="#8884d8"
              dataKey="cantidad"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconType="circle"
              formatter={(value, entry: any) => (
                <span className="text-sm text-gray-300">
                  {entry.payload.estado} ({entry.payload.cantidad})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
