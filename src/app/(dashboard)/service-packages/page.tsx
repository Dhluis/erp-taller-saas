'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/navigation/page-header';
import { Plus, Pencil, Trash2, RefreshCw, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const CATEGORIES = [
  'Motor',
  'Transmisión',
  'Frenos',
  'Suspensión',
  'Eléctrico',
  'Carrocería',
  'Otro',
] as const;

type Category = (typeof CATEGORIES)[number];

type EstimatedUnit = 'minutes' | 'hours' | 'days';

/** Convierte minutos a la unidad más legible para mostrar en el form */
function minutesToDisplay(minutes: number): { value: number; unit: EstimatedUnit } {
  if (minutes < 60) return { value: minutes, unit: 'minutes' };
  if (minutes < 480) return { value: Math.round(minutes / 60 * 10) / 10, unit: 'hours' };
  return { value: Math.round(minutes / 480 * 10) / 10, unit: 'days' };
}

/** Convierte valor + unidad del form a minutos para guardar en BD */
function displayToMinutes(value: number, unit: EstimatedUnit): number {
  if (unit === 'minutes') return value;
  if (unit === 'hours') return value * 60;
  return value * 60 * 8; // días = jornada 8h
}

/** Formatea minutos para mostrar en tarjeta */
function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 480) {
    const h = minutes / 60;
    const val = h % 1 === 0 ? Math.round(h) : Number(h.toFixed(1));
    return `${val} ${val === 1 ? 'hora' : 'horas'}`;
  }
  const d = minutes / 480;
  const val = d % 1 === 0 ? Math.round(d) : Number(d.toFixed(1));
  return `${val} ${val === 1 ? 'día' : 'días'}`;
}

interface InventoryItem {
  id: string;
  name: string;
  unit?: string;
  quantity?: number;
  current_stock?: number;
}

interface RecipeItem {
  inventory_id: string;
  name: string;
  unit: string;
  quantity: number;
  current_stock?: number;
}

interface ServicePackageItem {
  id: string;
  quantity: number;
  inventory_item_id: string;
  inventory?: {
    id: string;
    name: string;
    unit?: string;
    current_stock?: number;
  } | null;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  estimated_minutes: number | null;
  service_package_items?: ServicePackageItem[];
}

const hasLoadedRef = { current: false };

export default function ServicePackagesPage() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [packageToDelete, setPackageToDelete] = useState<ServicePackage | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: '' as Category | '',
    price: '',
    estimated_value: '',
    estimated_unit: 'minutes' as EstimatedUnit,
    items: [] as RecipeItem[],
  });

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryResults, setInventoryResults] = useState<InventoryItem[]>([]);
  const [inventorySearching, setInventorySearching] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/service-packages');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPackages(json.data);
      } else {
        setPackages([]);
      }
    } catch (e) {
      console.error(e);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetchPackages();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      name: '',
      description: '',
      category: '',
      price: '',
      estimated_value: '',
      estimated_unit: 'minutes',
      items: [],
    });
    setInventorySearch('');
    setInventoryResults([]);
    setModalOpen(true);
  };

  const openEdit = async (pkg: ServicePackage) => {
    setEditingId(pkg.id);
    const res = await fetch(`/api/service-packages/${pkg.id}`);
    const json = await res.json();
    if (!json.success || !json.data) {
      return;
    }
    const d = json.data as ServicePackage;
    const items: RecipeItem[] = (d.service_package_items || []).map((it) => ({
      inventory_id: it.inventory_item_id,
      name: it.inventory?.name ?? 'Producto',
      unit: it.inventory?.unit ?? 'pcs',
      quantity: Number(it.quantity),
      current_stock: it.inventory?.current_stock ?? undefined,
    }));
    const display = d.estimated_minutes != null ? minutesToDisplay(d.estimated_minutes) : null;
    setForm({
      name: d.name,
      description: d.description ?? '',
      category: (d.category as Category) ?? '',
      price: String(d.price),
      estimated_value: display != null ? String(display.value) : '',
      estimated_unit: display?.unit ?? 'minutes',
      items,
    });
    setInventorySearch('');
    setInventoryResults([]);
    setModalOpen(true);
  };

  const searchInventory = async () => {
    const q = inventorySearch.trim();
    if (!q) {
      setInventoryResults([]);
      return;
    }
    setInventorySearching(true);
    try {
      const res = await fetch(
        `/api/inventory?search=${encodeURIComponent(q)}&pageSize=20&page=1`,
        { credentials: 'include', cache: 'no-store' }
      );
      const json = await res.json();
      if (!res.ok) {
        setInventoryResults([]);
        return;
      }
      // API devuelve { success, data: { items, pagination } } o { data: [] }
      const list =
        json?.data?.items ??
        (Array.isArray(json?.data) ? json.data : []);
      setInventoryResults(Array.isArray(list) ? list : []);
    } catch {
      setInventoryResults([]);
    } finally {
      setInventorySearching(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(searchInventory, 300);
    return () => clearTimeout(t);
  }, [inventorySearch]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    if (!inventorySearch) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setInventorySearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inventorySearch]);

  const addRecipeItem = (inv: InventoryItem, quantity: number) => {
    if (quantity <= 0) return;
    const already = form.items.some((i) => i.inventory_id === inv.id);
    if (already) return;
    const stock = inv.current_stock ?? inv.quantity ?? 0;
    setForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          inventory_id: inv.id,
          name: inv.name,
          unit: inv.unit ?? 'pcs',
          quantity,
          current_stock: stock,
        },
      ],
    }));
    setInventorySearch('');
    setInventoryResults([]);
  };

  const removeRecipeItem = (inventoryId: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.inventory_id !== inventoryId),
    }));
  };

  const updateRecipeQuantity = (inventoryId: string, quantity: number) => {
    if (quantity < 0) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.inventory_id === inventoryId ? { ...i, quantity } : i
      ),
    }));
  };

  const submitModal = async () => {
    const name = form.name.trim();
    if (!name) {
      alert('El nombre es obligatorio.');
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      alert('El precio debe ser un número mayor o igual a 0.');
      return;
    }
    const rawVal = form.estimated_value.trim() ? parseFloat(form.estimated_value) : null;
    const estimated_minutes =
      rawVal != null && !isNaN(rawVal) && rawVal >= 0
        ? displayToMinutes(rawVal, form.estimated_unit)
        : null;
    const body = {
      name,
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      price,
      estimated_minutes: estimated_minutes != null ? Math.round(estimated_minutes) : undefined,
      items: form.items.map((i) => ({ inventory_id: i.inventory_id, quantity: i.quantity })),
    };

    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/service-packages/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          setModalOpen(false);
          await fetchPackages();
        } else {
          alert(json.error || 'Error al actualizar.');
        }
      } else {
        const res = await fetch('/api/service-packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (json.success) {
          setModalOpen(false);
          await fetchPackages();
        } else {
          alert(json.error || 'Error al crear.');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (pkg: ServicePackage) => {
    setPackageToDelete(pkg);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!packageToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/service-packages/${packageToDelete.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setDeleteDialogOpen(false);
        setPackageToDelete(null);
        await fetchPackages();
      } else {
        alert(json.error || 'Error al eliminar.');
      }
    } catch (e) {
      console.error(e);
      alert('Error de conexión.');
    } finally {
      setDeleting(false);
    }
  };

  const itemCount = (pkg: ServicePackage) =>
    pkg.service_package_items?.length ?? 0;

  const categoryColor = (cat: string | null) => {
    if (!cat) return 'bg-gray-700 text-gray-400';
    const c = cat.toLowerCase();
    if (c.includes('motor')) return 'bg-blue-900/60 text-blue-300 border border-blue-700';
    if (c.includes('transmisión') || c.includes('transmision')) return 'bg-amber-900/60 text-amber-300 border border-amber-700';
    if (c.includes('freno')) return 'bg-red-900/60 text-red-300 border border-red-700';
    if (c.includes('suspensión') || c.includes('suspension')) return 'bg-green-900/60 text-green-300 border border-green-700';
    if (c.includes('eléctrico') || c.includes('electrico')) return 'bg-yellow-900/60 text-yellow-300 border border-yellow-700';
    if (c.includes('carrocería') || c.includes('carroceria')) return 'bg-purple-900/60 text-purple-300 border border-purple-700';
    return 'bg-gray-700 text-gray-400';
  };

  return (
    <div className="space-y-6">
        <PageHeader
          title="Paquetes de Servicio"
          description="Catálogo de paquetes con receta de productos"
          breadcrumbs={[
            { label: 'Inventarios', href: '/inventarios' },
            { label: 'Paquetes de Servicio', href: '/service-packages' },
          ]}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchPackages} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo paquete
              </Button>
            </div>
          }
        />

        {loading ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-8 flex justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </CardContent>
          </Card>
        ) : packages.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2 text-white">No hay paquetes de servicio</h3>
              <p className="text-gray-400 mb-4">
                Crea el primer paquete para ofrecer servicios con receta de productos.
              </p>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo paquete
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <Card key={pkg.id} className="bg-gray-800 border border-gray-700 hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-semibold text-lg text-white">{pkg.name}</h3>
                      {pkg.category && (
                        <Badge className={categoryColor(pkg.category)}>
                          {pkg.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-medium mt-2 text-white">
                    ${Number(pkg.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-400">
                    {itemCount(pkg)} producto(s) en la receta
                  </p>
                  {pkg.estimated_minutes != null && (
                    <p className="text-sm text-gray-400">
                      ~{formatEstimatedTime(pkg.estimated_minutes)}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(pkg)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(pkg)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Modal Crear/Editar */}
        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                <h2 className="text-xl font-bold text-white">
                  {editingId ? 'Editar paquete' : 'Nuevo paquete'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4 bg-gray-900">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Nombre *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Cambio de aceite"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Categoría</label>
                  <Select
                    value={form.category || undefined}
                    onValueChange={(v) => setForm((p) => ({ ...p, category: v as Category }))}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="text-white focus:bg-gray-700">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Precio *</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="0.00"
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Tiempo estimado</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={form.estimated_value}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, estimated_value: e.target.value }))
                        }
                        placeholder="Opcional"
                        className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
                      />
                      <Select
                        value={form.estimated_unit}
                        onValueChange={(v) =>
                          setForm((p) => ({ ...p, estimated_unit: v as EstimatedUnit }))
                        }
                      >
                        <SelectTrigger className="w-[130px] bg-gray-800 border-gray-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="minutes" className="text-white focus:bg-gray-700">Minutos</SelectItem>
                          <SelectItem value="hours" className="text-white focus:bg-gray-700">Horas</SelectItem>
                          <SelectItem value="days" className="text-white focus:bg-gray-700">Días</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-300">Descripción</label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Opcional"
                    className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>

                <div className="border-t border-gray-700 pt-4 bg-gray-800/50 rounded-lg p-4">
                  <h3 className="font-medium mb-2 text-white">Productos de la receta</h3>
                  <p className="text-sm text-gray-400 mb-2">
                    Busca productos del inventario y agrégalos con cantidad. Sin productos = solo mano de obra.
                  </p>
                  <div ref={searchDropdownRef} className="relative mb-3">
                    <Input
                      placeholder="Buscar producto..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500"
                    />
                    {inventorySearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg max-h-48 overflow-y-auto z-[100]">
                        {inventorySearching ? (
                          <div className="p-3 text-sm text-gray-400">Buscando...</div>
                        ) : (() => {
                          const filtered = inventoryResults.filter(
                            (inv) => !form.items.some((i) => i.inventory_id === inv.id)
                          );
                          return filtered.length === 0 ? (
                            <div className="p-3 text-sm text-gray-400">
                              Sin productos encontrados
                            </div>
                          ) : (
                            <ul className="py-1">
                              {filtered.slice(0, 10).map((inv) => (
                                <li key={inv.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      addRecipeItem(inv, 1);
                                      setInventorySearch('');
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-white hover:bg-gray-700 transition-colors"
                                  >
                                    {inv.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  {form.items.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-2 text-gray-300">Producto</th>
                          <th className="text-left py-2 text-gray-300">Cantidad</th>
                          <th className="text-left py-2 text-gray-300">Unidad</th>
                          <th className="text-left py-2 text-gray-300">Stock</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it) => {
                          const stock = it.current_stock ?? 0;
                          const ok = stock >= it.quantity;
                          return (
                            <tr key={it.inventory_id} className="border-b border-gray-700/50">
                              <td className="py-2">
                                <div className="bg-gray-800 rounded p-2 text-white">{it.name}</div>
                              </td>
                              <td className="py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-20 h-8 bg-gray-800 border-gray-700 text-white focus:border-cyan-500 focus:ring-cyan-500"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    updateRecipeQuantity(
                                      it.inventory_id,
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                />
                              </td>
                              <td className="py-2 text-gray-300">{it.unit}</td>
                              <td className="py-2">
                                {ok ? (
                                  <span title="Stock suficiente">🟢</span>
                                ) : (
                                  <span title="Stock insuficiente">🔴</span>
                                )}
                              </td>
                              <td className="py-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => removeRecipeItem(it.inventory_id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-gray-700 flex gap-2 justify-end bg-gray-900">
                <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={submitModal} disabled={saving}>
                  {saving ? 'Guardando...' : editingId ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Eliminar paquete</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminar &quot;{packageToDelete?.name}&quot;? Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
