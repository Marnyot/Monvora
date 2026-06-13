import { BudgetListClient } from '@/components/budgets/budget-list-client'

export const metadata = {
  title: 'Budget — Monvora',
}

export default function BudgetsPage() {
  return (
    <div className="max-w-lg lg:max-w-2xl mx-auto px-4 py-6">
      <BudgetListClient />
    </div>
  )
}
