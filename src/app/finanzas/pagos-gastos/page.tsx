'use client'

import { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { StandardBreadcrumbs } from '@/components/ui/breadcrumbs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Plus, Search, DollarSign, TrendingDown, TrendingUp, CreditCard, Loader2,
  Receipt, Building2, RefreshCw, ArrowDownCircle, ArrowUpCircle, Clock, ScanLine,
  Wallet, User, Banknote, ArrowRightLeft, CheckCircle2, XCircle, AlertTriangle, Trash2
} from 'lucide-react'
import { useSuppliers } from '@/hooks/useSuppliers'
import { useOrganization } from '@/lib/context/SessionContext'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { getCollections, Collection } from '@/lib/supabase/collections'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type UnifiedEntry = {
  id: string
  type: 'cobro' | 'supplier' | 'expense'
  // cobro fields
  customer_id?: string
  customer_name?: string
  reference_number?: string | null
  // supplier fields
  supplier_id?: string
  supplier_name?: string
  // expense fields
  category?: string
  description?: string | null
  // common
  amount: number
  payment_date: string
  payment_method: string
  reference?: string | null
  notes?: string | null
  status: string
  created_at: string
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'check', label: 'Cheque' },
]

const EXPENSE_CATEGORIES = [
  { value: 'renta', label: 'Renta' },
  { value: 'servicios', label: 'Servicios (Luz, Agua, Internet)' },
  { value: 'nomina', label: 'Nómina' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'limpieza', label: 'Limpieza' },
  { value: 'comida', label: 'Comida / Alimentos' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'mantenimiento', label: 'Mantenimiento Local' },
  { value: 'otro', label: 'Otro' },
]

// ── Anticipos types & configs ──────────────────────────────────────────────

type AdvancePaymentMethod = 'cash' | 'transfer' | 'card'

interface CashAdvance {
  id: string
  amount: number
  purpose: string
  status: 'open' | 'closed' | 'cancelled'
  notes: string | null
  payment_method: AdvancePaymentMethod | null
  cash_account_id: string | null
  cash_account: { id: string; name: string; account_type: string } | null
  created_at: string
  total_spent: number
  balance: number
  employee: { id: string; name: string; email: string } | null
  customer: { id: string; name: string; phone?: string | null } | null
  expenses: Array<{ id: string; amount: number; description: string; expense_date: string }>
}

interface UserOption { id: string; name: string; email: string }

const ADV_STATUS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  open:      { label: 'Abierto',   color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',      icon: Clock },
  closed:    { label: 'Cerrado',   color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/15 text-red-400 border-red-500/30',             icon: XCircle },
}

const ADV_METHOD: Record<AdvancePaymentMethod, { label: string; icon: typeof Banknote; color: string }> = {
  cash:     { label: 'Efectivo',      icon: Banknote,      color: 'text-emerald-400' },
  transfer: { label: 'Transferencia', icon: ArrowRightLeft, color: 'text-blue-400' },
  card:     { label: 'Tarjeta',       icon: CreditCard,     color: 'text-purple-400' },
}

const ADV_ACCOUNT_TYPES: Record<AdvancePaymentMethod, string[]> = {
  cash:     ['cash'],
  transfer: ['bank'],
  card:     ['card', 'bank'],
}

// ───────────────────────────────────────────────────────────────────────────

export default function Page() {
  return (
    <Suspense>
      <EntradasSalidasPage />
    </Suspense>
  )
}

function EntradasSalidasPage() {
  const { organizationId, ready } = useOrganization()
  const { formatMoney } = useOrgCurrency()
  const { suppliers, loading: suppliersLoading } = useSuppliers({ pageSize: 500, autoLoad: true })

  const [entries, setEntries] = useState<UnifiedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [scanLoading, setScanLoading] = useState(false)
  const scanFileRef = useRef<HTMLInputElement>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'cobro' | 'gastos'>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmingSubmit, setConfirmingSubmit] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'cobro' | 'supplier' | 'expense'; label: string } | null>(null)
  const [deleteAdvanceTarget, setDeleteAdvanceTarget] = useState<CashAdvance | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [stats, setStats] = useState({ totalCobrado: 0, totalEgresos: 0, pendingCobros: 0, count: 0 })
  const [cashAccounts, setCashAccounts] = useState<Array<{ id: string; name: string; account_type?: string }>>([])

  // Main tab (movimientos / anticipos)
  const searchParams = useSearchParams()
  const [mainTab, setMainTab] = useState<'movimientos' | 'anticipos'>('movimientos')

  // Anticipos state
  const [advances, setAdvances] = useState<CashAdvance[]>([])
  const [advancesLoading, setAdvancesLoading] = useState(false)
  const [advFilterStatus, setAdvFilterStatus] = useState('open')
  const [showAdvCreate, setShowAdvCreate] = useState(false)
  const [selectedAdvance, setSelectedAdvance] = useState<CashAdvance | null>(null)
  const [employees, setEmployees] = useState<UserOption[]>([])
  const [advAmount, setAdvAmount] = useState('')
  const [advPurpose, setAdvPurpose] = useState('')
  const [advEmployeeId, setAdvEmployeeId] = useState('')
  const [advNotes, setAdvNotes] = useState('')
  const [advMethod, setAdvMethod] = useState<AdvancePaymentMethod>('cash')
  const [advAccountId, setAdvAccountId] = useState('')
  const [advSubmitting, setAdvSubmitting] = useState(false)
  // Customer for advance
  const [advCustomerId, setAdvCustomerId] = useState('')
  const [advCustomerSearch, setAdvCustomerSearch] = useState('')
  const [advCustomerFreeText, setAdvCustomerFreeText] = useState('')
  const [advCustomerPhone, setAdvCustomerPhone] = useState('')
  const [advRegisterCustomer, setAdvRegisterCustomer] = useState(true)

  // Customers for cobro
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; phone?: string | null }>>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerFreeText, setCustomerFreeText] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [registerNewCustomer, setRegisterNewCustomer] = useState(true)

  // Suppliers free-text for pagos
  const [supplierFreeText, setSupplierFreeText] = useState('')
  const [registerNewSupplier, setRegisterNewSupplier] = useState(true)

  // Mark cobro as paid
  const [cobroToPay, setCobroToPay] = useState<UnifiedEntry | null>(null)
  const [cobroPayOpen, setCobroPayOpen] = useState(false)
  const [cobroPayForm, setCobroPayForm] = useState({ payment_method: 'transfer', cash_account_id: '' })

  const [form, setForm] = useState({
    paymentType: 'cobro' as 'cobro' | 'supplier' | 'expense',
    // cobro
    customer_id: '',
    cobro_status: 'pending',
    // supplier
    supplier_id: '',
    // expense
    category: '',
    // common
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer',
    description: '',
    reference: '',
    notes: '',
    cash_account_id: '',
  })

  const supplierNameById = Object.fromEntries(suppliers.map(s => [s.id, s.name]))

  const customerNameById = useMemo(
    () => Object.fromEntries(customers.map(c => [c.id, c.name])),
    [customers]
  )

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 20)
    const t = customerSearch.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(t) || (c.phone || '').includes(t)
    ).slice(0, 20)
  }, [customers, customerSearch])

  const filteredAdvCustomers = useMemo(() => {
    if (!advCustomerSearch) return customers.slice(0, 20)
    const t = advCustomerSearch.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(t) || (c.phone || '').includes(t)
    ).slice(0, 20)
  }, [customers, advCustomerSearch])

  // Load customers once
  useEffect(() => {
    if (!organizationId) return
    fetch('/api/customers?limit=500', { credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.data?.items) setCustomers(res.data.items)
        else if (Array.isArray(res.data)) setCustomers(res.data)
      })
      .catch(() => {})
  }, [organizationId])

  // Load cash accounts
  useEffect(() => {
    if (!organizationId) return
    fetch('/api/cash-accounts', { credentials: 'include' })
      .then(r => r.json())
      .then(res => { if (res?.success && res?.data?.items?.length) setCashAccounts(res.data.items.map((a: any) => ({ id: a.id, name: a.name, account_type: a.account_type }))) })
      .catch(() => {})
  }, [organizationId])

  const loadEntries = useCallback(async () => {
    if (!organizationId) return
    setLoading(true)
    try {
      const [paymentsRes, expensesRes, collectionsData] = await Promise.all([
        fetch('/api/supplier-payments', { credentials: 'include' }).then(r => r.json()).catch(() => null),
        fetch('/api/expenses', { credentials: 'include' }).then(r => r.json()).catch(() => null),
        getCollections(organizationId).catch(() => [] as Collection[]),
      ])

      const unified: UnifiedEntry[] = []
      let totalCobrado = 0, totalEgresos = 0, pendingCobros = 0

      // Cobros (entradas de clientes)
      for (const c of (collectionsData || [])) {
        unified.push({
          id: c.id,
          type: 'cobro',
          customer_id: c.customer_id,
          customer_name: '',
          reference_number: c.reference_number,
          notes: (c as any).notes || null,
          amount: Number(c.amount || 0),
          payment_date: c.due_date,
          payment_method: c.payment_method || 'transfer',
          status: c.status,
          created_at: c.created_at || c.due_date,
        })
        if (c.status === 'paid') totalCobrado += Number(c.amount || 0)
        else if (c.status === 'pending') pendingCobros += Number(c.amount || 0)
      }

      // Supplier payments
      if (paymentsRes?.success && paymentsRes?.data?.items) {
        for (const p of paymentsRes.data.items) {
          unified.push({
            id: p.id,
            type: 'supplier',
            supplier_id: p.supplier_id,
            supplier_name: supplierNameById[p.supplier_id] || 'Proveedor',
            amount: Number(p.amount),
            payment_date: p.payment_date,
            payment_method: p.payment_method || 'transfer',
            reference: p.reference,
            notes: p.notes,
            status: p.status,
            created_at: p.created_at,
          })
          if (p.status === 'completed' || p.status === 'paid') totalEgresos += Number(p.amount)
        }
      }

      // Expenses
      if (expensesRes?.success && expensesRes?.data) {
        for (const e of expensesRes.data) {
          unified.push({
            id: e.id,
            type: 'expense',
            category: e.category,
            description: e.description,
            amount: Number(e.amount),
            payment_date: e.expense_date,
            payment_method: e.payment_method || 'cash',
            status: 'completed',
            created_at: e.created_at,
          })
          totalEgresos += Number(e.amount)
        }
      }

      unified.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

      setEntries(unified)
      setStats({ totalCobrado, totalEgresos, pendingCobros, count: unified.length })
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [organizationId, supplierNameById])

  useEffect(() => {
    if (ready && organizationId && !suppliersLoading) loadEntries()
  }, [ready, organizationId, suppliersLoading])

  // Sync tab from URL
  useEffect(() => {
    if (searchParams.get('tab') === 'anticipos') setMainTab('anticipos')
  }, [searchParams])

  // Load employees for advance form
  useEffect(() => {
    if (!organizationId) return
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setEmployees(d.data?.users || d.data || []) })
      .catch(() => {})
  }, [organizationId])

  // Anticipos: load + filtered accounts + auto-select
  const loadAdvances = useCallback(async () => {
    if (!organizationId) return
    setAdvancesLoading(true)
    try {
      const params = advFilterStatus !== 'all' ? `?status=${advFilterStatus}` : ''
      const res = await fetch(`/api/cash-advances${params}`, { credentials: 'include' })
      const json = await res.json()
      if (json.success) setAdvances(json.data || [])
      else console.error('[loadAdvances] error:', json.error)
    } finally {
      setAdvancesLoading(false)
    }
  }, [advFilterStatus, organizationId])

  useEffect(() => {
    if (mainTab === 'anticipos' && ready && organizationId) loadAdvances()
  }, [mainTab, loadAdvances, ready, organizationId])

  // Mostrar todas las cuentas — el filtro por tipo era demasiado estricto y ocultaba cuentas reales
  const filteredAdvanceAccounts = cashAccounts

  useEffect(() => {
    if (filteredAdvanceAccounts.length === 1) setAdvAccountId(filteredAdvanceAccounts[0].id)
    else setAdvAccountId('')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advMethod, filteredAdvanceAccounts.length])

  const handleCreateAdvance = async () => {
    if (!advAmount || !advPurpose.trim()) { toast.error('Monto y propósito son requeridos'); return }
    const amountNum = parseFloat(advAmount)
    if (isNaN(amountNum) || amountNum <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    setAdvSubmitting(true)
    try {
      // Resolver o crear cliente si viene como texto libre
      let resolvedCustomerId = advCustomerId || null
      if (!resolvedCustomerId && advCustomerFreeText.trim() && advRegisterCustomer) {
        const createRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: advCustomerFreeText.trim(), phone: advCustomerPhone.trim() || undefined }),
        })
        const createData = await createRes.json()
        if (!createData?.success) { toast.error('No se pudo registrar el cliente'); setAdvSubmitting(false); return }
        resolvedCustomerId = createData.data.id
        setAdvCustomerId(resolvedCustomerId!)
        setCustomers(prev => [...prev, { id: resolvedCustomerId!, name: advCustomerFreeText.trim(), phone: advCustomerPhone.trim() || null }])
      }

      const res = await fetch('/api/cash-advances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          amount: amountNum,
          purpose: advPurpose.trim(),
          employee_id: advEmployeeId || null,
          customer_id: resolvedCustomerId,
          notes: advNotes.trim() || undefined,
          payment_method: advMethod,
          cash_account_id: advAccountId || null,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const extra = !advCustomerId && advCustomerFreeText.trim() && advRegisterCustomer ? ` · ${advCustomerFreeText.trim()} guardado como cliente` : ''
      toast.success('Anticipo registrado' + extra)
      setShowAdvCreate(false)
      setAdvAmount(''); setAdvPurpose(''); setAdvEmployeeId(''); setAdvNotes('')
      setAdvMethod('cash'); setAdvAccountId('')
      setAdvCustomerId(''); setAdvCustomerSearch(''); setAdvCustomerFreeText(''); setAdvCustomerPhone(''); setAdvRegisterCustomer(true)
      loadAdvances()
    } catch (e: any) {
      toast.error(e.message || 'Error al crear anticipo')
    } finally {
      setAdvSubmitting(false)
    }
  }

  const handleCloseAdvance = async (adv: CashAdvance, statusTo: 'closed' | 'cancelled') => {
    try {
      const res = await fetch(`/api/cash-advances/${adv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: statusTo }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success(statusTo === 'closed' ? 'Anticipo cerrado' : 'Anticipo cancelado')
      setSelectedAdvance(null)
      loadAdvances()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  // Resolve customer names after both customers and entries are loaded
  useEffect(() => {
    if (customers.length === 0) return
    setEntries(prev => prev.map(e =>
      e.type === 'cobro' ? { ...e, customer_name: customerNameById[e.customer_id || ''] || e.customer_id || '' } : e
    ))
  }, [customers, customerNameById])

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) { toast.error('Monto debe ser mayor a 0'); return }
    if (form.paymentType === 'cobro' && !form.customer_id && !customerFreeText.trim()) { toast.error('Selecciona o ingresa el nombre del cliente'); return }
    if (form.paymentType === 'supplier' && !form.supplier_id && !supplierFreeText.trim()) { toast.error('Selecciona o ingresa el nombre del proveedor'); return }
    if (form.paymentType === 'expense' && !form.category) { toast.error('Selecciona una categoría'); return }
    setConfirmingSubmit(true)
  }

  const handleSubmit = async () => {
    const amount = parseFloat(form.amount)
    setSubmitting(true)
    try {
      let success = false

      if (form.paymentType === 'cobro') {
        // Resolve or create customer on-the-fly
        let resolvedCustomerId = form.customer_id
        let resolvedCustomerName = customerNameById[form.customer_id] || 'Cliente'

        if (!resolvedCustomerId && customerFreeText.trim()) {
          const createRes = await fetch('/api/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              name: customerFreeText.trim(),
              phone: customerPhone.trim() || undefined,
            }),
          })
          const createData = await createRes.json()
          if (!createData?.success) {
            toast.error('No se pudo registrar el cliente, intenta de nuevo')
            setSubmitting(false)
            return
          }
          resolvedCustomerId = createData.data.id
          resolvedCustomerName = customerFreeText.trim()
          setCustomers(prev => [...prev, { id: resolvedCustomerId!, name: resolvedCustomerName, phone: customerPhone.trim() || null }])
        }

        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            customer_id: resolvedCustomerId,
            amount,
            due_date: form.payment_date,
            payment_method: form.payment_method,
            reference_number: form.reference || undefined,
            notes: form.notes || undefined,
            status: form.cobro_status,
            cash_account_id: form.cobro_status === 'paid' && form.cash_account_id ? form.cash_account_id : undefined,
          }),
        })
        const data = await res.json()
        success = data?.success
        if (success && form.cobro_status === 'paid') {
          const customerName = resolvedCustomerName
          await fetch('/api/financial-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transaction_type: 'income',
              category: 'cobro_factura',
              description: `Cobro de ${customerName}${form.notes ? ` — ${form.notes}` : ''}`,
              amount,
              account_id: form.cash_account_id || null,
              reference_type: 'collection',
              reference_id: data.data?.id || null,
            }),
          }).catch(() => {})
        }
      } else if (form.paymentType === 'supplier') {
        // Resolve or create supplier on-the-fly
        let resolvedSupplierId = form.supplier_id
        let resolvedSupplierName = supplierNameById[form.supplier_id] || 'Proveedor'

        if (!resolvedSupplierId && supplierFreeText.trim()) {
          const createRes = await fetch('/api/suppliers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name: supplierFreeText.trim() }),
          })
          const createData = await createRes.json()
          if (!createData?.success) {
            toast.error('No se pudo registrar el proveedor, intenta de nuevo')
            setSubmitting(false)
            return
          }
          resolvedSupplierId = createData.data.id
          resolvedSupplierName = supplierFreeText.trim()
        }

        const res = await fetch('/api/supplier-payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            supplier_id: resolvedSupplierId,
            amount,
            payment_date: form.payment_date,
            payment_method: form.payment_method,
            reference: form.reference || undefined,
            notes: form.notes || undefined,
            cash_account_id: form.cash_account_id || undefined,
          }),
        })
        const data = await res.json()
        success = data?.success
        if (success) {
          const supplierName = resolvedSupplierName
          await fetch('/api/financial-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transaction_type: 'expense',
              category: 'pago_proveedor',
              description: `Pago a ${supplierName}${form.notes ? ` — ${form.notes}` : ''}`,
              amount,
              account_id: form.cash_account_id || null,
              reference_type: 'supplier_payment',
              reference_id: data.data?.id || null,
            }),
          }).catch(() => {})
        }
      } else {
        const res = await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            amount,
            category: form.category,
            expense_date: form.payment_date,
            description: form.description || form.notes || '',
            payment_method: form.payment_method,
            cash_account_id: form.cash_account_id || undefined,
          }),
        })
        const data = await res.json()
        success = data?.success
        if (success) {
          const catLabel = EXPENSE_CATEGORIES.find(c => c.value === form.category)?.label || form.category
          await fetch('/api/financial-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transaction_type: 'expense',
              category: 'gasto_operativo',
              description: `Gasto: ${catLabel}${form.description ? ` — ${form.description}` : ''}`,
              amount,
              account_id: form.cash_account_id || null,
              reference_type: 'expense',
              reference_id: data.data?.id || null,
            }),
          }).catch(() => {})
        }
      }

      if (success) {
        const labels = { cobro: 'Ingreso registrado', supplier: 'Pago a proveedor registrado', expense: 'Gasto registrado' }
        const extraMsg =
          (form.paymentType === 'cobro' && !form.customer_id && customerFreeText.trim() && registerNewCustomer)
            ? ` · ${customerFreeText.trim()} guardado como cliente`
          : (form.paymentType === 'supplier' && !form.supplier_id && supplierFreeText.trim() && registerNewSupplier)
            ? ` · ${supplierFreeText.trim()} guardado como proveedor`
          : ''
        toast.success(labels[form.paymentType] + extraMsg)
        setConfirmingSubmit(false)
        setModalOpen(false)
        setForm({ paymentType: 'cobro', customer_id: '', cobro_status: 'pending', supplier_id: '', category: '', amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'transfer', description: '', reference: '', notes: '', cash_account_id: '' })
        setCustomerFreeText(''); setCustomerPhone(''); setRegisterNewCustomer(true)
        setSupplierFreeText(''); setRegisterNewSupplier(true)
        loadEntries()
      } else {
        toast.error('Error al registrar')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkCobroAsPaid = async () => {
    if (!cobroToPay) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/collections/${cobroToPay.id}/pay`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          payment_method: cobroPayForm.payment_method,
          cash_account_id: cobroPayForm.cash_account_id || undefined,
        }),
      })
      const data = await res.json()
      if (data?.success) {
        const customerName = cobroToPay.customer_name || 'Cliente'
        await fetch('/api/financial-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            transaction_type: 'income',
            category: 'cobro_factura',
            description: `Cobro de ${customerName} (marcado como pagado)`,
            amount: cobroToPay.amount,
            account_id: cobroPayForm.cash_account_id || null,
            reference_type: 'collection',
            reference_id: cobroToPay.id,
          }),
        }).catch(() => {})
        toast.success('Ingreso marcado como pagado')
        setCobroPayOpen(false)
        setCobroToPay(null)
        loadEntries()
      } else {
        toast.error(data?.error || 'Error')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteEntry = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const endpoints: Record<string, string> = {
        cobro: `/api/collections/${deleteTarget.id}`,
        supplier: `/api/supplier-payments/${deleteTarget.id}`,
        expense: `/api/expenses/${deleteTarget.id}`,
      }
      const res = await fetch(endpoints[deleteTarget.type], { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (data?.success) {
        toast.success('Registro eliminado')
        setDeleteTarget(null)
        loadEntries()
      } else {
        toast.error(data?.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAdvance = async () => {
    if (!deleteAdvanceTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/cash-advances/${deleteAdvanceTarget.id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (data?.success) {
        toast.success('Anticipo eliminado')
        setDeleteAdvanceTarget(null)
        setSelectedAdvance(null)
        loadAdvances()
      } else {
        toast.error(data?.error || 'Error al eliminar')
      }
    } catch {
      toast.error('Error de red')
    } finally {
      setDeleting(false)
    }
  }

  async function handleScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setScanLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/receipts/scan', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Error al analizar el ticket')
        return
      }

      if (data.ai_error) toast.warning('Ticket guardado, pero no se pudo extraer texto.')

      setForm(f => ({
        ...f,
        paymentType: 'expense',
        amount: data.total ? String(data.total) : f.amount,
        description: data.description || (data.vendor ? `Compra en ${data.vendor}` : ''),
        payment_date: data.date || f.payment_date,
        category: data.suggested_category || 'otro',
      }))
      setModalOpen(true)

      if (data.total) {
        toast.success(`Ticket detectado: $${data.total}${data.vendor ? ` — ${data.vendor}` : ''}`)
      }
    } catch {
      toast.error('Error de conexión al analizar el ticket')
    } finally {
      setScanLoading(false)
    }
  }

  const filteredEntries = entries.filter(e => {
    if (filterTab === 'cobro' && e.type !== 'cobro') return false
    if (filterTab === 'gastos' && e.type === 'cobro') return false
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (e.customer_name || '').toLowerCase().includes(term) ||
      (e.supplier_name || '').toLowerCase().includes(term) ||
      (e.category || '').toLowerCase().includes(term) ||
      (e.description || '').toLowerCase().includes(term) ||
      (e.reference || '').toLowerCase().includes(term) ||
      (e.reference_number || '').toLowerCase().includes(term)
  })

  const getStatusBadge = (entry: UnifiedEntry) => {
    if (entry.type === 'cobro') {
      if (entry.status === 'paid') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Pagado</Badge>
      if (entry.status === 'overdue') return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">Vencido</Badge>
      return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendiente</Badge>
    }
    if (entry.status === 'pending') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pendiente</Badge>
    return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Pagado</Badge>
  }

  return (
    <AppLayout title="Entradas y Salidas" breadcrumbs={[{ label: 'Finanzas', href: '/finanzas' }, { label: 'Entradas y Salidas' }]}>
      <div className="space-y-6 p-6">
        <StandardBreadcrumbs currentPage="Entradas y Salidas" parentPages={[{ label: 'Finanzas', href: '/finanzas' }]} />

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Entradas y Salidas</h1>
            <p className="text-muted-foreground">Ingresos de clientes, pagos a proveedores y gastos</p>
          </div>
          <div className="flex gap-2">
            {mainTab === 'movimientos' && (
              <>
                <Button variant="outline" onClick={() => scanFileRef.current?.click()} disabled={scanLoading}>
                  {scanLoading
                    ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    : <ScanLine className="mr-2 h-4 w-4" />}
                  {scanLoading ? 'Analizando...' : 'Escanear Ticket IA'}
                </Button>
                <input ref={scanFileRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleScanFile} />
                <Button onClick={() => setModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo registro
                </Button>
              </>
            )}
            {mainTab === 'anticipos' && (
              <Button onClick={() => setShowAdvCreate(true)} className="bg-cyan-600 hover:bg-cyan-500">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Anticipo
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-emerald-500/10 border-emerald-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-400">Total Ingresado</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{formatMoney(stats.totalCobrado)}</div>
              <p className="text-xs text-muted-foreground">Ingresos recibidos</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/10 border-amber-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-400">Ingresos Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{formatMoney(stats.pendingCobros)}</div>
              <p className="text-xs text-muted-foreground">Por ingresar</p>
            </CardContent>
          </Card>
          <Card className="bg-rose-500/10 border-rose-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-rose-400">Total Egresos</CardTitle>
              <TrendingDown className="h-4 w-4 text-rose-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-400">{formatMoney(stats.totalEgresos)}</div>
              <p className="text-xs text-muted-foreground">Pagos y gastos</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20 rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-400">Registros</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">{stats.count}</div>
              <p className="text-xs text-muted-foreground">Total movimientos</p>
            </CardContent>
          </Card>
        </div>

        {/* Main tab switcher */}
        <div className="flex gap-1 bg-bg-secondary rounded-lg p-1 border border-border w-fit">
          <button
            onClick={() => setMainTab('movimientos')}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${mainTab === 'movimientos' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-text-primary'}`}
          >
            Movimientos
          </button>
          <button
            onClick={() => setMainTab('anticipos')}
            className={`px-4 py-2 text-sm rounded-md transition-colors flex items-center gap-1.5 ${mainTab === 'anticipos' ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-text-primary'}`}
          >
            <Wallet className="h-3.5 w-3.5" />
            Anticipos de Efectivo
          </button>
        </div>

        {/* ── MOVIMIENTOS ── */}
        {mainTab === 'movimientos' && (
          <>
            {/* Tabs + Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex gap-1 bg-bg-secondary rounded-lg p-1 border border-border">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'cobro', label: 'Ingresos' },
                  { key: 'gastos', label: 'Gastos' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilterTab(tab.key as any)}
                    className={`px-4 py-2 text-sm rounded-md transition-colors ${filterTab === tab.key ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-text-primary'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
              </div>
            </div>

            {/* List */}
            <Card className="bg-bg-secondary border border-border rounded-xl">
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <p className="py-12 text-center text-muted-foreground">No hay registros. Crea uno con el botón superior.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {filteredEntries.map(e => (
                      <div key={`${e.type}-${e.id}`} className="flex items-center justify-between p-4 hover:bg-bg-tertiary/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-2 rounded-full shrink-0 ${
                            e.type === 'cobro' ? 'bg-emerald-500/10' :
                            e.type === 'supplier' ? 'bg-rose-500/10' : 'bg-orange-500/10'
                          }`}>
                            {e.type === 'cobro'
                              ? <ArrowDownCircle className="h-4 w-4 text-emerald-400" />
                              : e.type === 'supplier'
                              ? <Building2 className="h-4 w-4 text-rose-400" />
                              : <Receipt className="h-4 w-4 text-orange-400" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {e.type === 'cobro'
                                ? (e.customer_name || e.customer_id || 'Cliente')
                                : e.type === 'supplier'
                                ? e.supplier_name
                                : (e.description || e.category || 'Gasto')}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className={`font-medium ${e.type === 'cobro' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {e.type === 'cobro' ? '↓ Ingreso' : e.type === 'supplier' ? '↑ Proveedor' : '↑ Gasto'}
                              </span>
                              <span>·</span>
                              <span>{new Date(e.payment_date).toLocaleDateString('es-MX')}</span>
                              <span>·</span>
                              <span>{PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method}</span>
                              {e.notes && <><span>·</span><span className="truncate max-w-[120px]">{e.notes}</span></>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getStatusBadge(e)}
                          <span className={`text-sm font-bold ${e.type === 'cobro' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatMoney(e.amount)}
                          </span>
                          {e.type === 'cobro' && e.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => { setCobroToPay(e); setCobroPayOpen(true); setCobroPayForm({ payment_method: 'transfer', cash_account_id: '' }) }}
                            >
                              Cobrar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0"
                            onClick={() => setDeleteTarget({
                              id: e.id,
                              type: e.type,
                              label: e.type === 'cobro'
                                ? (e.customer_name || 'Ingreso')
                                : e.type === 'supplier'
                                ? (e.supplier_name || 'Pago proveedor')
                                : (e.description || e.category || 'Gasto'),
                            })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ── ANTICIPOS ── */}
        {mainTab === 'anticipos' && (
          <div className="space-y-4">
            {/* KPIs */}
            {(() => {
              const openAdv = advances.filter(a => a.status === 'open')
              const totalPending = openAdv.reduce((s, a) => s + a.balance, 0)
              const withDiscrepancy = openAdv.filter(a => a.total_spent > 0 && a.balance !== 0)
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card className="bg-slate-800/60 border-slate-700/50 rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 mb-1">Anticipos abiertos</p>
                      <p className="text-2xl font-bold text-white">{openAdv.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/60 border-slate-700/50 rounded-xl">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 mb-1">Saldo pendiente total</p>
                      <p className={cn('text-2xl font-bold', totalPending > 0 ? 'text-amber-400' : 'text-emerald-400')}>
                        {formatMoney(totalPending)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-slate-800/60 border-slate-700/50 rounded-xl col-span-2 md:col-span-1">
                    <CardContent className="p-4">
                      <p className="text-xs text-slate-400 mb-1">Con diferencia pendiente</p>
                      <p className={cn('text-2xl font-bold', withDiscrepancy.length > 0 ? 'text-red-400' : 'text-slate-400')}>
                        {withDiscrepancy.length}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )
            })()}

            {/* Filtros de estado */}
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'open', label: 'Abiertos' },
                { key: 'closed', label: 'Cerrados' },
                { key: 'cancelled', label: 'Cancelados' },
                { key: 'all', label: 'Todos' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setAdvFilterStatus(f.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    advFilterStatus === f.key ? 'bg-cyan-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Lista de anticipos */}
            {advancesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
              </div>
            ) : advances.length === 0 ? (
              <Card className="bg-bg-secondary border border-border rounded-xl">
                <CardContent className="py-12 text-center">
                  <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No hay anticipos {advFilterStatus !== 'all' ? `con estado "${advFilterStatus}"` : ''}</p>
                  <Button onClick={() => setShowAdvCreate(true)} className="mt-4 bg-cyan-600 hover:bg-cyan-500">
                    Registrar primer anticipo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {advances.map(adv => {
                  const cfg = ADV_STATUS[adv.status] || ADV_STATUS.open
                  const StatusIcon = cfg.icon
                  const method = adv.payment_method ? ADV_METHOD[adv.payment_method] : null
                  const hasDiscrepancy = adv.status === 'open' && adv.total_spent > 0 && adv.balance !== 0
                  return (
                    <Card
                      key={adv.id}
                      className={cn(
                        'bg-bg-secondary border border-border rounded-xl cursor-pointer hover:border-slate-600 transition-colors',
                        hasDiscrepancy && 'border-amber-500/40'
                      )}
                      onClick={() => setSelectedAdvance(adv)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', cfg.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                              {method && (
                                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700/60 border border-slate-600', method.color)}>
                                  <method.icon className="w-3 h-3" />
                                  {method.label}
                                </span>
                              )}
                              {hasDiscrepancy && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                  <AlertTriangle className="w-3 h-3" />
                                  Diferencia
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-text-primary truncate">{adv.purpose}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {adv.employee && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {adv.employee.name}
                                </p>
                              )}
                              {adv.cash_account && (
                                <p className="text-xs text-slate-400 flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  {adv.cash_account.name}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              {new Date(adv.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-text-primary">{formatMoney(adv.amount)}</p>
                            {adv.total_spent > 0 && (
                              <p className="text-xs text-slate-400">Gastado: {formatMoney(adv.total_spent)}</p>
                            )}
                            {adv.status === 'open' && (
                              <p className={cn('text-xs font-semibold', adv.balance > 0 ? 'text-amber-400' : adv.balance < 0 ? 'text-red-400' : 'text-emerald-400')}>
                                {adv.balance > 0 ? `Saldo: ${formatMoney(adv.balance)}` : adv.balance < 0 ? `Excedido: ${formatMoney(Math.abs(adv.balance))}` : 'Cuadrado'}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal nuevo registro ── */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setModalOpen(false); setConfirmingSubmit(false); setCustomerFreeText(''); setCustomerPhone(''); setRegisterNewCustomer(true); setSupplierFreeText(''); setRegisterNewSupplier(true) } }}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">

          {/* Paso 1: Formulario */}
          {!confirmingSubmit && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Registrar entrada o salida</DialogTitle>
                <DialogDescription className="text-slate-400">Selecciona el tipo y completa los datos.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Type selector */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentType: 'cobro' }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${form.paymentType === 'cobro' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    <ArrowDownCircle className="h-5 w-5 mx-auto mb-1" />
                    Ingreso
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentType: 'supplier' }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${form.paymentType === 'supplier' ? 'bg-rose-500/10 border-rose-500/40 text-rose-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    <Building2 className="h-5 w-5 mx-auto mb-1" />
                    Proveedor
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, paymentType: 'expense' }))}
                    className={`p-3 rounded-lg border text-sm font-medium transition-colors ${form.paymentType === 'expense' ? 'bg-orange-500/10 border-orange-500/40 text-orange-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}
                  >
                    <Receipt className="h-5 w-5 mx-auto mb-1" />
                    Gasto
                  </button>
                </div>

                {/* Cobro fields */}
                {form.paymentType === 'cobro' && (
                  <>
                    <div>
                      <Label className="text-slate-300">Cliente *</Label>
                      <Select
                        value={form.customer_id}
                        onValueChange={v => { setForm(f => ({ ...f, customer_id: v })); setCustomerFreeText(''); setCustomerPhone('') }}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Buscar cliente registrado..." /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <div className="p-2">
                            <Input placeholder="Buscar cliente..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} className="h-8 bg-slate-700 border-slate-600 text-white" />
                          </div>
                          {filteredCustomers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</SelectItem>)}
                          {filteredCustomers.length === 0 && <p className="text-xs text-slate-400 p-2">Sin resultados</p>}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Free-text fallback when no registered customer selected */}
                    {!form.customer_id && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-slate-700" />
                          <span className="text-xs text-slate-500">o ingresa el nombre</span>
                          <div className="flex-1 h-px bg-slate-700" />
                        </div>
                        <Input
                          value={customerFreeText}
                          onChange={e => setCustomerFreeText(e.target.value)}
                          placeholder="Nombre del cliente (sin registrar)"
                          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        />
                        {customerFreeText.trim() && (
                          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={registerNewCustomer}
                                onChange={e => setRegisterNewCustomer(e.target.checked)}
                                className="w-4 h-4 rounded accent-emerald-500"
                              />
                              <span className="text-sm text-emerald-400 font-medium">¿Registrarlo como cliente?</span>
                            </label>
                            {registerNewCustomer && (
                              <Input
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                placeholder="Teléfono (opcional)"
                                className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 h-8 text-sm"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <Label className="text-slate-300">Estado</Label>
                      <Select value={form.cobro_status} onValueChange={v => setForm(f => ({ ...f, cobro_status: v }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="pending">Pendiente</SelectItem>
                          <SelectItem value="paid">Pagado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Supplier fields */}
                {form.paymentType === 'supplier' && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-slate-300">Proveedor *</Label>
                      <Select
                        value={form.supplier_id}
                        onValueChange={v => { setForm(f => ({ ...f, supplier_id: v })); setSupplierFreeText('') }}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Buscar proveedor registrado..." /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {suppliersLoading ? <SelectItem value="" disabled>Cargando...</SelectItem> : suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    {!form.supplier_id && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-px bg-slate-700" />
                          <span className="text-xs text-slate-500">o ingresa el nombre</span>
                          <div className="flex-1 h-px bg-slate-700" />
                        </div>
                        <Input
                          value={supplierFreeText}
                          onChange={e => setSupplierFreeText(e.target.value)}
                          placeholder="Nombre del proveedor (sin registrar)"
                          className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                        />
                        {supplierFreeText.trim() && (
                          <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={registerNewSupplier}
                                onChange={e => setRegisterNewSupplier(e.target.checked)}
                                className="w-4 h-4 rounded accent-rose-500"
                              />
                              <span className="text-sm text-rose-400 font-medium">¿Registrarlo como proveedor?</span>
                            </label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Expense fields */}
                {form.paymentType === 'expense' && (
                  <>
                    <div>
                      <Label className="text-slate-300">Categoría *</Label>
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Tipo de gasto" /></SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {EXPENSE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Descripción</Label>
                      <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Ej: Recibo de CFE abril" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-slate-300">Monto *</Label>
                    <Input type="number" step="0.01" min="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                  <div>
                    <Label className="text-slate-300">Fecha *</Label>
                    <Input type="date" value={form.payment_date} onChange={e => setForm(f => ({ ...f, payment_date: e.target.value }))} required className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                </div>

                <div>
                  <Label className="text-slate-300">Forma de pago *</Label>
                  <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {cashAccounts.length > 0 && (
                  <div>
                    <Label className="text-slate-300">
                      {form.paymentType === 'cobro' && form.cobro_status === 'paid' ? '¿A qué cuenta entra?' : '¿De qué cuenta sale?'}
                    </Label>
                    <Select value={form.cash_account_id || 'none'} onValueChange={v => setForm(f => ({ ...f, cash_account_id: v === 'none' ? '' : v }))}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="No registrar en cuenta" /></SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="none">No registrar en cuenta</SelectItem>
                        {cashAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.paymentType !== 'expense' && (
                  <div>
                    <Label className="text-slate-300">Referencia</Label>
                    <Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="Ej: REF-001" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                  </div>
                )}

                <div>
                  <Label className="text-slate-300">Notas</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Observaciones" className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500" />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setModalOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800">Cancelar</Button>
                  <Button
                    type="submit"
                    className={
                      form.paymentType === 'cobro' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      form.paymentType === 'supplier' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-700'
                    }
                  >
                    {{ cobro: 'Registrar Ingreso', supplier: 'Registrar Pago', expense: 'Registrar Gasto' }[form.paymentType]}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {/* Paso 2: Confirmación */}
          {confirmingSubmit && (
            <>
              <DialogHeader>
                <DialogTitle className={
                  form.paymentType === 'cobro' ? 'text-emerald-400' :
                  form.paymentType === 'supplier' ? 'text-rose-400' : 'text-orange-400'
                }>
                  {{ cobro: '¿Confirmar ingreso de cliente?', supplier: '¿Confirmar pago a proveedor?', expense: '¿Confirmar gasto operativo?' }[form.paymentType]}
                </DialogTitle>
                <DialogDescription className="text-slate-400">Verifica los datos — este registro es permanente.</DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 space-y-3 text-sm">
                {form.paymentType === 'cobro' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Cliente</span>
                      <span className="text-white font-medium">
                        {customerNameById[form.customer_id] || customerFreeText || form.customer_id}
                        {!form.customer_id && customerFreeText && registerNewCustomer && (
                          <span className="ml-2 text-xs text-emerald-400">(se registrará)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estado</span>
                      <span className="text-white">{form.cobro_status === 'paid' ? 'Pagado' : 'Pendiente'}</span>
                    </div>
                  </>
                )}
                {form.paymentType === 'supplier' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Proveedor</span>
                    <span className="text-white font-medium">
                      {supplierNameById[form.supplier_id] || supplierFreeText || form.supplier_id}
                      {!form.supplier_id && supplierFreeText && registerNewSupplier && (
                        <span className="ml-2 text-xs text-rose-400">(se registrará)</span>
                      )}
                    </span>
                  </div>
                )}
                {form.paymentType === 'expense' && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Categoría</span>
                    <span className="text-white font-medium">{EXPENSE_CATEGORIES.find(c => c.value === form.category)?.label || form.category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Monto</span>
                  <span className={`font-bold text-base ${form.paymentType === 'cobro' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ${parseFloat(form.amount || '0').toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Fecha</span>
                  <span className="text-white">{form.payment_date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Forma de pago</span>
                  <span className="text-white">{PAYMENT_METHODS.find(m => m.value === form.payment_method)?.label}</span>
                </div>
                {form.cash_account_id && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cuenta</span>
                    <span className="text-white">{cashAccounts.find(a => a.id === form.cash_account_id)?.name}</span>
                  </div>
                )}
                {form.reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Referencia</span>
                    <span className="text-white">{form.reference}</span>
                  </div>
                )}
                {form.description && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Descripción</span>
                    <span className="text-white">{form.description}</span>
                  </div>
                )}
                {form.notes && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Notas</span>
                    <span className="text-white">{form.notes}</span>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmingSubmit(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800" disabled={submitting}>
                  ← Revisar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={
                    form.paymentType === 'cobro' ? 'bg-emerald-600 hover:bg-emerald-700' :
                    form.paymentType === 'supplier' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-700'
                  }
                >
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {submitting ? 'Registrando...' : 'Sí, registrar'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal cobrar pendiente ── */}
      <Dialog open={cobroPayOpen} onOpenChange={o => { if (!o) { setCobroPayOpen(false); setCobroToPay(null) } }}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-emerald-400">Cobrar</DialogTitle>
            <DialogDescription className="text-slate-400">
              {cobroToPay && `${cobroToPay.customer_name || 'Cliente'} — ${formatMoney(cobroToPay.amount)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Método de pago</Label>
              <Select value={cobroPayForm.payment_method} onValueChange={v => setCobroPayForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {cashAccounts.length > 0 && (
              <div>
                <Label className="text-slate-300">¿A qué cuenta entra?</Label>
                <Select value={cobroPayForm.cash_account_id || 'none'} onValueChange={v => setCobroPayForm(f => ({ ...f, cash_account_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="No registrar en cuenta" /></SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="none">No registrar en cuenta</SelectItem>
                    {cashAccounts.map(acc => <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCobroPayOpen(false)} disabled={submitting} className="border-slate-600 text-slate-300 hover:bg-slate-800">Cancelar</Button>
            <Button onClick={handleMarkCobroAsPaid} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar ingreso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Modal crear anticipo ── */}
      <Dialog open={showAdvCreate} onOpenChange={open => {
        setShowAdvCreate(open)
        if (!open) {
          setAdvAmount(''); setAdvPurpose(''); setAdvNotes(''); setAdvAccountId(''); setAdvMethod('cash'); setAdvEmployeeId('')
          setAdvCustomerId(''); setAdvCustomerSearch(''); setAdvCustomerFreeText(''); setAdvCustomerPhone(''); setAdvRegisterCustomer(true)
        }
      }}>
        <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-cyan-400" />
              Registrar Anticipo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Método */}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Método de entrega *</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(ADV_METHOD) as [AdvancePaymentMethod, typeof ADV_METHOD[AdvancePaymentMethod]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAdvMethod(key)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all',
                      advMethod === key ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' : 'border-slate-600 bg-slate-700/30 text-slate-400 hover:border-slate-500'
                    )}
                  >
                    <cfg.icon className={cn('w-4 h-4', advMethod === key ? 'text-cyan-400' : cfg.color)} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuenta */}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Cuenta de origen</Label>
              {cashAccounts.length === 0 ? (
                <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  No tienes cuentas registradas. Crea una en Finanzas → Cuentas.
                </p>
              ) : (
                <select
                  value={advAccountId}
                  onChange={e => setAdvAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="">Sin especificar</option>
                  {cashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Monto entregado *</Label>
              <Input
                type="number" min={0.01} step="0.01" placeholder="0.00"
                value={advAmount} onChange={e => setAdvAmount(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Propósito / Para qué *</Label>
              <Input
                placeholder="Ej: Compra de refacciones en AutoPartes García"
                value={advPurpose} onChange={e => setAdvPurpose(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Cliente asociado */}
            <div className="space-y-1.5">
              <Label className="text-slate-300">Cliente asociado (opcional)</Label>
              <Select
                value={advCustomerId}
                onValueChange={v => { setAdvCustomerId(v); setAdvCustomerFreeText(''); setAdvCustomerPhone('') }}
              >
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Buscar cliente registrado..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <div className="p-2">
                    <Input
                      placeholder="Buscar..."
                      value={advCustomerSearch}
                      onChange={e => setAdvCustomerSearch(e.target.value)}
                      className="h-8 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  {filteredAdvCustomers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</SelectItem>
                  ))}
                  {filteredAdvCustomers.length === 0 && <p className="text-xs text-slate-400 p-2">Sin resultados</p>}
                </SelectContent>
              </Select>

              {!advCustomerId && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-slate-700" />
                    <span className="text-xs text-slate-500">o ingresa el nombre</span>
                    <div className="flex-1 h-px bg-slate-700" />
                  </div>
                  <Input
                    value={advCustomerFreeText}
                    onChange={e => setAdvCustomerFreeText(e.target.value)}
                    placeholder="Nombre del cliente (sin registrar)"
                    className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  {advCustomerFreeText.trim() && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={advRegisterCustomer}
                          onChange={e => setAdvRegisterCustomer(e.target.checked)}
                          className="w-4 h-4 rounded accent-emerald-500"
                        />
                        <span className="text-sm text-emerald-400 font-medium">¿Registrarlo como cliente?</span>
                      </label>
                      {advRegisterCustomer && (
                        <Input
                          value={advCustomerPhone}
                          onChange={e => setAdvCustomerPhone(e.target.value)}
                          placeholder="Teléfono (opcional)"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 h-8 text-sm"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300">Notas adicionales</Label>
              <Input
                placeholder="Observaciones..."
                value={advNotes} onChange={e => setAdvNotes(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" className="flex-1 text-slate-400" onClick={() => setShowAdvCreate(false)} disabled={advSubmitting}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold" onClick={handleCreateAdvance} disabled={advSubmitting}>
                {advSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar Anticipo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal detalle anticipo ── */}
      {selectedAdvance && (
        <Dialog open={!!selectedAdvance} onOpenChange={() => setSelectedAdvance(null)}>
          <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Detalle del Anticipo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="bg-slate-800/60 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Anticipo entregado</span>
                  <span className="text-white font-bold">{formatMoney(selectedAdvance.amount)}</span>
                </div>
                {selectedAdvance.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Método</span>
                    <span className={cn('text-sm font-medium flex items-center gap-1', ADV_METHOD[selectedAdvance.payment_method].color)}>
                      {(() => { const Icon = ADV_METHOD[selectedAdvance.payment_method].icon; return <Icon className="w-3.5 h-3.5" /> })()}
                      {ADV_METHOD[selectedAdvance.payment_method].label}
                    </span>
                  </div>
                )}
                {selectedAdvance.cash_account && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Cuenta</span>
                    <span className="text-white text-sm">{selectedAdvance.cash_account.name}</span>
                  </div>
                )}
                {selectedAdvance.customer && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Cliente</span>
                    <span className="text-white text-sm">{selectedAdvance.customer.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 text-sm">Total gastado</span>
                  <span className="text-white">{formatMoney(selectedAdvance.total_spent)}</span>
                </div>
                <div className="border-t border-slate-700 pt-2 flex justify-between">
                  <span className="text-slate-400 text-sm font-medium">Saldo pendiente</span>
                  <span className={cn('font-bold', selectedAdvance.balance > 0 ? 'text-amber-400' : selectedAdvance.balance < 0 ? 'text-red-400' : 'text-emerald-400')}>
                    {selectedAdvance.balance > 0 ? `${formatMoney(selectedAdvance.balance)} por devolver` :
                     selectedAdvance.balance < 0 ? `${formatMoney(Math.abs(selectedAdvance.balance))} excedido` :
                     'Cuadrado ✓'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-slate-400 text-xs mb-1">Propósito</p>
                <p className="text-white text-sm">{selectedAdvance.purpose}</p>
              </div>

              {selectedAdvance.expenses.length > 0 && (
                <div>
                  <p className="text-slate-400 text-xs mb-2">Gastos registrados</p>
                  <div className="space-y-2">
                    {selectedAdvance.expenses.map(exp => (
                      <div key={exp.id} className="flex justify-between items-center bg-slate-800/60 rounded-lg p-2.5">
                        <div>
                          <p className="text-white text-sm">{exp.description}</p>
                          <p className="text-slate-500 text-xs">{new Date(exp.expense_date).toLocaleDateString('es-MX')}</p>
                        </div>
                        <p className="text-white font-medium text-sm">{formatMoney(exp.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAdvance.status === 'open' && (
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="ghost"
                    className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => handleCloseAdvance(selectedAdvance, 'cancelled')}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    onClick={() => handleCloseAdvance(selectedAdvance, 'closed')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Cerrar anticipo
                  </Button>
                </div>
              )}
              <div className="pt-2 border-t border-slate-700/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  onClick={() => setDeleteAdvanceTarget(selectedAdvance)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Eliminar anticipo
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Confirmar eliminar movimiento ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar registro
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm">
            <p className="text-slate-300">¿Eliminar <span className="text-white font-medium">"{deleteTarget?.label}"</span>?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting} className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Cancelar
            </Button>
            <Button onClick={handleDeleteEntry} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminar anticipo ── */}
      <Dialog open={!!deleteAdvanceTarget} onOpenChange={(o) => { if (!o) setDeleteAdvanceTarget(null) }}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <Trash2 className="w-4 h-4" /> Eliminar anticipo
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-slate-700 bg-slate-800 p-3 text-sm">
            <p className="text-slate-300">¿Eliminar el anticipo <span className="text-white font-medium">"{deleteAdvanceTarget?.purpose}"</span> por <span className="text-amber-400 font-medium">{deleteAdvanceTarget ? formatMoney(deleteAdvanceTarget.amount) : ''}</span>?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAdvanceTarget(null)} disabled={deleting} className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Cancelar
            </Button>
            <Button onClick={handleDeleteAdvance} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
