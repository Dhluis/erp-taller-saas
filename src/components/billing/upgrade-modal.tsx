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
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[400px] p-4 sm:p-5 bg-slate-900 border-slate-700">
        <DialogHeader className="space-y-1">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500">
            <Crown className="h-5 w-5 text-white" />
          </div>
          <DialogTitle className="text-center text-xl text-white">
            Actualiza a Premium
          </DialogTitle>
          <DialogDescription className="text-center text-slate-400 text-xs sm:text-sm">
            {limitError?.message || `Has alcanzado el límite de ${displayFeatureName} en el plan Free.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Información del límite actual */}
          {limitError && (
            <div className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-400">Uso actual:</span>
                <span className="font-semibold text-white">
                  {limitError.current} / {limitError.limit}
                </span>
              </div>
            </div>
          )}

          {/* Plan Premium */}
          <div className="rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-4 text-white">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-yellow-400" />
                Plan Premium
              </h3>
              <div className="text-right">
                <div className="text-xl font-bold text-yellow-400">$170 USD</div>
                <div className="text-xs text-slate-300">/mes</div>
              </div>
            </div>

            <ul className="space-y-1.5 text-sm">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Clientes ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Órdenes de trabajo ilimitadas</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Productos en inventario ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Usuarios ilimitados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">WhatsApp Business con API oficial de Twilio</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">IA Conversacional</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Reportes avanzados</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-slate-200">Soporte prioritario</span>
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            Ahora no
          </Button>
          <Button 
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white shadow-sm transition-transform duration-200 hover:scale-105"
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
