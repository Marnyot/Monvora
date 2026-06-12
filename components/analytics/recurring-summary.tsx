import { RotateCw } from 'lucide-react'
import type { RecurringSummary as RecurringSummaryShape } from '@/lib/analytics/aggregate'
import { formatIDR } from '@/lib/utils/currency'
import { formatDateShort } from '@/lib/utils/date'

interface RecurringSummaryProps {
  data: RecurringSummaryShape
}

export function RecurringSummary({ data }: RecurringSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-muted/40 px-3 py-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Estimasi total per bulan</span>
        <span className="text-sm font-semibold tabular-nums">{formatIDR(data.totalMonthly)}</span>
      </div>
      <ul className="divide-y divide-border">
        {data.items.map((item) => (
          <li key={item.groupId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className="flex items-center gap-2 min-w-0">
              <span className="rounded-full bg-primary/10 p-1.5 text-primary shrink-0">
                <RotateCw className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{item.merchantName}</span>
                <span className="block text-xs text-muted-foreground">
                  Terakhir {formatDateShort(item.lastChargedAt)}
                </span>
              </span>
            </span>
            <span className="text-sm font-medium tabular-nums">{formatIDR(item.monthlyEstimate)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
