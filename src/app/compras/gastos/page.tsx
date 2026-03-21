'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Receipt, Plus, Brain, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { VoiceInput } from '@/components/ui/VoiceInput'
import { cn } from '@/lib/utils'

interface Expense {
  id: string
  amount: number
  category: string
  expense_date: string
  description: string | null
  payment_method: string
  created_at: string
}

export default function GastosPage() {
  const router = useRouter()
  const { formatMoney } = useOrgCurrency()
  const [list, setList] = useState<Expense[]>([])
  const [stats, setStats] = useState<{ total: number; count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessingAI, setIsProcessingAI] = useState(false)

  const handleVoiceTranscription = async (text: string) => {
    if (!text.trim()) return
    setIsProcessingAI(true)
    toast.info('Analizando gasto con IA...')
    
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'magic-create', payload: { text, context: 'expense' } })
      })
      const data = await res.json()
      
      if (data.success && data.data?.expense) {
        const ex = data.data.expense
        toast.success('Gasto analizado. Confirma los datos.')
        const params = new URLSearchParams()
        if (ex.amount) params.set('amount', ex.amount.toString())
        if (ex.category) params.set('category', ex.category)
        if (ex.description) params.set('description', ex.description)
        if (ex.payment_method) params.set('payment_method', ex.payment_method)
        if (ex.cash_account_hint) params.set('cash_account_id', ex.cash_account_hint)
        
        router.push(`/compras/gastos/nuevo?${params.toString()}`)
      } else {
        toast.error('No se pudo extraer la información del gasto')
      }
    } catch (e) {
      toast.error('Error de conexión con la IA')
    } finally {
      setIsProcessingAI(false)
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/expenses', { credentials: 'include' })
        const json = await res.json()
        if (json.success) {
          setList(json.data || [])
          setStats(json.stats || null)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <AppLayout>
      <PageHeader
        title="Gastos"
        description="Egresos operativos (no ligados a órdenes de compra)"
        breadcrumbs={[
          { label: 'Compras', href: '/compras' },
          { label: 'Gastos', href: '/compras/gastos' }
        ]}
      />
      <div className="space-y-4 p-4">
        
        {/* Asistente de Voz AI */}
        <div className="py-2 px-4 bg-slate-900/40 rounded-lg border border-slate-800">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center gap-3 bg-[#0f172a] border border-pink-500/30 rounded-lg p-2 shadow-xl">
              <div className="p-1.5 bg-pink-500/10 rounded-lg shrink-0">
                <Brain className={cn("h-5 w-5 text-pink-500", isProcessingAI && "animate-pulse")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[9px] font-bold text-pink-400 uppercase tracking-widest">Eagles AI (Magia de Gastos)</p>
                  <span className="h-1 w-1 rounded-full bg-slate-600"></span>
                  <p className="text-[10px] text-slate-400 truncate hidden sm:block">"Compré 3 pizzas para el equipo por 300 pesos..."</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isProcessingAI ? (
                  <Loader2 className="h-5 w-5 text-pink-500 animate-spin" />
                ) : (
                  <VoiceInput
                    onTranscript={handleVoiceTranscription}
                    className="h-9 w-9 bg-pink-600 hover:bg-pink-500 text-white shadow-lg shadow-pink-500/20 rounded-full"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-rose-500/10 border-rose-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-rose-400">Total gastos</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-rose-400">{formatMoney(stats.total)}</span>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-400">Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold text-blue-400">{stats.count}</span>
              </CardContent>
            </Card>
          </div>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Listado de gastos</CardTitle>
            <Link href="/compras/gastos/nuevo" className="inline-flex items-center gap-2 h-10 px-4 text-sm bg-primary text-white hover:opacity-90 rounded-md font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              Nuevo gasto
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Cargando...</p>
            ) : list.length === 0 ? (
              <p className="text-muted-foreground">No hay gastos registrados.</p>
            ) : (
              <div className="space-y-2">
                {list.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{e.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {e.description || 'Sin descripción'} · {new Date(e.expense_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatMoney(e.amount)}</span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/compras/gastos/${e.id}`}>Ver</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
