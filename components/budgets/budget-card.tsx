'use client'

import { MoreVertical, AlertTriangle, AlertCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BudgetWithUtilization } from '@/lib/hooks/use-budgets'
import { formatIDR } from '@/lib/utils/currency'

const PERIOD_LABELS: Record<string, string> = {
  weekly: 'Mingguan',
  monthly: 'Bulanan',
  yearly: 'Tahunan',
}

interface BudgetCardProps {
  budget: BudgetWithUtilization
  onEdit: () => void
  onDelete: () => void
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const { utilization } = budget
  const clampedPercent = Math.min(utilization.percent, 100)
  const status = utilization.status

  const barColor =
    status === 'over'
      ? 'bg-red-500'
      : status === 'warn'
      ? 'bg-amber-500'
      : 'bg-emerald-500'

  return (
    <article className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 space-y-3 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2">
            {budget.category && (
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ background: budget.category.color }}
                aria-hidden
              />
            )}
            <h3 className="text-sm font-semibold truncate">{budget.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            {budget.category ? budget.category.name : 'Semua pengeluaran'}
            <span className="mx-1">•</span>
            {PERIOD_LABELS[budget.period]}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted"
              aria-label="Opsi"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Ubah</DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-sm tabular-nums font-medium">
            {formatIDR(utilization.spent)}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            dari {formatIDR(budget.amount)}
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full ${barColor} transition-[width]`}
            style={{ width: `${clampedPercent}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={clampedPercent}
          />
        </div>
        <div className="flex items-center justify-between gap-2 mt-1.5 text-xs">
          <span className="tabular-nums text-muted-foreground">{utilization.percent}% terpakai</span>
          {status === 'ok' && (
            <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
              Sisa {formatIDR(utilization.remaining)}
            </span>
          )}
          {status === 'warn' && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              <span>Hampir habis</span>
            </span>
          )}
          {status === 'over' && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400 tabular-nums">
              <AlertCircle className="h-3 w-3" />
              <span>Lebih {formatIDR(Math.abs(utilization.remaining))}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
