'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { TrendPoint } from '@/lib/analytics/aggregate'
import { formatIDR } from '@/lib/utils/currency'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function monthLabel(key: string): string {
  const [, m] = key.split('-').map(Number)
  return MONTH_LABELS[m - 1] ?? key
}

function compactIDR(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return String(value)
}

interface SpendingTrendChartProps {
  data: TrendPoint[]
}

export function SpendingTrendChart({ data }: SpendingTrendChartProps) {
  const chartData = useMemo(
    () => data.map((p) => ({ label: monthLabel(p.month), income: p.income, expense: p.expense })),
    [data]
  )

  return (
    <div className="h-64 w-full">
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
            formatter={(v, name) => [formatIDR(Number(v) || 0), name === 'income' ? 'Pemasukan' : 'Pengeluaran']}
          />
          <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
