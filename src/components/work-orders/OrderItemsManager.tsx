'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Trash2, Edit2, Save, X, Wrench, Package } from 'lucide-react';
import { WorkOrderItem } from '@/hooks/useWorkOrders';
import { Badge } from '@/components/ui/badge';

interface OrderItemsManagerProps {
  items: WorkOrderItem[];
  onAddItem: (item: {
    item_type: 'service' | 'part';
    item_name: string;
    description?: string;
    quantity: number;
    unit_price: number;
  }) => Promise<void>;
  onUpdateItem: (
    itemId: string,
    data: {
      item_type?: 'service' | 'part';
      item_name?: string;
      description?: string;
      quantity?: number;
      unit_price?: number;
    }
  ) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  isLoading: boolean;
}

export function OrderItemsManager({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  isLoading,
}: OrderItemsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Estado para nuevo item
  const [newItemType, setNewItemType] = useState<'service' | 'part'>('service');
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Estado para editar item
  const [editItemType, setEditItemType] = useState<'service' | 'part'>('service');
  const [editItemName, setEditItemName] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editItemQuantity, setEditItemQuantity] = useState('1');
  const [editItemPrice, setEditItemPrice] = useState('');

  const handleAddItem = async () => {
    if (!newItemName.trim() || !newItemPrice) {
      return;
    }

    await onAddItem({
      item_type: newItemType,
      item_name: newItemName.trim(),
      description: newItemDescription.trim() || undefined,
      quantity: parseFloat(newItemQuantity),
      unit_price: parseFloat(newItemPrice),
    });

    // Limpiar formulario
    setNewItemName('');
    setNewItemDescription('');
    setNewItemQuantity('1');
    setNewItemPrice('');
    setIsAdding(false);
  };

  const handleEditItem = (item: WorkOrderItem) => {
    setEditingId(item.id);
    setEditItemType(item.item_type);
    setEditItemName(item.item_name);
    setEditItemDescription(item.description || '');
    setEditItemQuantity(item.quantity.toString());
    setEditItemPrice(item.unit_price.toString());
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editItemName.trim() || !editItemPrice) {
      return;
    }

    await onUpdateItem(itemId, {
      item_type: editItemType,
      item_name: editItemName.trim(),
      description: editItemDescription.trim() || undefined,
      quantity: parseFloat(editItemQuantity),
      unit_price: parseFloat(editItemPrice),
    });

    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Items de la Orden</CardTitle>
            <CardDescription>
              Servicios y partes incluidos en esta orden
            </CardDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Item
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Formulario para agregar nuevo item */}
          {isAdding && (
            <Card className="border-cyan-200 bg-cyan-50">
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Tipo */}
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={newItemType}
                      onValueChange={(value: 'service' | 'part') =>
                        setNewItemType(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="service">
                          <div className="flex items-center gap-2">
                            <Wrench className="h-4 w-4" />
                            Servicio
                          </div>
                        </SelectItem>
                        <SelectItem value="part">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Parte/Repuesto
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Nombre */}
                  <div className="space-y-2">
                    <Label>Nombre *</Label>
                    <Input
                      placeholder="Ej: Cambio de aceite"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea
                    placeholder="Detalles adicionales..."
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Cantidad */}
                  <div className="space-y-2">
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                    />
                  </div>

                  {/* Precio unitario */}
                  <div className="space-y-2">
                    <Label>Precio Unitario *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAdding(false)}
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAddItem}
                    disabled={isLoading || !newItemName || !newItemPrice}
                    size="sm"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Item
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla de items */}
          {items.length > 0 ? (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      {editingId === item.id ? (
                        // Modo edición
                        <>
                          <TableCell>
                            <Select
                              value={editItemType}
                              onValueChange={(value: 'service' | 'part') =>
                                setEditItemType(value)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="service">Servicio</SelectItem>
                                <SelectItem value="part">Parte</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editItemName}
                              onChange={(e) => setEditItemName(e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editItemDescription}
                              onChange={(e) => setEditItemDescription(e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editItemQuantity}
                              onChange={(e) => setEditItemQuantity(e.target.value)}
                              className="h-8 text-right"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={editItemPrice}
                              onChange={(e) => setEditItemPrice(e.target.value)}
                              className="h-8 text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            $
                            {(
                              parseFloat(editItemQuantity) * parseFloat(editItemPrice)
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleSaveEdit(item.id)}
                                disabled={isLoading}
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        // Modo vista
                        <>
                          <TableCell>
                            {item.item_type === 'service' ? (
                              <Badge variant="outline" className="bg-blue-50">
                                <Wrench className="h-3 w-3 mr-1" />
                                Servicio
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-purple-50">
                                <Package className="h-3 w-3 mr-1" />
                                Parte
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.item_name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.description || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            ${item.unit_price.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${item.total_price.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditItem(item)}
                                disabled={isLoading}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onDeleteItem(item.id)}
                                disabled={isLoading}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}

                  {/* Fila de subtotal */}
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={5} className="text-right font-semibold">
                      Subtotal:
                    </TableCell>
                    <TableCell className="text-right font-bold text-lg">
                      ${subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay items agregados</p>
              <p className="text-sm">
                Agrega servicios o partes para completar la orden
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

