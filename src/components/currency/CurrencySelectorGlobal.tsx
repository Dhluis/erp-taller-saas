'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SUPPORTED_CURRENCIES, type OrgCurrencyCode, useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Selector global de divisa para la organización.
 * Persiste en company_settings.currency y se propaga a toda la app.
 */
export function CurrencySelectorGlobal({ className }: { className?: string }) {
  const { currency, setCurrency } = useOrgCurrency()

  return (
    <div className={cn('flex items-center', className)}>
      <Select
        value={currency}
        onValueChange={(v) => setCurrency(v as OrgCurrencyCode)}
      >
        <SelectTrigger className="w-[200px] h-9 text-xs bg-gray-800 border-gray-600 text-white hover:bg-gray-700 transition-colors">
          <Globe className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600 text-white z-[10000]">
          {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
            <SelectItem
              key={code}
              value={code}
              className="text-xs text-gray-100 focus:bg-gray-700 focus:text-white cursor-pointer"
            >
              {info.flag} {info.name} ({code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
