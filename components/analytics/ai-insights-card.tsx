'use client'

import { Sparkles } from 'lucide-react'
import { useInsights } from '@/lib/hooks/use-insights'
import { formatDate } from '@/lib/utils/date'

export function AiInsightsCard() {
  const { data, isLoading, isError } = useInsights()

  if (isLoading) {
    return (
      <section className="rounded-xl border bg-gradient-to-br from-primary/5 to-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="rounded-lg bg-primary/10 p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <h2 className="text-sm font-semibold">Wawasan AI</h2>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
          <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
        </div>
      </section>
    )
  }

  if (isError || !data || data.insights.length === 0) {
    return (
      <section className="rounded-xl border bg-gradient-to-br from-primary/5 to-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-lg bg-primary/10 p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <h2 className="text-sm font-semibold">Wawasan AI</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Wawasan harian dibuat tiap pagi (07:00 WIB) setelah ada cukup data transaksi.
          Cek lagi besok.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border bg-gradient-to-br from-primary/5 to-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-primary/10 p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
          <h2 className="text-sm font-semibold">Wawasan AI</h2>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {formatDate(data.generatedAt)}
        </span>
      </div>
      <ul className="space-y-2">
        {data.insights.map((insight, idx) => (
          <li key={idx} className="flex gap-2 text-sm leading-relaxed text-foreground">
            <span aria-hidden className="text-primary mt-0.5">•</span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
