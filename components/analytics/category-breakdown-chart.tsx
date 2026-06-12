'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryAgg } from '@/lib/analytics/aggregate'
import { formatIDR } from '@/lib/utils/currency'

interface CategoryBreakdownChartProps {
  data: CategoryAgg[]
  totalLabel?: string
}

export function CategoryBreakdownChart({ data, totalLabel }: CategoryBreakdownChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0)

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

      <ul className="space-y-2 text-sm max-h-56 overflow-y-auto pr-1">
        {data.map((c) => {
          const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0
          return (
            <li key={c.categoryId} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: c.color }} aria-hidden />
                <span className="truncate">{c.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
              </span>
              <span className="tabular-nums text-muted-foreground shrink-0">{formatIDR(c.amount)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
