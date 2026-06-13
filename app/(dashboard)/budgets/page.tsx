import { BudgetListClient } from '@/components/budgets/budget-list-client'

export const metadata = {
  title: 'Budget — Monvora',
}

export default function BudgetsPage() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6 space-y-4">
      <header>
        <h1 className="text-xl font-bold text-foreground">Budget</h1>
        <p className="text-sm text-muted-foreground">
          Tetapkan batas pengeluaran, biar lebih sadar ke mana uangmu pergi.
        </p>
      </header>

      <BudgetListClient />
    </div>
  )
}
