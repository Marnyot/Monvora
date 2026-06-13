'use client'

import { MoreVertical, Target } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BudgetWithUtilization } from '@/lib/hooks/use-budgets'
import { formatIDR } from '@/lib/utils/currency'
import { CategoryIconBubble } from '@/components/shared/category-icon'
import { cn } from '@/lib/utils'

interface BudgetCardProps {
  budget: BudgetWithUtilization
  onEdit: () => void
  onDelete: () => void
}

export function BudgetCard({ budget, onEdit, onDelete }: BudgetCardProps) {
  const { utilization } = budget
  const clampedPercent = Math.min(utilization.percent, 100)

  // Tier color by % terpakai — matches the visual cue di referensi:
  // <70% = aman (emerald), 70-89% = waspada (amber), 90%+ = bahaya (red)
  const tier: 'ok' | 'warn' | 'danger' =
    utilization.percent >= 90 ? 'danger' : utilization.percent >= 70 ? 'warn' : 'ok'

  const accentText = {
    ok: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  }[tier]

  const barColor = {
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    danger: 'bg-red-500',
  }[tier]

  const remainingLabel = utilization.remaining >= 0
    ? formatIDR(utilization.remaining)
    : `-${formatIDR(Math.abs(utilization.remaining))}`

  return (
    <article className="rounded-2xl bg-card p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-border/50">
      <div className="flex items-start gap-3">
        {budget.category ? (
          <CategoryIconBubble
            icon={budget.category.icon}
            color={budget.category.color}
            size={18}
            bubbleSize={40}
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
            <Target className="h-4 w-4 text-muted-foreground" />
          </span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{budget.name}</h3>
              <p className="text-xs text-muted-foreground tabular-nums">
                {formatIDR(budget.amount)}
              </p>
            </div>
            <div className="flex items-start gap-1 shrink-0">
              <span className={cn('text-base font-bold tabular-nums whitespace-nowrap', accentText)}>
                {remainingLabel}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-1 rounded-md text-muted-foreground hover:bg-muted -mr-1"
                    aria-label="Opsi"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit}>Ubah</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Terpakai: <span className="tabular-nums">{formatIDR(utilization.spent)}</span>
          </span>
          <span className={cn('font-medium tabular-nums', accentText)}>
            {utilization.percent}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full transition-[width]', barColor)}
            style={{ width: `${clampedPercent}%` }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={clampedPercent}
          />
        </div>
      </div>
    </article>
  )
}
