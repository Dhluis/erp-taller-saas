'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Crown, Check } from 'lucide-react'
import { FEATURE_NAMES } from '@/types/billing'
import type { LimitError } from '@/types/billing'
import { useRouter } from 'next/navigation'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  limitError?: LimitError
  featureName?: string
}

export function UpgradeModal({ isOpen, onClose, limitError, featureName }: UpgradeModalProps) {
  const router = useRouter()
  
  // Obtener nombre legible de la feature
  const getFeatureDisplayName = () => {
    if (featureName) return featureName
    
    if (limitError?.feature) {
      // Mapear feature_key a nombre legible
      const featureMap: Record<string, string> = {
        max_customers: 'Clientes',
        max_orders_per_month: 'Órdenes mensuales',
        max_inventory_items: 'Productos en inventario',
        max_users: 'Usuarios',
        whatsapp_enabled: 'WhatsApp Business',
        ai_enabled: 'IA Conversacional',
        advanced_reports: 'Reportes Avanzados'
      }
      return featureMap[limitError.feature] || 'este recurso'
    }
    
    return 'este recurso'
  }

  const displayFeatureName = getFeatureDisplayName()

  const handleUpgrade = () => {
    onClose()
    router.push(limitError?.upgrade_url || '/settings/billing')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl text-white">
            Actualiza a Premium
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400">
            {limitError?.message || `Has alcanzado el límite de ${displayFeatureName} en el plan Free.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Información del límite actual */}
          {limitError && (
            <div className="rounded-lg bg-slate-800 border border-slate-700 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Uso actual:</span>
                <span className="font-semibold text-white">
                  {limitError.current} / {limitError.limit}
                </span>
              </div>
            </div>
          )}

          {/* Plan Premium */}
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                Plan Premium
              </h3>
              <div className="text-right">
                <div className="text-3xl font-bold text-yellow-400">$2,900</div>
                <div className="text-sm text-slate-300">MXN/mes</div>
              </div>
            </div>

            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Clientes ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Órdenes de trabajo ilimitadas</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Productos en inventario ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Usuarios ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">WhatsApp Business con API oficial de Twilio</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">IA Conversacional</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Reportes avanzados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Soporte prioritario</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Ahora no
          </Button>
          <Button 
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
            onClick={handleUpgrade}
          >
            <Crown className="mr-2 h-4 w-4" />
            Actualizar ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
