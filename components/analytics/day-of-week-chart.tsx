'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayOfWeekAgg } from '@/lib/analytics/aggregate'
import { formatIDR } from '@/lib/utils/currency'

const DAY_LABELS: Record<number, string> = {
  1: 'Sen', 2: 'Sel', 3: 'Rab', 4: 'Kam', 5: 'Jum', 6: 'Sab', 0: 'Min',
}
const ORDER = [1, 2, 3, 4, 5, 6, 0]

function compactIDR(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

interface DayOfWeekChartProps {
  data: DayOfWeekAgg[]
  peakDay?: DayOfWeekAgg['day']
}

export function DayOfWeekChart({ data, peakDay }: DayOfWeekChartProps) {
  const map = new Map(data.map((d) => [d.day, d]))
  const chartData = ORDER.map((d) => ({
    label: DAY_LABELS[d],
    amount: map.get(d as DayOfWeekAgg['day'])?.amount ?? 0,
    day: d,
  }))

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} className="text-xs fill-muted-foreground" />
          <YAxis tickFormatter={compactIDR} tickLine={false} axisLine={false} width={48} className="text-xs fill-muted-foreground" />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
            contentStyle={{
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v) => [formatIDR(Number(v) || 0), 'Pengeluaran']}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {chartData.map((entry) => (
              <Cell
                key={entry.day}
                fill={peakDay === entry.day ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.35)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
