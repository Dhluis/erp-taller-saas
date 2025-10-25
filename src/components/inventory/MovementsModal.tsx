'use client';

import { useState } from 'react';
import { Package, TrendingUp, TrendingDown, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InventoryItem } from '@/hooks/useInventory';

interface Movement {
  id: string;
  item_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  notes?: string;
  created_at: string;
}

interface MovementsModalProps {
  item: InventoryItem | null;
  movements: Movement[];
  onClose: () => void;
  onAddMovement: (data: any) => void;
  loading?: boolean;
}

export default function MovementsModal({
  item,
  movements,
  onClose,
  onAddMovement,
  loading = false,
}: MovementsModalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMovement, setNewMovement] = useState({
    movement_type: 'in' as 'in' | 'out' | 'adjustment',
    quantity: 0,
    reason: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (item) {
      onAddMovement({
        item_id: item.id,
        ...newMovement,
      });
      setNewMovement({
        movement_type: 'in',
        quantity: 0,
        reason: '',
        notes: '',
      });
      setShowAddForm(false);
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'out':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'adjustment':
        return <Package className="w-4 h-4 text-blue-400" />;
      default:
        return <Package className="w-4 h-4 text-gray-400" />;
    }
  };

  const getMovementLabel = (type: string) => {
    switch (type) {
      case 'in':
        return 'Entrada';
      case 'out':
        return 'Salida';
      case 'adjustment':
        return 'Ajuste';
      default:
        return 'Movimiento';
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Movimientos de Inventario</h3>
              <p className="text-sm text-gray-400">{item.name} - {item.sku}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Add Movement Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Movimiento
            </Button>
          </div>

          {/* Add Movement Form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="p-4 bg-gray-700/50 rounded-lg space-y-4">
              <h4 className="font-semibold text-white mb-4">Agregar Movimiento</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="movement_type">Tipo de Movimiento</Label>
                  <Select
                    value={newMovement.movement_type}
                    onValueChange={(value: 'in' | 'out' | 'adjustment') =>
                      setNewMovement({ ...newMovement, movement_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in">Entrada</SelectItem>
                      <SelectItem value="out">Salida</SelectItem>
                      <SelectItem value="adjustment">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={newMovement.quantity}
                    onChange={(e) =>
                      setNewMovement({ ...newMovement, quantity: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo</Label>
                <Input
                  id="reason"
                  value={newMovement.reason}
                  onChange={(e) =>
                    setNewMovement({ ...newMovement, reason: e.target.value })
                  }
                  placeholder="Ej: Compra, Venta, Ajuste de inventario"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={newMovement.notes}
                  onChange={(e) =>
                    setNewMovement({ ...newMovement, notes: e.target.value })
                  }
                  placeholder="Notas adicionales sobre el movimiento"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Agregando...' : 'Agregar Movimiento'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {/* Movements List */}
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Historial de Movimientos</h4>
            
            {movements.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay movimientos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-center gap-3">
                      {getMovementIcon(movement.movement_type)}
                      <div>
                        <p className="font-medium text-white">
                          {getMovementLabel(movement.movement_type)} - {movement.quantity} unidades
                        </p>
                        <p className="text-sm text-gray-400">{movement.reason}</p>
                        {movement.notes && (
                          <p className="text-xs text-gray-500 mt-1">{movement.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-400">
                        {new Date(movement.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(movement.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-6 border-t border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}


















