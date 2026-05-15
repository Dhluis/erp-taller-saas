'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AlertTriangle, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmDeleteDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  /** Título del modal, ej: "Eliminar Cliente" */
  title?: string
  /** Nombre del elemento a eliminar, ej: "Pablo Perez" */
  entityName?: string
  /** Lista de consecuencias, ej: ["Historial de órdenes", "Vehículos asociados"] */
  items?: string[]
  /** Texto del botón de confirmación, ej: "Eliminar Cliente" */
  confirmText?: string
  /** Texto que aparece en la pregunta de confirmación */
  question?: string
  /** Variante de color del botón confirmación */
  variant?: 'danger' | 'warning'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar eliminación',
  entityName,
  items = [],
  confirmText = 'Eliminar',
  question,
  variant = 'danger',
}: ConfirmDeleteDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
    }
  }

  const defaultQuestion = entityName
    ? `¿Estás seguro que deseas eliminar a `
    : '¿Estás seguro que deseas continuar?'

  const btnClass = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-400 text-white'
    : 'bg-amber-500 hover:bg-amber-400 text-black'

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !loading) onClose() }}>
      <DialogContent className="max-w-md p-0 gap-0 bg-[#1a1d27] border border-slate-700/60 shadow-2xl rounded-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-slate-700/50">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mt-0.5">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold text-white leading-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-400 mt-0.5">
              Esta acción no se puede deshacer
            </DialogDescription>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Pregunta */}
          <div className="rounded-xl border border-red-500/25 bg-red-500/8 px-4 py-3">
            <p className="text-sm text-slate-200 leading-relaxed">
              {question ?? (
                entityName ? (
                  <>{defaultQuestion}<strong className="text-white">{entityName}</strong>?</>
                ) : defaultQuestion
              )}
            </p>
          </div>

          {/* Lista de consecuencias */}
          {items.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Se eliminará:</p>
              <ul className="space-y-1">
                {items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="h-11 px-5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'h-11 px-5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60',
              btnClass
            )}
          >
            {loading ? 'Eliminando...' : confirmText}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Hook imperativo ──────────────────────────────────────────────────────────

interface ConfirmOptions extends Omit<ConfirmDeleteDialogProps, 'open' | 'onClose' | 'onConfirm'> {}

/**
 * Hook que devuelve `confirm(options)` → Promise<boolean>
 * y el `<ConfirmDialog />` que hay que renderizar en el JSX.
 *
 * Uso:
 *   const { confirm, ConfirmDialog } = useConfirmDelete()
 *   ...
 *   const ok = await confirm({ title: 'Eliminar Cliente', entityName: name, items: [...] })
 *   if (ok) doDelete()
 *   ...
 *   return <> ... <ConfirmDialog /> </>
 */
export function useConfirmDelete() {
  const [state, setState] = useState<{
    open: boolean
    options: ConfirmOptions
    resolve: (v: boolean) => void
  } | null>(null)

  const confirm = (options: ConfirmOptions): Promise<boolean> =>
    new Promise(resolve => {
      setState({ open: true, options, resolve })
    })

  const handleClose = () => {
    state?.resolve(false)
    setState(null)
  }

  const handleConfirm = () => {
    state?.resolve(true)
    setState(null)
  }

  const ConfirmDialog = () =>
    state ? (
      <ConfirmDeleteDialog
        open={state.open}
        onClose={handleClose}
        onConfirm={handleConfirm}
        {...state.options}
      />
    ) : null

  return { confirm, ConfirmDialog }
}
