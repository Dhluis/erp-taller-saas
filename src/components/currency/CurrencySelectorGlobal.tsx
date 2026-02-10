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

  // 🔍 DEBUG
  console.log('💱 [Selector] Renderizado con moneda:', currency)
  console.log('💱 [Selector] setCurrency es función:', typeof setCurrency === 'function')

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <Select
        value={currency}
        onValueChange={(value) => {
          console.log('🔔 [Selector] Usuario seleccionó:', value)
          setCurrency(value as OrgCurrencyCode)
        }}
      >
        <SelectTrigger className="w-[200px] h-9 text-xs bg-gray-800 border-gray-600 text-white hover:bg-gray-700 focus:ring-2 focus:ring-cyan-500 cursor-pointer transition-colors">
          <Globe className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-800 border-gray-600 text-white z-[10000]">
          {Object.entries(SUPPORTED_CURRENCIES).map(([code, info]) => (
            <SelectItem
              key={code}
              value={code}
              className="text-xs text-gray-100 hover:bg-gray-700 focus:bg-gray-700 focus:text-white cursor-pointer"
            >
              {info.flag} {info.name} ({code})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* 🔍 DEBUG visual temporal */}
      <div className="text-[10px] text-gray-500">
        Debug: {currency} | Click: {typeof setCurrency === 'function' ? '✅' : '❌'}
      </div>
    </div>
  )
}
