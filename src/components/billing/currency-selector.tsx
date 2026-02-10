'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LATAM_CURRENCIES, type CurrencyCode } from '@/lib/utils/currency-converter'

interface CurrencySelectorProps {
  value: CurrencyCode
  onChange: (currency: CurrencyCode) => void
}

export function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CurrencyCode)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LATAM_CURRENCIES).map(([code, info]) => (
          <SelectItem key={code} value={code}>
            {info.flag} {info.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
