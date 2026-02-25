'use client';

import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, Pencil, RefreshCw } from 'lucide-react';
import { useSession } from '@/lib/context/SessionContext';
import { useOrgCurrency } from '@/lib/context/CurrencyContext';
import { toast } from 'sonner';

interface CashAccount {
  id: string;
  name: string;
  account_number: string;
  account_type: string;
  initial_balance: number;
  current_balance: number;
  notes?: string | null;
  is_active: boolean;
}

export default function CuentasEfectivoPage() {
  const { organizationId } = useSession();
  const { formatMoney } = useOrgCurrency();
  const [accounts, setAccounts] = useState<CashAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<CashAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    account_number: '001',
    account_type: 'cash' as 'cash' | 'bank',
    initial_balance: 0,
    notes: '',
  });
  const [moveForm, setMoveForm] = useState({ movement_type: 'deposit' as 'deposit' | 'withdrawal', amount: '', notes: '' });
  const [editForm, setEditForm] = useState({ name: '', account_number: '', account_type: 'cash' as 'cash' | 'bank', notes: '' });

  const loadAccounts = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/cash-accounts', { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data?.items) setAccounts(json.data.items);
      else setAccounts([]);
    } catch (e) {
      console.error(e);
      toast.error('Error al cargar cuentas');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, [organizationId]);

  const filtered = accounts.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.account_number || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/cash-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...createForm,
          initial_balance: Number(createForm.initial_balance) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Cuenta creada');
        setCreateOpen(false);
        setCreateForm({ name: '', account_number: '001', account_type: 'cash', initial_balance: 0, notes: '' });
        loadAccounts();
      } else toast.error(json.error || 'Error al crear');
    } catch (e) {
      toast.error('Error al crear cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    const amount = parseFloat(moveForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Monto debe ser mayor a 0');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cash-accounts/${selectedAccount.id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          movement_type: moveForm.movement_type,
          amount,
          notes: moveForm.notes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(moveForm.movement_type === 'deposit' ? 'Ingreso registrado' : 'Retiro registrado');
        setMoveOpen(false);
        setSelectedAccount(null);
        setMoveForm({ movement_type: 'deposit', amount: '', notes: '' });
        loadAccounts();
      } else toast.error(json.error || 'Error');
    } catch (e) {
      toast.error('Error al registrar movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccount) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cash-accounts/${selectedAccount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Cuenta actualizada');
        setEditOpen(false);
        setSelectedAccount(null);
        loadAccounts();
      } else toast.error(json.error || 'Error al actualizar');
    } catch (e) {
      toast.error('Error al actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Cuentas de efectivo"
      breadcrumbs={[
        { label: 'Inicio', href: '/' },
        { label: 'Ingresos', href: '/ingresos' },
        { label: 'Cuentas de efectivo', href: '/ingresos/cuentas-efectivo' },
      ]}
    >
      <div className="space-y-6 p-6">
        <StandardBreadcrumbs
          currentPage="Cuentas de efectivo"
          parentPages={[{ label: 'Ingresos', href: '/ingresos' }]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cuentas de efectivo</h1>
            <p className="text-text-secondary">Administra cajas y cuentas de efectivo</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAccounts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva cuenta
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nueva cuenta de efectivo</DialogTitle>
                  <DialogDescription>Agrega una caja o cuenta bancaria.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <Label>Nombre *</Label>
                    <Input
                      value={createForm.name}
                      onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="Ej. Caja Principal"
                      required
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input
                      value={createForm.account_number}
                      onChange={(e) => setCreateForm((f) => ({ ...f, account_number: e.target.value }))}
                      placeholder="001"
                    />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={createForm.account_type}
                      onValueChange={(v: 'cash' | 'bank') => setCreateForm((f) => ({ ...f, account_type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="bank">Banco</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Saldo inicial</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={createForm.initial_balance || ''}
                      onChange={(e) => setCreateForm((f) => ({ ...f, initial_balance: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label>Notas</Label>
                    <Textarea
                      value={createForm.notes}
                      onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Guardando...' : 'Crear cuenta'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o número..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="rounded-md border bg-bg-secondary overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-bg-tertiary border-b border-border">
              <tr>
                <th className="h-12 px-4 font-medium text-text-primary">Nombre</th>
                <th className="h-12 px-4 font-medium text-text-primary">Número</th>
                <th className="h-12 px-4 font-medium text-text-primary">Tipo</th>
                <th className="h-12 px-4 font-medium text-text-primary">Saldo inicial</th>
                <th className="h-12 px-4 font-medium text-text-primary">Saldo actual</th>
                <th className="h-12 px-4 text-right font-medium text-text-primary">Opciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No hay cuentas. Crea una con el botón &quot;Nueva cuenta&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((acc) => (
                  <tr key={acc.id} className="border-b border-border hover:bg-bg-tertiary/50">
                    <td className="p-4 font-medium text-text-primary">{acc.name}</td>
                    <td className="p-4 text-text-secondary">{acc.account_number}</td>
                    <td className="p-4">
                      <span className={acc.account_type === 'cash' ? 'text-amber-600' : 'text-blue-600'}>
                        {acc.account_type === 'cash' ? 'Efectivo' : 'Banco'}
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary">{formatMoney(Number(acc.initial_balance))}</td>
                    <td className="p-4 font-medium text-text-primary">{formatMoney(Number(acc.current_balance))}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ingresar"
                          onClick={() => {
                            setSelectedAccount(acc);
                            setMoveForm({ movement_type: 'deposit', amount: '', notes: '' });
                            setMoveOpen(true);
                          }}
                        >
                          <ArrowDownCircle className="h-5 w-5 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Retirar"
                          onClick={() => {
                            setSelectedAccount(acc);
                            setMoveForm({ movement_type: 'withdrawal', amount: '', notes: '' });
                            setMoveOpen(true);
                          }}
                        >
                          <ArrowUpCircle className="h-5 w-5 text-red-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => {
                            setSelectedAccount(acc);
                            setEditForm({
                              name: acc.name,
                              account_number: acc.account_number,
                              account_type: acc.account_type as 'cash' | 'bank',
                              notes: acc.notes || '',
                            });
                            setEditOpen(true);
                          }}
                        >
                          <Pencil className="h-5 w-5 text-text-secondary" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal ingreso/retiro */}
      <Dialog open={moveOpen} onOpenChange={(o) => { setMoveOpen(o); if (!o) setSelectedAccount(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {moveForm.movement_type === 'deposit' ? 'Ingresar' : 'Retirar'} — {selectedAccount?.name}
            </DialogTitle>
            <DialogDescription>Monto en {selectedAccount?.account_type === 'cash' ? 'efectivo' : 'cuenta'}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMove} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={moveForm.movement_type}
                onValueChange={(v: 'deposit' | 'withdrawal') => setMoveForm((f) => ({ ...f, movement_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Ingreso</SelectItem>
                  <SelectItem value="withdrawal">Retiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={moveForm.amount}
                onChange={(e) => setMoveForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={moveForm.notes}
                onChange={(e) => setMoveForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMoveOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Guardando...' : moveForm.movement_type === 'deposit' ? 'Registrar ingreso' : 'Registrar retiro'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setSelectedAccount(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cuenta</DialogTitle>
            <DialogDescription>Modifica nombre, número o tipo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Número</Label>
              <Input
                value={editForm.account_number}
                onChange={(e) => setEditForm((f) => ({ ...f, account_number: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={editForm.account_type}
                onValueChange={(v: 'cash' | 'bank') => setEditForm((f) => ({ ...f, account_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="bank">Banco</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Guardar'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
