'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { CRMLead, LeadStatus } from './types'

interface CreateLeadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editLead?: CRMLead | null
  onSuccess?: (lead: CRMLead) => void
}

const INITIAL_FORM = {
  name: '',
  company: '',
  phone: '',
  email: '',
  source: '',
  status: 'new' as LeadStatus,
  estimated_value: '',
  notes: '',
}

export function CreateLeadDialog({ open, onOpenChange, editLead, onSuccess }: CreateLeadDialogProps) {
  const [form, setForm] = useState(() =>
    editLead
      ? {
          name: editLead.name,
          company: editLead.company || '',
          phone: editLead.phone,
          email: editLead.email || '',
          source: editLead.lead_source || '',
          status: editLead.status,
          estimated_value: editLead.estimated_value?.toString() || '',
          notes: editLead.notes || '',
        }
      : INITIAL_FORM
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'El nombre es requerido'
    if (form.phone && form.phone.length < 7) e.phone = 'Teléfono demasiado corto'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    try {
      const url = editLead ? `/api/leads/${editLead.id}` : '/api/leads'
      const method = editLead ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          company: form.company.trim() || undefined,
          status: form.status,
          estimated_value: form.estimated_value ? parseFloat(form.estimated_value) : undefined,
          notes: form.notes.trim() || undefined,
          lead_source: form.source || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      toast.success(editLead ? 'Lead actualizado' : 'Lead creado')
      onSuccess?.(data.data)
      onOpenChange(false)
      setForm(INITIAL_FORM)
      setErrors({})
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar lead')
    } finally {
      setSaving(false)
    }
  }

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setForm(INITIAL_FORM); setErrors({}) } }}>
      <DialogContent className="max-w-2xl bg-slate-800 border-cyan-500/50 border-2 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{editLead ? 'Editar Lead' : 'Nuevo Lead'}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {editLead ? 'Edita la información del lead' : 'Agrega un nuevo lead al pipeline CRM'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Nombre *</Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={`bg-slate-900 text-white border-slate-600 mt-1 ${errors.name ? 'border-red-500' : ''}`}
                placeholder="Juan García"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label className="text-slate-300">Empresa</Label>
              <Input
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                className="bg-slate-900 text-white border-slate-600 mt-1"
                placeholder="Mi empresa S.A."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Teléfono</Label>
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className={`bg-slate-900 text-white border-slate-600 mt-1 ${errors.phone ? 'border-red-500' : ''}`}
                placeholder="+52 55 1234 5678"
              />
              {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <Label className="text-slate-300">Email</Label>
              <Input
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={`bg-slate-900 text-white border-slate-600 mt-1 ${errors.email ? 'border-red-500' : ''}`}
                placeholder="juan@email.com"
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-300">Estado</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                  <SelectItem value="new">Nuevo</SelectItem>
                  <SelectItem value="contacted">Contactado</SelectItem>
                  <SelectItem value="qualified">Calificado</SelectItem>
                  <SelectItem value="proposal">Propuesta</SelectItem>
                  <SelectItem value="negotiation">Negociación</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                  {editLead && <SelectItem value="won">Ganado</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300">Valor estimado</Label>
              <Input
                type="number"
                value={form.estimated_value}
                onChange={(e) => set('estimated_value', e.target.value)}
                className="bg-slate-900 text-white border-slate-600 mt-1"
                placeholder="0"
              />
            </div>
            <div>
              <Label className="text-slate-300">Origen</Label>
              <Select value={form.source || '_none'} onValueChange={(v) => set('source', v === '_none' ? '' : v)}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white mt-1">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600 text-white">
                  <SelectItem value="_none">Sin especificar</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                  <SelectItem value="phone">Teléfono</SelectItem>
                  <SelectItem value="referral">Referido</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-slate-300">Notas</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="bg-slate-900 text-white border-slate-600 mt-1 min-h-[80px] resize-none"
              placeholder="Notas sobre este lead..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? 'Guardando...' : editLead ? 'Guardar cambios' : 'Crear Lead'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
