'use client';

import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
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
    estimated_minutes: '',
    items: [] as RecipeItem[],
  });

  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryResults, setInventoryResults] = useState<InventoryItem[]>([]);
  const [inventorySearching, setInventorySearching] = useState(false);

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
      estimated_minutes: '',
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
    setForm({
      name: d.name,
      description: d.description ?? '',
      category: (d.category as Category) ?? '',
      price: String(d.price),
      estimated_minutes: d.estimated_minutes != null ? String(d.estimated_minutes) : '',
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
      const res = await fetch(`/api/inventory?search=${encodeURIComponent(q)}&pageSize=20`);
      const json = await res.json();
      const list = json?.data?.items ?? json?.data ?? [];
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
    const estimated_minutes = form.estimated_minutes.trim()
      ? parseInt(form.estimated_minutes, 10)
      : null;
    const body = {
      name,
      description: form.description.trim() || undefined,
      category: form.category || undefined,
      price,
      estimated_minutes: estimated_minutes != null && !isNaN(estimated_minutes) ? estimated_minutes : undefined,
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
    if (!cat) return 'bg-muted text-muted-foreground';
    const c = cat.toLowerCase();
    if (c.includes('motor')) return 'bg-blue-500/20 text-blue-400';
    if (c.includes('transmisión') || c.includes('transmision')) return 'bg-amber-500/20 text-amber-400';
    if (c.includes('freno')) return 'bg-red-500/20 text-red-400';
    if (c.includes('suspensión') || c.includes('suspension')) return 'bg-green-500/20 text-green-400';
    if (c.includes('eléctrico') || c.includes('electrico')) return 'bg-yellow-500/20 text-yellow-400';
    if (c.includes('carrocería') || c.includes('carroceria')) return 'bg-purple-500/20 text-purple-400';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <AppLayout
      title="Paquetes de Servicio"
      breadcrumbs={[
        { label: 'Inventarios', href: '/inventarios' },
        { label: 'Paquetes de Servicio', href: '/service-packages' },
      ]}
    >
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
          <Card>
            <CardContent className="p-8 flex justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : packages.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2">No hay paquetes de servicio</h3>
              <p className="text-muted-foreground mb-4">
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
              <Card key={pkg.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      {pkg.category && (
                        <Badge className={categoryColor(pkg.category)}>
                          {pkg.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-lg font-medium mt-2">
                    ${Number(pkg.price).toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {itemCount(pkg)} producto(s) en la receta
                  </p>
                  {pkg.estimated_minutes != null && (
                    <p className="text-sm text-muted-foreground">
                      ~{pkg.estimated_minutes} min
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
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {editingId ? 'Editar paquete' : 'Nuevo paquete'}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setModalOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Cambio de aceite"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Categoría</label>
                  <Select
                    value={form.category || undefined}
                    onValueChange={(v) => setForm((p) => ({ ...p, category: v as Category }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Precio *</label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tiempo estimado (min)</label>
                    <Input
                      type="number"
                      min={0}
                      value={form.estimated_minutes}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, estimated_minutes: e.target.value }))
                      }
                      placeholder="Opcional"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Descripción</label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>

                <div className="border-t border-border pt-4">
                  <h3 className="font-medium mb-2">Productos de la receta</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Busca productos del inventario y agrégalos con cantidad. Sin productos = solo mano de obra.
                  </p>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Buscar producto..."
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                    />
                  </div>
                  {inventorySearch && (
                    <div className="border border-border rounded-md max-h-40 overflow-y-auto mb-3">
                      {inventorySearching ? (
                        <div className="p-3 text-sm text-muted-foreground">Buscando...</div>
                      ) : inventoryResults.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                          Sin resultados
                        </div>
                      ) : (
                        <ul className="divide-y divide-border">
                          {inventoryResults
                            .filter(
                              (inv) =>
                                !form.items.some((i) => i.inventory_id === inv.id)
                            )
                            .slice(0, 10)
                            .map((inv) => (
                              <li key={inv.id} className="flex items-center justify-between p-2">
                                <span className="text-sm">{inv.name}</span>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min={1}
                                    className="w-20"
                                    defaultValue={1}
                                    id={`q-${inv.id}`}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const input = document.getElementById(
                                        `q-${inv.id}`
                                      ) as HTMLInputElement;
                                      const q = input ? parseInt(input.value, 10) : 1;
                                      addRecipeItem(inv, isNaN(q) ? 1 : q);
                                    }}
                                  >
                                    Agregar
                                  </Button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {form.items.length > 0 && (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2">Producto</th>
                          <th className="text-left py-2">Cantidad</th>
                          <th className="text-left py-2">Unidad</th>
                          <th className="text-left py-2">Stock</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {form.items.map((it) => {
                          const stock = it.current_stock ?? 0;
                          const ok = stock >= it.quantity;
                          return (
                            <tr key={it.inventory_id} className="border-b border-border/50">
                              <td className="py-2">{it.name}</td>
                              <td className="py-2">
                                <Input
                                  type="number"
                                  min={0}
                                  className="w-20 h-8"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    updateRecipeQuantity(
                                      it.inventory_id,
                                      parseInt(e.target.value, 10) || 0
                                    )
                                  }
                                />
                              </td>
                              <td className="py-2">{it.unit}</td>
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
                                  className="h-8 w-8 text-destructive"
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
              <div className="p-4 border-t border-border flex gap-2 justify-end">
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
    </AppLayout>
  );
}
