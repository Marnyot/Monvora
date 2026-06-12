import { BudgetListClient } from '@/components/budgets/budget-list-client'

export const metadata = {
  title: 'Budget — Monvora',
}

export default function BudgetsPage() {
  return (
    <div className="space-y-4 pb-20 md:pb-6">
      <header>
        <h1 className="text-xl font-bold">Budget</h1>
        <p className="text-sm text-muted-foreground">
          Tetapkan batas pengeluaran, biar lebih sadar ke mana uangmu pergi.
        </p>
      </header>

      <BudgetListClient />
    </div>
  )
}
