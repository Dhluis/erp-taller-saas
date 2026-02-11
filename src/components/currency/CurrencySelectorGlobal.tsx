'use client'

import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { SUPPORTED_CURRENCIES, type OrgCurrencyCode, useOrgCurrency } from '@/lib/context/CurrencyContext'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Selector global de divisa para la organización.
 * Persiste en company_settings.currency y se propaga a toda la app.
 */
export function CurrencySelectorGlobal({ className }: { className?: string }) {
  const { currency, currencyInfo, setCurrency } = useOrgCurrency()

  return (
    <div className={cn('flex flex-col items-end', className)}>
      <Select
        value={currency}
        onValueChange={(value) => setCurrency(value as OrgCurrencyCode)}
      >
        <SelectTrigger className="h-9 min-w-[200px] text-xs bg-gray-800 border-gray-600 text-white hover:bg-gray-700 focus:ring-2 focus:ring-cyan-500 cursor-pointer gap-2 pl-3 pr-3">
          <Globe className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="shrink-0 text-base leading-none" aria-hidden>{currencyInfo.flag}</span>
          <span className="truncate">{currencyInfo.name} ({currency})</span>
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600 text-white z-[10000]">
          {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
            <SelectItem
              key={code}
              value={code}
              className="text-xs text-gray-100 hover:bg-gray-700 focus:bg-gray-700 focus:text-white cursor-pointer"
            >
              <span className="mr-2">{info.flag}</span>
              {info.name} ({code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
