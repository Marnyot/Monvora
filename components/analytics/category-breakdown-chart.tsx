'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryAgg } from '@/lib/analytics/aggregate'
import { formatIDR } from '@/lib/utils/currency'
import { CategoryIconBubble } from '@/components/shared/category-icon'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

interface CategoryBreakdownChartProps {
  data: CategoryAgg[]
  totalLabel?: string
  selectedId?: string | null
  onSelect?: (cat: CategoryAgg) => void
}

export function CategoryBreakdownChart({ data, totalLabel, selectedId, onSelect }: CategoryBreakdownChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)
  const interactive = !!onSelect

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-6 sm:gap-4 items-center">
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="amount" nameKey="name" innerRadius={56} outerRadius={84} paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.categoryId} fill={entry.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v) => [formatIDR(Number(v) || 0), 'Total']}
            />
          </PieChart>
        </ResponsiveContainer>
        {totalLabel && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</span>
            <span className="text-sm font-semibold tabular-nums">{totalLabel}</span>
          </div>
        )}
      </div>

      <ul className="space-y-1 text-sm max-h-56 overflow-y-auto pr-1">
        {data.map((c) => {
          const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0
          const isSelected = selectedId === c.categoryId

          const content = (
            <>
              <span className="flex items-center gap-2 min-w-0">
                <CategoryIconBubble icon={c.icon} color={c.color} size={14} bubbleSize={28} />
                <span className="truncate font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
              </span>
              <span className="flex items-center gap-1 shrink-0">
                <span className="tabular-nums text-muted-foreground">{formatIDR(c.amount)}</span>
                {interactive && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />}
              </span>
            </>
          )

          return (
            <li key={c.categoryId}>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => onSelect!(c)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors',
                    'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected && 'bg-accent'
                  )}
                  aria-label={`Lihat detail ${c.name}`}
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 px-2 py-1.5">
                  {content}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
