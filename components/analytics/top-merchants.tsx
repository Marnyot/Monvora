import type { MerchantAgg } from '@/lib/analytics/aggregate'
import { formatIDR } from '@/lib/utils/currency'

interface TopMerchantsProps {
  data: MerchantAgg[]
}

export function TopMerchants({ data }: TopMerchantsProps) {
  return (
    <ol className="divide-y divide-border">
      {data.map((m, idx) => (
        <li key={m.merchantName + idx} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex items-center gap-3 min-w-0">
            <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-semibold flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{m.merchantName}</span>
              <span className="block text-xs text-muted-foreground">
                {m.count}× transaksi
              </span>
            </span>
          </span>
          <span className="tabular-nums text-sm font-medium">{formatIDR(m.amount)}</span>
        </li>
      ))}
    </ol>
  )
}
